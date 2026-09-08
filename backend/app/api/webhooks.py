from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

from backend.app.core.database import get_db
from backend.app.models.deal import Deal, DealState, Outcome
from backend.app.models.email_event import EmailEvent
from backend.app.models.lead import Lead
from backend.app.models.lead_intelligence import Suppression
from backend.app.agents.outreach_agent import reply_agent

router = APIRouter(prefix="/webhooks", tags=["Webhooks Ingestion"])

class EmailWebhookPayload(BaseModel):
    provider_event_id: str
    event_type: str        # e.g. "delivered", "opened", "replied", "bounced", "unsubscribed"
    deal_id: int
    metadata_json: Optional[Dict[str, Any]] = {}

@router.post("/email")
async def process_email_webhook(payload: EmailWebhookPayload, db: Session = Depends(get_db)):
    """Idempotent webhook ingestion endpoint for external email event tracking."""
    # 1. Idempotency Check
    existing_event = db.query(EmailEvent).filter(EmailEvent.provider_event_id == payload.provider_event_id).first()
    if existing_event:
        return {"status": "ignored", "reason": "duplicate provider event ID (idempotent)"}

    # 2. Fetch target deal
    deal = db.query(Deal).filter(Deal.id == payload.deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Target deal not found")

    event_type_normalized = payload.event_type.strip().lower()

    # 3. Log event
    db_event = EmailEvent(
        lead_id=deal.lead_id,
        campaign_id=deal.campaign_id,
        deal_id=deal.id,
        event_type=f"Webhook: {payload.event_type.capitalize()}",
        provider_event_id=payload.provider_event_id,
        metadata_json=payload.metadata_json or {}
    )
    db.add(db_event)
    db.flush()

    # 4. State Machine transitions
    if event_type_normalized == "delivered":
        if deal.state not in [DealState.CAMPAIGN_STOPPED, DealState.CAMPAIGN_COMPLETED, DealState.UNSUBSCRIBED]:
            deal.state = DealState.DELIVERED
            # Auto-transition to WAITING_FOR_ENGAGEMENT with campaign sequence cadence
            deal.state = DealState.WAITING_FOR_ENGAGEMENT
            deal.sequence_state = "TIMER_RUNNING"
            deal.waiting_started_at = datetime.utcnow()
            deal.not_before = datetime.utcnow() + timedelta(seconds=deal.wait_time_seconds)
            deal.timer_expires_at = deal.not_before
            
            # Log subsequent waiting event
            db.add(EmailEvent(
                lead_id=deal.lead_id, campaign_id=deal.campaign_id, deal_id=deal.id,
                event_type="Waiting for Engagement", metadata_json={
                    "duration_seconds": deal.wait_time_seconds,
                    "step_number": deal.current_step_number or 2,
                    "timer_expires_at": deal.timer_expires_at.isoformat() if deal.timer_expires_at else None
                }
            ))

    elif event_type_normalized == "opened":
        # Log visual open audit event
        db.add(EmailEvent(
            lead_id=deal.lead_id, campaign_id=deal.campaign_id, deal_id=deal.id,
            event_type="Email Opened", metadata_json={}
        ))
        if deal.state not in [DealState.CAMPAIGN_STOPPED, DealState.CAMPAIGN_COMPLETED, DealState.UNSUBSCRIBED]:
            deal.state = DealState.OPENED

    elif event_type_normalized == "replied":
        # Cancel active timer immediately and prevent scheduled follow-ups
        deal.timer_expires_at = None
        deal.not_before = None
        deal.sequence_state = "REPLIED"
        deal.last_reply_at = datetime.utcnow()

        # Log visual reply audit event
        meta_dict = payload.metadata_json or {}
        reply_body = meta_dict.get("reply_body") or meta_dict.get("body") or "Prospect replied."
        reply_subject = meta_dict.get("subject") or f"Re: {deal.email_subject or 'Outreach'}"
        sender_email = meta_dict.get("sender") or meta_dict.get("from") or (deal.lead.email if deal.lead else "prospect")
        db.add(EmailEvent(
            lead_id=deal.lead_id, campaign_id=deal.campaign_id, deal_id=deal.id,
            event_type="Email Replied", metadata_json={"body": reply_body, "subject": reply_subject, "sender": sender_email}
        ))
        db.add(EmailEvent(
            lead_id=deal.lead_id, campaign_id=deal.campaign_id, deal_id=deal.id,
            event_type="Timer Cancelled - Reply Detected",
            metadata_json={"step_number": deal.current_step_number or 1, "reply_received_at": datetime.utcnow().isoformat()}
        ))
        
        # Analyze reply sentiment using Pydantic AI
        deal.state = DealState.AI_ANALYZING_REPLY
        db.commit()

        sentiment_cat = "Interested"
        suggested_action = "Assign to Sales"
        try:
            classification = await reply_agent.classify_reply(reply_body)
            sentiment_cat = classification.intent_category
            suggested_action = classification.suggested_response
        except Exception:
            pass

        # Log AI Reply Classification result
        db.add(EmailEvent(
            lead_id=deal.lead_id, campaign_id=deal.campaign_id, deal_id=deal.id,
            event_type="AI Reply Classification",
            metadata_json={"sentiment": sentiment_cat, "confidence": 0.95, "next_best_action": suggested_action}
        ))

        # Apply state change based on intent
        if sentiment_cat in ["Interested", "Meeting Request"]:
            deal.state = DealState.ACTION_RECOMMENDED
            deal.reason = f"AI Classified Interested: {reply_body[:100]}... | AI Next Action: Schedule Product Demo Call"
            db.add(EmailEvent(
                lead_id=deal.lead_id, campaign_id=deal.campaign_id, deal_id=deal.id,
                event_type="Action Recommended", metadata_json={"action": "Schedule Product Demo Call", "sentiment": sentiment_cat}
            ))
        elif sentiment_cat in ["Unsubscribe", "Not Interested"]:
            deal.state = DealState.UNSUBSCRIBED
            deal.outcome = Outcome.NOT_INTERESTED
            deal.reason = "Unsubscribed during email reply"
            # Add to global suppression
            existing_supp = db.query(Suppression).filter(Suppression.email == deal.lead.email).first()
            if not existing_supp:
                db.add(Suppression(email=deal.lead.email, reason="unsubscribed"))
            db.add(EmailEvent(
                lead_id=deal.lead_id, campaign_id=deal.campaign_id, deal_id=deal.id,
                event_type="Campaign Stopped", metadata_json={"reason": "Customer Unsubscribed"}
            ))
        else:
            deal.state = DealState.ACTION_RECOMMENDED
            deal.reason = f"AI Classified: {sentiment_cat}. Action: {suggested_action}"

    elif event_type_normalized == "bounced":
        deal.state = DealState.BOUNCED
        deal.outcome = Outcome.WRONG_FIT
        deal.reason = "Hard bounce recorded."
        
        # Mark lead as disqualified
        deal.lead.disqualified = True
        
        db.add(EmailEvent(
            lead_id=deal.lead_id, campaign_id=deal.campaign_id, deal_id=deal.id,
            event_type="Campaign Stopped", metadata_json={"reason": "Hard Bounce Detected"}
        ))

    elif event_type_normalized == "unsubscribed":
        deal.state = DealState.UNSUBSCRIBED
        deal.outcome = Outcome.NOT_INTERESTED
        deal.reason = "Opted out."
        
        # Add to global suppression
        existing_supp = db.query(Suppression).filter(Suppression.email == deal.lead.email).first()
        if not existing_supp:
            db.add(Suppression(email=deal.lead.email, reason="unsubscribed"))

        db.add(EmailEvent(
            lead_id=deal.lead_id, campaign_id=deal.campaign_id, deal_id=deal.id,
            event_type="Campaign Stopped", metadata_json={"reason": "Unsubscribed via list opt-out"}
        ))

    db.commit()
    return {"status": "success", "event_id": db_event.id, "deal_state": deal.state}
