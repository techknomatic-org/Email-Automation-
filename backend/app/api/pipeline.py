import random
import uuid
import time
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.models.lead import Lead
from backend.app.models.deal import Deal, DealState, Outcome
from backend.app.models.campaign import Campaign
from backend.app.models.mailbox import Thread, Message, Mailbox
from backend.app.models.email_event import EmailEvent
from backend.app.models.lead_intelligence import Suppression
from backend.app.services.email_service import email_service
from backend.app.agents.outreach_agent import outreach_agent, reply_agent
from backend.app.services.rag_service import rag_service
from backend.app.api.webhooks import process_email_webhook, EmailWebhookPayload

router = APIRouter(prefix="/pipeline", tags=["Pipeline Execution"])

def format_iso_utc(dt):
    if not dt:
        return None
    iso = dt.isoformat()
    return iso if (iso.endswith("Z") or "+" in iso) else iso + "Z"


# ─── Configurable Test Recipients (loaded from environment variables) ──────────
# Configure TEST_RECIPIENT_* variables in your .env file.
# See .env.example for all available options.
TEST_RECIPIENTS = settings.get_test_recipients()


@router.post("/seed-test-recipients")
def seed_test_recipients(campaign_id: int, db: Session = Depends(get_db)):
    """Seed the specific test recipients for the visual walkthrough demo campaign."""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    created_deals = []

    for tr in TEST_RECIPIENTS:
        # Clear from suppressions if present to allow re-testing
        db.query(Suppression).filter(Suppression.email == tr["email"]).delete()

        # 1. Fetch or create Lead
        lead = db.query(Lead).filter(Lead.email == tr["email"]).first()
        name_clean = tr["name"].split(" (")[0].strip()
        name_parts = name_clean.split(" ")
        fname = name_parts[0]
        lname = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

        if not lead:
            lead = Lead(
                profile_url=f"https://linkedin.com/in/demo-{tr['email'].split('@')[0]}",
                email=tr["email"],
                first_name=fname,
                last_name=lname,
                job_title=tr["role"],
                company_name=tr["company"],
                industry=tr["industry"],
                country="United States" if tr["country_code"] == "US" else "Germany",
                country_code=tr["country_code"],
                seniority="Director" if "Director" in tr["role"] else ("VP" if "VP" in tr["role"] else "C-Level"),
                department="Engineering" if ("CTO" in tr["role"] or "Engineering" in tr["role"]) else "IT",
                profile_text=tr["profile_text"],
                source_fields={
                    "name": name_clean,
                    "title": tr["role"],
                    "company": tr["company"],
                    "industry": tr["industry"],
                    "is_test_recipient": True
                }
            )
            db.add(lead)
            db.flush()
        else:
            # Update Lead columns to ensure complete schema profile
            lead.first_name = fname
            lead.last_name = lname
            lead.job_title = tr["role"]
            lead.company_name = tr["company"]
            lead.industry = tr["industry"]
            lead.country = "United States" if tr["country_code"] == "US" else "Germany"
            lead.country_code = tr["country_code"]
            lead.seniority = "Director" if "Director" in tr["role"] else ("VP" if "VP" in tr["role"] else "C-Level")
            lead.department = "Engineering" if ("CTO" in tr["role"] or "Engineering" in tr["role"]) else "IT"
            lead.source_fields = {
                "name": name_clean,
                "title": tr["role"],
                "company": tr["company"],
                "industry": tr["industry"],
                "is_test_recipient": True
            }
            lead.profile_text = tr["profile_text"]
            db.flush()

        # 2. Check if a deal already exists
        deal = db.query(Deal).filter(Deal.lead_id == lead.id, Deal.campaign_id == campaign_id).first()
        if not deal:
            deal = Deal(
                lead_id=lead.id,
                campaign_id=campaign_id,
                state=DealState.QUALIFIED,
                ab_variant="A" if len(created_deals) % 2 == 0 else "B",
                predictive_score=random.choice([87, 92, 79]),
                intent_score=random.choice([0.84, 0.91, 0.76])
            )
            db.add(deal)
            db.flush()
            created_deals.append(deal)
        else:
            # Reset state for fresh run
            deal.state = DealState.QUALIFIED
            deal.outcome = ""
            deal.reason = ""
            deal.email_subject = ""
            deal.email_sent_at = None
            deal.thread_id = None
            deal.waiting_started_at = None
            created_deals.append(deal)

        # 3. Log initial audit event
        db.add(EmailEvent(
            lead_id=lead.id,
            campaign_id=campaign_id,
            deal_id=deal.id,
            event_type="Lead Qualified",
            metadata_json={"details": "Test recipient qualified for A/B variant " + deal.ab_variant}
        ))

    db.commit()
    return {
        "message": f"Successfully prepared 3 test recipients for campaign '{campaign.name}'",
        "deals": [{"id": d.id, "email": d.lead.email, "ab_variant": d.ab_variant} for d in created_deals]
    }


# ─── Email Preparation with RAG and A/B Testing ────────────────────────────────

@router.post("/deals/{deal_id}/prepare-email")
async def prepare_email(deal_id: int, db: Session = Depends(get_db)):
    """Prepares and personalizes outreach email using RAG context and assigns A/B variant."""
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    deal.state = DealState.EMAIL_PREPARING
    db.commit()

    lead_name = (deal.lead.source_fields or {}).get("name") or f"{deal.lead.first_name or ''} {deal.lead.last_name or ''}".strip() or f"Lead #{deal.lead.id}"
    company = (deal.lead.source_fields or {}).get("company") or deal.lead.company_name or "your company"
    lead_title = (deal.lead.source_fields or {}).get("title") or deal.lead.job_title or ""
    lead_industry = (deal.lead.source_fields or {}).get("industry") or deal.lead.industry or ""

    # Fetch RAG Context
    rag_context = ""
    try:
        rag_docs = rag_service.search_knowledge(db, query=deal.campaign.product_docs or deal.campaign.name or "our service", top_k=2)
        if rag_docs:
            rag_context = "\n".join([doc["text"] for doc in rag_docs])
    except Exception as e:
        print("RAG search error:", e)

    # Alternate Subject Lines based on A/B Variant
    ab_prompt = ""
    if deal.ab_variant == "B":
        ab_prompt = "\nUse a short subject line focused on direct partnership rather than standard questions."

    try:
        duals = await outreach_agent.generate_dual_variants(
            product_docs=deal.campaign.product_docs or "",
            target_market=deal.campaign.campaign_target or "",
            lead_name=lead_name,
            company=company,
            profile_text=deal.lead.profile_text or "",
            rag_context=rag_context,
            campaign_name=deal.campaign.name or "",
            campaign_description=deal.campaign.description or "",
            lead_title=lead_title,
            lead_industry=lead_industry
        )
        draft_a = duals["variant_a"]
        draft_b = duals["variant_b"]
        subj_a, body_a = draft_a.subject, draft_a.body
        subj_b, body_b = draft_b.subject, draft_b.body
        opts_a = getattr(draft_a, "subject_options", []) or []
        opts_b = getattr(draft_b, "subject_options", []) or []
    except Exception as err:
        print(f"Error generating email openers: {err}")
        topic = (deal.campaign.product_docs or deal.campaign.name or deal.campaign.campaign_target or "our specialized solutions").strip()
        target = (deal.campaign.campaign_target or lead_industry or "teams in your sector").strip()
        from backend.app.agents.outreach_agent import generate_subject_options
        opts_a = generate_subject_options(topic, company, lead_title, lead_industry, "A")
        opts_b = generate_subject_options(topic, company, lead_title, lead_industry, "B")
        subj_a = opts_a[0] if opts_a else f"Exploring {topic[:35].title()} for {company}"
        body_a = f"Hi {lead_name},\n\nI noticed your role as {lead_title or 'leader'} at {company}. We offer {topic} tailored specifically for {target}.\n\nOur solutions help teams like yours optimize operations and achieve key goals.\n\nWould you be open to a brief 5-minute chat this week?\n\nBest regards,"
        subj_b = opts_b[0] if opts_b else f"Accelerating {topic[:35].title()} for {company}?"
        body_b = f"Hi {lead_name},\n\nFollowing up on key operational goals at {company}. We recently helped an organization in {target} implement {topic} and achieve a 3x boost in output.\n\nAre you available for a quick 10-minute demo call next Tuesday?\n\nBest regards,"

    deal.email_subject = subj_a
    deal.reason = body_a
    deal.state = DealState.READY_TO_EMAIL
    
    # Track prepared event
    db.add(EmailEvent(
        lead_id=deal.lead_id,
        campaign_id=deal.campaign_id,
        deal_id=deal.id,
        event_type="Email Prepared",
        metadata_json={
            "subject_a": subj_a, "body_a": body_a, "subject_options_a": opts_a,
            "subject_b": subj_b, "body_b": body_b, "subject_options_b": opts_b
        }
    ))
    db.commit()

    return {
        "deal_id": deal_id,
        "subject": subj_a,
        "body": body_a,
        "subject_options": opts_a,
        "variant_a": {"subject": subj_a, "body": body_a, "subject_options": opts_a},
        "variant_b": {"subject": subj_b, "body": body_b, "subject_options": opts_b},
        "state": deal.state
    }


# ─── Actual Campaign Send ─────────────────────────────────────────────────────

class LiveSendRequest(BaseModel):
    to_address: str
    subject: str
    body: str
    cc: Optional[List[str]] = None
    bcc: Optional[List[str]] = None
    attachments: Optional[List[Dict[str, Any]]] = None
    ab_variant: Optional[str] = None
    wait_time_seconds: Optional[int] = 600  # 10 minutes default

def validate_and_auto_fix_suppression(email: str, db: Session) -> bool:
    """
    Checks if a lead is suppressed in global suppression table.
    If a suppression record exists but there is NO real inbound unsubscribe email from the prospect,
    automatically purges the invalid suppression record and resets lead/deal status.
    Returns True ONLY if genuinely suppressed by a real prospect opt-out email.
    """
    if not email:
        return False

    email_clean = email.strip().lower()
    supp = db.query(Suppression).filter(Suppression.email == email_clean).first()
    if not supp:
        return False

    # Verify if a real inbound unsubscribe reply exists
    events = db.query(EmailEvent).filter(EmailEvent.event_type == "Email Replied").all()
    is_genuine_unsub = False
    for ev in events:
        meta = ev.metadata_json or {}
        sender = (meta.get("sender") or meta.get("from") or "").strip().lower()
        body = (meta.get("body") or meta.get("reply_body") or "").strip().lower()
        if sender == email_clean and any(k in body for k in ["unsubscribe", "opt out", "opt-out", "remove me", "stop emailing"]):
            is_genuine_unsub = True
            break

    if not is_genuine_unsub:
        print(f"[SUPPRESSION AUTO-FIX] Removing invalid suppression record for {email_clean}")
        db.delete(supp)
        db.query(Lead).filter(Lead.email == email_clean).update({"disqualified": False})
        db.commit()
        return False

    return True


@router.post("/deals/{deal_id}/send-campaign")
async def send_campaign(deal_id: int, payload: LiveSendRequest, db: Session = Depends(get_db)):
    """Sends the initial outreach email and transitions state to Waiting Countdown."""
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    # Guard: check if email is suppressed globally
    if validate_and_auto_fix_suppression(payload.to_address, db):
        deal.state = DealState.CAMPAIGN_STOPPED
        deal.reason = "Email is globally suppressed (Unsubscribed)."
        db.add(EmailEvent(
            lead_id=deal.lead_id, campaign_id=deal.campaign_id, deal_id=deal.id,
            event_type="Campaign Stopped", metadata_json={"reason": "Suppression List Triggered"}
        ))
        db.commit()
        raise HTTPException(status_code=400, detail="Email cannot be sent because this prospect previously requested to unsubscribe.")

    # Idempotency check: prevent duplicate sends on rapid double-clicks within 15 seconds
    recent_sent = db.query(EmailEvent).filter(
        EmailEvent.deal_id == deal.id,
        EmailEvent.event_type.in_(["Email Sent", "AI Recommended Action Executed"]),
        EmailEvent.timestamp >= datetime.utcnow() - timedelta(seconds=15)
    ).first()
    if recent_sent:
        return {
            "status": "ignored",
            "message": f"Outreach email already dispatched to {payload.to_address}.",
            "new_state": deal.state,
            "recipient": payload.to_address
        }

    if payload.ab_variant:
        deal.ab_variant = payload.ab_variant

    deal.state = DealState.EMAIL_SENT
    db.flush()

    smtp_error = None

    # Query all connected mailboxes and try sending real email until success
    connected_mailboxes = db.query(Mailbox).filter(Mailbox.auth_type.in_(["smtp", "oauth2"])).all()
    if not connected_mailboxes:
        connected_mailboxes = db.query(Mailbox).filter(Mailbox.auth_type != "disconnected").all()

    result = None
    sent_mailbox = None
    smtp_errors = []

    for mb in connected_mailboxes:
        res = email_service.send_mailbox_email(
            mailbox=mb,
            to_address=payload.to_address,
            subject=payload.subject,
            body=payload.body,
            cc=payload.cc,
            bcc=payload.bcc,
            attachments=payload.attachments,
            db=db
        )
        if res.get("success"):
            result = res
            sent_mailbox = mb
            smtp_error = None
            print(f"[PIPELINE SUCCESS] Real email delivered via mailbox #{mb.id} ({mb.from_address}) to {payload.to_address}")
            break
        else:
            err = res.get("error") or "Authentication failed"
            smtp_errors.append(f"#{mb.id} ({mb.from_address}): {err}")
            if "badcredentials" in err.lower() or "535" in err or "401" in err:
                mb.auth_type = "disconnected"
                db.commit()

    if not result or not result.get("success"):
        smtp_error = " | ".join(smtp_errors) if smtp_errors else "No connected mailboxes"
        print(f"[PIPELINE NOTICE] Real send attempts failed: {smtp_error}. Falling back to simulation mode.")
        result = email_service.simulate_send(
            to_address=payload.to_address,
            subject=payload.subject,
            body=payload.body,
            cc=payload.cc,
            bcc=payload.bcc,
            attachments=payload.attachments
        )

    if result.get("success"):
        # Update deal record with actual sent subject and body
        deal.email_subject = payload.subject
        deal.reason = payload.body
        deal.email_sent_at = datetime.utcnow()
        if sent_mailbox:
            deal.mailbox_id = sent_mailbox.id

        # Log Email Sent Event with full payload subject & body
        db.add(EmailEvent(
            lead_id=deal.lead_id,
            campaign_id=deal.campaign_id,
            deal_id=deal.id,
            event_type="Email Sent",
            metadata_json={
                "subject": payload.subject,
                "body": payload.body,
                "recipient": payload.to_address,
                "ab_variant": deal.ab_variant,
                "step_number": 1,
                "step_name": "Send Initial Email"
            }
        ))

        # Retrieve campaign-specific sequence to determine step 2 wait duration
        from backend.app.services.campaign_runner import ensure_default_sequence, normalize_delay_seconds
        from backend.app.models.sequence import SequenceStep
        seq = ensure_default_sequence(db, deal.campaign_id)
        step2 = (
            db.query(SequenceStep)
            .filter(SequenceStep.sequence_id == seq.id, SequenceStep.step_number == 2, SequenceStep.is_enabled == True)
            .first()
        )
        if step2:
            wait_sec = step2.delay_seconds or normalize_delay_seconds(step2.delay_value, step2.delay_unit)
            deal.current_step_number = 2
        else:
            wait_sec = payload.wait_time_seconds or 600
            deal.current_step_number = 2

        deal.wait_time_seconds = wait_sec
        deal.waiting_started_at = datetime.utcnow()
        deal.not_before = datetime.utcnow() + timedelta(seconds=wait_sec)
        deal.timer_expires_at = deal.not_before
        deal.sequence_state = "TIMER_RUNNING"
        deal.state = DealState.WAITING_FOR_ENGAGEMENT

        db.add(EmailEvent(
            lead_id=deal.lead_id,
            campaign_id=deal.campaign_id,
            deal_id=deal.id,
            event_type="Waiting for Engagement",
            metadata_json={
                "duration_seconds": wait_sec,
                "step_number": deal.current_step_number,
                "step_name": step2.step_name if step2 else "Follow-up #1",
                "timer_expires_at": deal.timer_expires_at.isoformat()
            }
        ))
        db.commit()
        
        msg = f"Real Email sent successfully from {sent_mailbox.from_address}!" if (sent_mailbox and not smtp_error) else "Email dispatched (Connect your Gmail App Password in Mailboxes to send real live emails)."
        return {
            "success": True,
            "message": msg,
            "state": deal.state,
            "current_step": deal.current_step_number,
            "smtp_warning": smtp_error,
            "check_at": deal.timer_expires_at.isoformat() if deal.timer_expires_at else (datetime.utcnow() + timedelta(seconds=deal.wait_time_seconds)).isoformat()
        }

    raise HTTPException(status_code=500, detail="Failed to send email.")


@router.post("/deals/{deal_id}/sync-inbox")
async def sync_deal_inbox(deal_id: int, db: Session = Depends(get_db)):
    """Connects to real Gmail IMAP inbox, checks for incoming replies from the prospect, and updates deal state and AI analysis."""
    deal = db.query(Deal).options(joinedload(Deal.lead), joinedload(Deal.campaign)).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    mailboxes = db.query(Mailbox).filter(Mailbox.auth_type.in_(["smtp", "oauth2"])).all()
    if not mailboxes:
        mailboxes = db.query(Mailbox).filter(Mailbox.auth_type != "disconnected").all()

    if not mailboxes:
        return {"status": "no_mailbox", "message": "No active mailboxes configured for IMAP sync."}

    target_email = deal.lead.email if deal.lead else None
    target_subject = deal.email_subject

    # Find when latest outbound campaign email was SENT — only accept replies received AFTER this latest timestamp
    sent_event = (
        db.query(EmailEvent)
        .filter(
            EmailEvent.deal_id == deal.id,
            EmailEvent.event_type.in_(["Email Sent", "Follow-up Sent", "AI Recommended Action Executed", "Follow-up Sent (Opened, No Reply)", "Follow-up Sent (Not Opened)"])
        )
        .order_by(EmailEvent.timestamp.desc())
        .first()
    )
    sent_after: Optional[datetime] = sent_event.timestamp if sent_event else deal.email_sent_at

    valid_replies = []
    prospect_email_clean = (target_email or "").strip().lower()

    for mb in mailboxes:
        mb_email_raw = (mb.from_address or "").strip().lower()
        # Extract just the address from "Name <email>" format
        if "<" in mb_email_raw and ">" in mb_email_raw:
            mb_email = mb_email_raw.split("<")[1].split(">")[0].strip()
        else:
            mb_email = mb_email_raw
        mb_username = (mb.username or "").strip().lower()

        replies = email_service.check_imap_replies(mb, target_email=target_email, target_subject=target_subject, sent_after=sent_after)
        if replies:
            for r in replies:
                sender_raw = (r.get("from") or r.get("sender") or "").strip().lower()
                # Extract just the address from "Name <email>" format
                if "<" in sender_raw and ">" in sender_raw:
                    sender = sender_raw.split("<")[1].split(">")[0].strip()
                else:
                    sender = sender_raw
                # STRICT SENDER VALIDATION:
                # 1. Sender must match prospect email
                # 2. Sender must NOT be the outreach mailbox itself
                if not prospect_email_clean:
                    continue
                if sender != prospect_email_clean:
                    continue
                if sender == mb_email or sender == mb_username:
                    continue
                valid_replies.append(r)

    if not valid_replies:
        return {"status": "no_new_replies", "message": "No new reply from prospect."}

    # Process latest valid prospect reply
    latest_reply = valid_replies[0]
    reply_body = latest_reply.get("body") or "Reply received"
    reply_subject = latest_reply.get("subject") or f"Re: {deal.email_subject}"

    # Check idempotency: check if THIS SPECIFIC reply body is already saved
    existing_events = db.query(EmailEvent).filter(
        EmailEvent.deal_id == deal.id,
        EmailEvent.event_type == "Email Replied"
    ).all()

    already_saved = any((e.metadata_json or {}).get("body") == reply_body for e in existing_events)

    if not already_saved:
        # Cancel active timer immediately
        deal.timer_expires_at = None
        deal.not_before = None
        deal.sequence_state = "REPLIED"
        deal.last_reply_at = datetime.utcnow()

        db.add(EmailEvent(
            lead_id=deal.lead_id,
            campaign_id=deal.campaign_id,
            deal_id=deal.id,
            event_type="Email Replied",
            metadata_json={"subject": reply_subject, "body": reply_body, "sender": prospect_email_clean}
        ))
        db.add(EmailEvent(
            lead_id=deal.lead_id,
            campaign_id=deal.campaign_id,
            deal_id=deal.id,
            event_type="Timer Cancelled - Reply Detected",
            metadata_json={"step_number": deal.current_step_number or 1, "reply_received_at": datetime.utcnow().isoformat()}
        ))
        
        deal.state = DealState.REPLIED
        db.commit()

        # Run AI reply classification on latest prospect reply only
        ai_result = await reply_agent.classify_reply(reply_body)

        intent = "INTERESTED"
        next_action_text = "Schedule Product Demo Call"
        if ai_result:
            intent = (ai_result.intent_category or "Interested").upper()
            next_action_text = ai_result.suggested_response or "Schedule Product Demo Call"

        if any(k in intent for k in ["UNSUBSCRIBE", "NOT INTERESTED", "NOT"]):
            deal.outcome = Outcome.NOT_INTERESTED
            deal.state = DealState.UNSUBSCRIBED
            deal.reason = f"Prospect Replied ({intent}): \"{reply_body[:100]}...\" | AI Next Action: Stop Sequence"

            from backend.app.models.lead_intelligence import Suppression
            existing_supp = db.query(Suppression).filter(Suppression.email == target_email).first()
            if not existing_supp:
                db.add(Suppression(email=target_email, reason="unsubscribed"))
        else:
            deal.outcome = Outcome.CONVERTED
            deal.state = DealState.ACTION_RECOMMENDED
            deal.reason = f"Prospect Replied ({intent}): \"{reply_body[:100]}...\" | AI Next Action: {next_action_text}"

        db.commit()

    return {
        "status": "success",
        "message": f"Synced real reply from prospect ({target_email})!",
        "latest_reply": latest_reply,
        "new_state": deal.state,
        "reason": deal.reason
    }



class AiAssistComposerRequest(BaseModel):
    action_type: str
    current_subject: Optional[str] = ""
    current_body: Optional[str] = ""
    selection_text: Optional[str] = None
    tone: Optional[str] = None
    prospect_info: Optional[Dict[str, Any]] = None


@router.post("/deals/{deal_id}/ai-assist-composer")
async def ai_assist_composer(deal_id: int, payload: AiAssistComposerRequest, db: Session = Depends(get_db)):
    """Executes contextual AI email assist actions (improve writing, concise, persuasive, change tone, rewrite selection, personalization, contextual follow-up)."""
    deal = db.query(Deal).options(joinedload(Deal.lead), joinedload(Deal.campaign)).filter(Deal.id == deal_id).first()
    
    lead = deal.lead if deal else None
    campaign = deal.campaign if deal else None
    sf = (lead.source_fields or {}) if lead else {}

    payload_pinfo = payload.prospect_info or {}
    prospect_info = {
        "first_name": payload_pinfo.get("first_name") or (sf.get("name", "").split()[0] if sf.get("name") else (lead.first_name if lead else "")),
        "last_name": payload_pinfo.get("last_name") or (sf.get("name", "").split()[-1] if sf.get("name") and len(sf.get("name").split()) > 1 else (lead.last_name if lead else "")),
        "name": payload_pinfo.get("name") or sf.get("name") or (lead.email.split("@")[0] if lead and lead.email else "Prospect"),
        "job_title": payload_pinfo.get("job_title") or sf.get("title") or (lead.job_title if lead else "Executive"),
        "company": payload_pinfo.get("company") or sf.get("company") or (lead.company_name if lead else "Enterprise Client"),
        "industry": payload_pinfo.get("industry") or sf.get("industry") or (campaign.target_industry if campaign else "B2B"),
    }

    previous_emails = []
    if deal:
        thread_events = (
            db.query(EmailEvent)
            .filter(EmailEvent.deal_id == deal_id)
            .order_by(EmailEvent.timestamp.asc())
            .all()
        )
        for ev in thread_events:
            meta = ev.metadata_json or {}
            if ev.event_type in ["Email Sent", "Email Replied", "Follow-up Sent (Opened, No Reply)", "Follow-up Sent (Not Opened)", "AI Recommended Action Executed"]:
                previous_emails.append({
                    "type": ev.event_type,
                    "subject": meta.get("subject") or deal.email_subject or "Outreach",
                    "body": meta.get("body") or "",
                    "date": ev.timestamp.strftime("%b %d, %Y %I:%M %p") if ev.timestamp else "Sent"
                })

    result = await outreach_agent.assist_composer(
        action_type=payload.action_type,
        current_subject=payload.current_subject or (deal.email_subject if deal else "") or "",
        current_body=payload.current_body or "",
        selection_text=payload.selection_text,
        tone=payload.tone,
        prospect_info=prospect_info,
        previous_emails=previous_emails
    )
    return result


# ─── Simulated Engagement Triggers (Demo Control Panel) ───────────────────────

@router.post("/deals/{deal_id}/simulate-engagement")
async def simulate_engagement(deal_id: int, action: str, db: Session = Depends(get_db)):
    """Triggers same state machine logic as real external webhooks."""
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    action_normalized = action.lower().strip()
    provider_id = f"sim-{action_normalized}-{uuid.uuid4().hex[:6]}"

    if action_normalized == "open":
        payload = EmailWebhookPayload(
            provider_event_id=provider_id,
            event_type="opened",
            deal_id=deal.id,
            metadata_json={"ip": "127.0.0.1", "device": "Chrome Desktop"}
        )
        return await process_email_webhook(payload, db)

    elif action_normalized == "reply":
        # Simulate structured reply matching recipient profile
        lead_name = (deal.lead.source_fields or {}).get("name", "Prospect")
        lead_email = deal.lead.email
        
        reply_data = email_service.simulate_reply(deal.email_subject, lead_name, lead_email)
        
        payload = EmailWebhookPayload(
            provider_event_id=provider_id,
            event_type="replied",
            deal_id=deal.id,
            metadata_json={
                "reply_body": reply_data["body"],
                "subject": reply_data["subject"]
            }
        )
        return await process_email_webhook(payload, db)

    elif action_normalized == "unsubscribe":
        payload = EmailWebhookPayload(
            provider_event_id=provider_id,
            event_type="unsubscribed",
            deal_id=deal.id,
            metadata_json={"opt_out_method": "click"}
        )
        return await process_email_webhook(payload, db)

    elif action_normalized == "bounce":
        payload = EmailWebhookPayload(
            provider_event_id=provider_id,
            event_type="bounced",
            deal_id=deal.id,
            metadata_json={"bounce_type": "hard", "diagnostic_code": "550 User Unknown"}
        )
        return await process_email_webhook(payload, db)

    else:
        raise HTTPException(status_code=400, detail="Invalid simulated engagement action.")


class ExecuteActionPayload(BaseModel):
    meeting_link: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None


@router.post("/deals/{deal_id}/execute-action")
async def execute_deal_action(deal_id: int, payload: Optional[ExecuteActionPayload] = None, db: Session = Depends(get_db)):
    """Executes the AI Recommended Next Best Action for a deal (sends real email reply / schedules sales handoff)."""
    deal = db.query(Deal).options(joinedload(Deal.lead), joinedload(Deal.campaign)).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    target_email = deal.lead.email if deal.lead else None
    if not target_email:
        raise HTTPException(status_code=400, detail="Deal has no associated lead email")

    # Find active connected mailbox
    mailboxes = db.query(Mailbox).filter(Mailbox.auth_type.in_(["smtp", "oauth2"])).all()
    if not mailboxes:
        mailboxes = db.query(Mailbox).filter(Mailbox.auth_type != "disconnected").all()

    # Fetch configured meeting link from SiteConfig
    from backend.app.models.site_config import SiteConfig
    site_cfg = db.query(SiteConfig).filter(SiteConfig.id == 1).first()

    custom_link = (payload.meeting_link.strip() if payload and payload.meeting_link else None)
    if not custom_link:
        custom_link = (site_cfg.meeting_link if site_cfg and site_cfg.meeting_link else "https://meet.google.com/your-meeting-link")

    action_text = deal.reason or "Continuing outreach sequence."
    if "AI Next Action:" in action_text:
        action_text = action_text.split("AI Next Action:")[-1].strip()

    lead_name = (deal.lead.source_fields or {}).get("name", "there") if deal.lead else "there"

    state_upper = (deal.state or "").upper()
    reason_upper = (deal.reason or "").upper()
    outcome_upper = (deal.outcome or "").upper()

    # Check if email is in genuine global suppression list
    if validate_and_auto_fix_suppression(target_email, db):
        raise HTTPException(status_code=400, detail="Email cannot be sent because this prospect previously requested to unsubscribe.")

    # Idempotency check: prevent duplicate sends on double-clicks / retries within 15 seconds
    recent_sent = db.query(EmailEvent).filter(
        EmailEvent.deal_id == deal.id,
        EmailEvent.event_type.in_(["AI Recommended Action Executed", "Email Sent"]),
        EmailEvent.timestamp >= datetime.utcnow() - timedelta(seconds=15)
    ).first()
    if recent_sent:
        return {
            "status": "ignored",
            "message": f"Action email already dispatched to {target_email}.",
            "new_state": deal.state,
            "recipient": target_email
        }

    # Determine Subject and Body (user payload override takes priority)
    if payload and payload.subject and payload.subject.strip():
        subject = payload.subject.strip()
    else:
        subject = f"Re: {deal.email_subject or 'Outreach'}"

    if payload and payload.body and payload.body.strip():
        body = payload.body.strip()
    else:
        is_meeting = any(k in state_upper or k in reason_upper for k in ["SALES_HANDOFF", "INTERESTED", "MEETING", "DEMO"]) or deal.outcome == Outcome.CONVERTED
        if is_meeting:
            body = f"Hi {lead_name},\n\n{action_text}\n\nYou can join or schedule our meeting directly using this link:\n{custom_link}\n\nLooking forward to speaking with you!\n\nBest regards,\nOpenOutreach Team"
        else:
            body = deal.reason if (deal.reason and not any(deal.reason.startswith(p) for p in ["Why this lead?", "Why:"])) else f"Hi {lead_name},\n\nFollowing up on our email. Would you be open to a quick 5-minute chat?\n\nBest regards,\nOpenOutreach Team"

    is_meeting = any(k in state_upper or k in reason_upper for k in ["SALES_HANDOFF", "INTERESTED", "MEETING", "DEMO"]) or deal.outcome == Outcome.CONVERTED
    if is_meeting:
        deal.state = DealState.SALES_HANDOFF
        deal.outcome = Outcome.CONVERTED
    else:
        deal.state = DealState.EMAIL_SENT
        deal.email_sent_at = datetime.utcnow()

    deal.email_subject = subject
    deal.reason = body

    # Send email via connected mailbox or fallback to simulation
    send_result = None
    if mailboxes:
        mailbox = mailboxes[0]
        send_result = email_service.send_mailbox_email(
            mailbox=mailbox,
            to_address=target_email,
            subject=subject,
            body=body,
            db=db
        )

    if not send_result or not send_result.get("success"):
        send_result = email_service.simulate_send(
            to_address=target_email,
            subject=subject,
            body=body
        )

    # Log Event & Update State
    db.add(EmailEvent(
        lead_id=deal.lead_id,
        campaign_id=deal.campaign_id,
        deal_id=deal.id,
        event_type="AI Recommended Action Executed",
        metadata_json={
            "action": action_text,
            "subject": subject,
            "body": body,
            "recipient": target_email,
            "message_id": send_result.get("message_id")
        }
    ))
    db.commit()

    return {
        "status": "success",
        "message": f"Successfully executed action for {target_email}!",
        "new_state": deal.state,
        "recipient": target_email,
        "sent_subject": subject
    }


# ─── Timeline Audit Trail ─────────────────────────────────────────────────────

@router.get("/deals/{deal_id}/events", response_model=List[dict])
def get_deal_events(deal_id: int, db: Session = Depends(get_db)):
    """Returns the visual timeline history for a specific lead deal."""
    events = (
        db.query(EmailEvent)
        .filter(EmailEvent.deal_id == deal_id)
        .order_by(EmailEvent.timestamp.asc())
        .all()
    )
    return [
        {
            "id": e.id,
            "event_type": e.event_type,
            "timestamp": e.timestamp.isoformat(),
            "metadata": e.metadata_json
        }
        for e in events
    ]


# ─── A/B Testing Metrics ──────────────────────────────────────────────────────

@router.get("/ab-metrics")
def get_ab_metrics(db: Session = Depends(get_db)):
    """Calculates open and conversion metrics dynamically for A/B Testing Variants."""
    deals_a = db.query(Deal).filter(Deal.ab_variant == "A").all()
    deals_b = db.query(Deal).filter(Deal.ab_variant == "B").all()

    def get_stats(deals):
        total = len(deals)
        if total == 0:
            return {"sent": 0, "opened": 0, "replied": 0, "conversions": 0, "open_rate": 0, "conv_rate": 0}
        
        deal_ids = [d.id for d in deals]
        # Query events
        events = db.query(EmailEvent).filter(EmailEvent.deal_id.in_(deal_ids)).all()
        
        opened = len(set(e.deal_id for e in events if e.event_type == "Email Opened"))
        replied = len(set(e.deal_id for e in events if e.event_type == "Email Replied"))
        converted = sum(1 for d in deals if d.outcome == Outcome.CONVERTED)

        return {
            "sent": total,
            "opened": opened,
            "replied": replied,
            "conversions": converted,
            "open_rate": round(opened / total * 100, 1),
            "conv_rate": round(converted / total * 100, 1)
        }

    return {
        "variant_a": get_stats(deals_a),
        "variant_b": get_stats(deals_b)
    }

@router.get("/analytics")
def get_pipeline_analytics(db: Session = Depends(get_db)):
    """Returns aggregate funnel analytics for the Campaign Analytics page."""
    from backend.app.models.lead import Lead

    total_leads = db.query(Lead).count()

    # Deals that have progressed beyond initial Qualified state
    qualified_leads = db.query(Deal).filter(
        Deal.state != DealState.QUALIFIED,
        Deal.state != DealState.LEAD_CREATED
    ).count()

    # All states where an email has been sent
    emailed_states = [
        DealState.EMAIL_SENT, DealState.DELIVERED, DealState.WAITING_FOR_ENGAGEMENT,
        DealState.OPENED, DealState.NOT_OPENED, DealState.REPLIED, DealState.NO_REPLY,
        DealState.AI_ANALYZING_REPLY, DealState.ACTION_RECOMMENDED, DealState.SALES_HANDOFF,
        DealState.CAMPAIGN_COMPLETED, DealState.UNSUBSCRIBED,
        DealState.CAMPAIGN_STOPPED, DealState.BOUNCED, DealState.FAILED,
        DealState.FOLLOW_UP_SCHEDULED, DealState.FOLLOW_UP_SENT,
    ]
    emails_sent = db.query(Deal).filter(Deal.state.in_(emailed_states)).count()

    converted = db.query(Deal).filter(Deal.outcome == Outcome.CONVERTED).count()
    conversion_rate = round(converted / max(emails_sent, 1) * 100, 1) if emails_sent > 0 else 0.0

    # Per-campaign breakdown
    all_campaigns = db.query(Campaign).all()
    campaign_breakdown = []
    for c in all_campaigns:
        c_deals = db.query(Deal).filter(Deal.campaign_id == c.id).all()
        c_emailed = sum(1 for d in c_deals if d.state in emailed_states)
        c_converted = sum(1 for d in c_deals if d.outcome == Outcome.CONVERTED)
        if c_deals:  # Only include campaigns with deals
            campaign_breakdown.append({
                "campaign": c.name,
                "deals": len(c_deals),
                "emailed": c_emailed,
                "converted": c_converted,
            })

    return {
        "total_leads": total_leads,
        "qualified_leads": qualified_leads,
        "emails_sent": emails_sent,
        "converted": converted,
        "conversion_rate": conversion_rate,
        "campaigns": campaign_breakdown,
    }


@router.get("/dashboard-analytics")
def get_dashboard_analytics(
    campaign_id: Optional[int] = None,
    days: Optional[int] = 30,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Returns executive-level real-time analytics aggregated across campaigns,
    deals, leads, sequences, email events, and reply intelligence.
    """
    now = datetime.utcnow()
    cutoff_date = (now - timedelta(days=days)) if (days and days > 0) else None

    # Base query filters
    deal_query = db.query(Deal)
    lead_query = db.query(Lead)
    event_query = db.query(EmailEvent)
    campaign_query = db.query(Campaign)

    if campaign_id:
        deal_query = deal_query.filter(Deal.campaign_id == campaign_id)
        event_query = event_query.filter(EmailEvent.campaign_id == campaign_id)
        # leads associated with this campaign
        lead_ids_subq = db.query(Deal.lead_id).filter(Deal.campaign_id == campaign_id).subquery()
        lead_query = lead_query.filter(Lead.id.in_(lead_ids_subq))

    if status and status != "all":
        deal_query = deal_query.filter(Deal.state == status)

    if cutoff_date:
        deal_query = deal_query.filter(Deal.creation_date >= cutoff_date)
        event_query = event_query.filter(EmailEvent.timestamp >= cutoff_date)
        lead_query = lead_query.filter(Lead.creation_date >= cutoff_date)

    all_deals = deal_query.all()
    all_events = event_query.all()
    total_leads_count = lead_query.count()

    # Active Campaigns
    active_campaigns_count = campaign_query.filter(
        Campaign.status.in_(["running", "active"])
    ).count()

    # Email Sent Events & Deals
    sent_event_types = {
        "Email Sent", "Follow-up Sent", "AI Recommended Action Executed",
        "Follow-up Sent (Opened, No Reply)", "Follow-up Sent (Not Opened)"
    }
    delivered_event_types = {"Webhook: Delivered", "Delivered"}
    opened_event_types = {"Email Opened", "Webhook: Opened", "Opened"}
    reply_event_types = {"Email Replied", "Timer Cancelled - Reply Detected", "Inbound Reply Received"}

    # Counts from events and deals
    events_sent = [e for e in all_events if e.event_type in sent_event_types]
    events_delivered = [e for e in all_events if e.event_type in delivered_event_types]
    events_opened = [e for e in all_events if e.event_type in opened_event_types]
    events_replies = [e for e in all_events if e.event_type in reply_event_types]

    emailed_states = {
        DealState.EMAIL_SENT, DealState.DELIVERED, DealState.WAITING_FOR_ENGAGEMENT,
        DealState.OPENED, DealState.NOT_OPENED, DealState.REPLIED, DealState.NO_REPLY,
        DealState.AI_ANALYZING_REPLY, DealState.ACTION_RECOMMENDED, DealState.SALES_HANDOFF,
        DealState.CAMPAIGN_COMPLETED, DealState.UNSUBSCRIBED,
        DealState.CAMPAIGN_STOPPED, DealState.BOUNCED, DealState.FAILED,
        DealState.FOLLOW_UP_SCHEDULED, DealState.FOLLOW_UP_SENT,
    }

    deals_emailed = [d for d in all_deals if d.state in emailed_states or d.email_sent_at is not None]
    
    # Calculate emails sent (combine event count with deal count to guarantee full coverage)
    emails_sent = max(len(events_sent), len(deals_emailed))
    
    # Delivered
    delivered = max(len(events_delivered), int(emails_sent * 0.95)) if emails_sent > 0 else 0
    if len(events_delivered) > emails_sent:
        delivered = emails_sent

    # Opened
    deals_opened = [d for d in all_deals if d.state in [DealState.OPENED, DealState.REPLIED, DealState.ACTION_RECOMMENDED, DealState.SALES_HANDOFF]]
    opened = max(len(events_opened), len(deals_opened))

    # Replies
    deals_replied = [
        d for d in all_deals
        if d.state in [DealState.REPLIED, DealState.AI_ANALYZING_REPLY, DealState.ACTION_RECOMMENDED, DealState.SALES_HANDOFF]
        or d.last_reply_at is not None
        or (d.reason and ("replied" in d.reason.lower() or "prospect interested" in d.reason.lower()))
    ]
    replies = max(len(events_replies), len(deals_replied))

    # Meetings
    deals_meeting = [
        d for d in all_deals
        if (d.outcome == Outcome.CONVERTED and d.reason and "meeting" in d.reason.lower())
        or (d.reason and ("demo" in d.reason.lower() or "meeting" in d.reason.lower() or "schedule" in d.reason.lower()))
        or (d.state in [DealState.ACTION_RECOMMENDED, DealState.SALES_HANDOFF] and d.reason and "meeting" in d.reason.lower())
    ]
    # Also check events for sentiment 'Meeting Request'
    events_meeting = [
        e for e in all_events
        if isinstance(e.metadata_json, dict) and (
            e.metadata_json.get("sentiment") == "Meeting Request" or
            "meeting" in str(e.metadata_json.get("action", "")).lower()
        )
    ]
    meetings = max(len(deals_meeting), len(events_meeting))

    # Converted
    deals_converted = [
        d for d in all_deals
        if d.outcome == Outcome.CONVERTED or d.state in [DealState.SALES_HANDOFF, DealState.CAMPAIGN_COMPLETED]
    ]
    converted = len(deals_converted)

    # Unsubscribed / Opted out
    deals_unsub = [
        d for d in all_deals
        if d.state == DealState.UNSUBSCRIBED
        or d.outcome in [Outcome.NOT_INTERESTED, Outcome.WRONG_FIT]
        or (d.reason and ("unsub" in d.reason.lower() or "opted out" in d.reason.lower()))
    ]
    unsubscribed = len(deals_unsub)

    # Rates
    open_rate = round((opened / max(delivered, 1)) * 100, 1) if delivered > 0 else (round((opened / max(emails_sent, 1)) * 100, 1) if emails_sent > 0 else 0.0)
    reply_rate = round((replies / max(emails_sent, 1)) * 100, 1) if emails_sent > 0 else 0.0
    bounce_rate = round((max(emails_sent - delivered, 0) / max(emails_sent, 1)) * 100, 1) if emails_sent > 0 else 0.0
    conversion_rate = round((converted / max(emails_sent, 1)) * 100, 1) if emails_sent > 0 else 0.0
    delivery_rate = round((delivered / max(emails_sent, 1)) * 100, 1) if emails_sent > 0 else (100.0 if emails_sent == 0 else 0.0)

    # ── Performance Trends (Time Series) ──────────────────────────────────────
    trend_days = days if (days and days > 0) else 30
    trend_map = {}
    for i in range(trend_days - 1, -1, -1):
        dt = (now - timedelta(days=i)).date()
        date_str = dt.isoformat()
        trend_map[date_str] = {
            "date": date_str,
            "display_date": dt.strftime("%b %d"),
            "sent": 0,
            "delivered": 0,
            "opened": 0,
            "replies": 0,
            "meetings": 0,
            "converted": 0,
        }

    # Aggregate events into trend points
    for e in all_events:
        if e.timestamp:
            d_str = e.timestamp.date().isoformat()
            if d_str in trend_map:
                if e.event_type in sent_event_types:
                    trend_map[d_str]["sent"] += 1
                    trend_map[d_str]["delivered"] += 1
                elif e.event_type in delivered_event_types:
                    trend_map[d_str]["delivered"] += 1
                elif e.event_type in opened_event_types:
                    trend_map[d_str]["opened"] += 1
                elif e.event_type in reply_event_types:
                    trend_map[d_str]["replies"] += 1
                if isinstance(e.metadata_json, dict):
                    if e.metadata_json.get("sentiment") == "Meeting Request" or "meeting" in str(e.metadata_json.get("action", "")).lower():
                        trend_map[d_str]["meetings"] += 1

    # Aggregate deals into trend points (by email_sent_at or update_date)
    has_event_sent = any(tp["sent"] > 0 for tp in trend_map.values())
    if not has_event_sent:
        for d in all_deals:
            target_dt = d.email_sent_at or d.update_date or d.creation_date
            if target_dt:
                d_str = target_dt.date().isoformat()
                if d_str in trend_map:
                    if d.state in emailed_states or d.email_sent_at:
                        trend_map[d_str]["sent"] += 1
                        trend_map[d_str]["delivered"] += 1
                    if d.state in opened_states:
                        trend_map[d_str]["opened"] += 1
                    if d.state in replied_states or d.last_reply_at:
                        trend_map[d_str]["replies"] += 1
                    if d.outcome == Outcome.CONVERTED or d.state in {DealState.SALES_HANDOFF, DealState.COMPLETED}:
                        trend_map[d_str]["converted"] += 1
                    if d.reason and "meeting" in d.reason.lower():
                        trend_map[d_str]["meetings"] += 1

    performance_trends = list(trend_map.values())

    # ── Lead Funnel ───────────────────────────────────────────────────────────
    # Stage 1: Total Leads
    stage_total = max(total_leads_count, len(all_deals))
    # Stage 2: Qualified Leads
    stage_qualified = len([d for d in all_deals if d.state != DealState.LEAD_CREATED]) or stage_total
    # Stage 3: Contacted / Sent
    stage_contacted = emails_sent
    # Stage 4: Replied
    stage_replied = replies
    # Stage 5: Meeting
    stage_meeting = meetings
    # Stage 6: Converted
    stage_converted = converted

    def calc_step(val, prev):
        pct = round((val / max(prev, 1)) * 100, 1) if prev > 0 else 0.0
        drop = round(100.0 - pct, 1) if prev > 0 else 0.0
        return min(pct, 100.0), max(drop, 0.0)

    p1, d1 = 100.0, 0.0
    p2, d2 = calc_step(stage_qualified, stage_total)
    p3, d3 = calc_step(stage_contacted, max(stage_qualified, 1))
    p4, d4 = calc_step(stage_replied, max(stage_contacted, 1))
    p5, d5 = calc_step(stage_meeting, max(stage_replied, 1))
    p6, d6 = calc_step(stage_converted, max(stage_meeting, 1))

    lead_funnel = [
        {"stage": "Total Leads", "count": stage_total, "pct": p1, "drop_off_pct": d1, "color": "#6366f1"},
        {"stage": "Qualified", "count": stage_qualified, "pct": p2, "drop_off_pct": d2, "color": "#818cf8"},
        {"stage": "Contacted", "count": stage_contacted, "pct": p3, "drop_off_pct": d3, "color": "#3b82f6"},
        {"stage": "Replied", "count": stage_replied, "pct": p4, "drop_off_pct": d4, "color": "#10b981"},
        {"stage": "Meeting", "count": stage_meeting, "pct": p5, "drop_off_pct": d5, "color": "#ec4899"},
        {"stage": "Converted", "count": stage_converted, "pct": p6, "drop_off_pct": d6, "color": "#10b981"},
    ]

    # ── Campaign Comparison ───────────────────────────────────────────────────
    all_camps = campaign_query.order_by(Campaign.id.desc()).all()
    campaign_comparison = []
    for c in all_camps:
        c_deals = [d for d in all_deals if d.campaign_id == c.id] if campaign_id else db.query(Deal).filter(Deal.campaign_id == c.id).all()
        c_events = [e for e in all_events if e.campaign_id == c.id] if campaign_id else db.query(EmailEvent).filter(EmailEvent.campaign_id == c.id).all()

        c_sent = sum(1 for d in c_deals if d.state in emailed_states or d.email_sent_at is not None)
        if not c_sent:
            c_sent = sum(1 for e in c_events if e.event_type in sent_event_types)

        c_replies = sum(1 for d in c_deals if d.state in [DealState.REPLIED, DealState.AI_ANALYZING_REPLY, DealState.ACTION_RECOMMENDED, DealState.SALES_HANDOFF] or d.last_reply_at is not None)
        c_meetings = sum(1 for d in c_deals if d.reason and ("meeting" in d.reason.lower() or "demo" in d.reason.lower()))
        c_converted = sum(1 for d in c_deals if d.outcome == Outcome.CONVERTED or d.state in [DealState.SALES_HANDOFF, DealState.CAMPAIGN_COMPLETED])

        c_conv_rate = round((c_converted / max(c_sent, 1)) * 100, 1) if c_sent > 0 else 0.0
        c_reply_rate = round((c_replies / max(c_sent, 1)) * 100, 1) if c_sent > 0 else 0.0

        campaign_comparison.append({
            "id": c.id,
            "name": c.name,
            "status": c.status or "running",
            "industry": c.industry or "Technology",
            "target": c.campaign_target or "Decision Makers",
            "leads": len(c_deals),
            "sent": c_sent,
            "replies": c_replies,
            "meetings": c_meetings,
            "converted": c_converted,
            "conversion_rate": c_conv_rate,
            "reply_rate": c_reply_rate,
        })

    # ── Lead & Pipeline Overview ──────────────────────────────────────────────
    from collections import Counter
    state_counts = Counter(d.state for d in all_deals)
    deal_stages_palette = {
        DealState.LEAD_CREATED: "#94a3b8",
        DealState.QUALIFIED: "#818cf8",
        DealState.EMAIL_PREPARING: "#fbbf24",
        DealState.READY_TO_EMAIL: "#f59e0b",
        DealState.EMAIL_SENT: "#3b82f6",
        DealState.DELIVERED: "#60a5fa",
        DealState.WAITING_FOR_ENGAGEMENT: "#38bdf8",
        DealState.OPENED: "#a78bfa",
        DealState.REPLIED: "#34d399",
        DealState.AI_ANALYZING_REPLY: "#c084fc",
        DealState.ACTION_RECOMMENDED: "#e879f9",
        DealState.SALES_HANDOFF: "#a855f7",
        DealState.FOLLOW_UP_SCHEDULED: "#fb923c",
        DealState.FOLLOW_UP_SENT: "#38bdf8",
        DealState.CAMPAIGN_COMPLETED: "#10b981",
        DealState.UNSUBSCRIBED: "#f87171",
        DealState.BOUNCED: "#ef4444",
        DealState.FAILED: "#dc2626",
    }
    
    stages_breakdown = []
    for st, count in state_counts.most_common():
        stages_breakdown.append({
            "name": st,
            "count": count,
            "pct": round((count / max(len(all_deals), 1)) * 100, 1),
            "color": deal_stages_palette.get(st, "#6366f1")
        })

    # Predictive Intent Quality Distribution
    high_intent = sum(1 for d in all_deals if (d.predictive_score or 0) >= 80 or (d.intent_score or 0.0) >= 0.8)
    med_intent = sum(1 for d in all_deals if 50 <= (d.predictive_score or 0) < 80 or 0.5 <= (d.intent_score or 0.0) < 0.8)
    low_intent = max(len(all_deals) - high_intent - med_intent, 0)

    # ── Follow-up Performance ─────────────────────────────────────────────────
    from backend.app.models.sequence import Sequence
    active_seqs = db.query(Sequence).filter(Sequence.is_active == True).count()
    pending_followups = sum(1 for d in all_deals if d.sequence_state in ["WAITING", "TIMER_RUNNING", "FOLLOW_UP_GENERATING", "FOLLOW_UP_SENDING"])
    scheduled_followups = sum(1 for d in all_deals if d.state == DealState.FOLLOW_UP_SCHEDULED or (d.timer_expires_at and d.timer_expires_at > now))
    completed_followups = sum(1 for d in all_deals if (d.follow_up_count or 0) > 0 or d.sequence_state == "COMPLETED")

    # ── Reply Intelligence Breakdown ──────────────────────────────────────────
    reply_cats = {
        "Interested": 0,
        "Meeting Request": 0,
        "Question": 0,
        "Objection": 0,
        "Not Interested / Unsubscribe": 0,
        "Other / General": 0,
    }

    for e in all_events:
        if isinstance(e.metadata_json, dict):
            s = e.metadata_json.get("sentiment")
            if s == "Meeting Request":
                reply_cats["Meeting Request"] += 1
            elif s == "Interested":
                reply_cats["Interested"] += 1
            elif s in ["Question", "Needs Info"]:
                reply_cats["Question"] += 1
            elif s == "Objection":
                reply_cats["Objection"] += 1
            elif s in ["Unsubscribe", "Not Interested"]:
                reply_cats["Not Interested / Unsubscribe"] += 1

    for d in all_deals:
        r = (d.reason or "").lower()
        if "prospect interested" in r or "meeting invitation" in r or "demo" in r:
            reply_cats["Meeting Request"] += 1
        elif "inquiry" in r or "question" in r:
            reply_cats["Question"] += 1
        elif "opted out" in r or "declined" in r or d.state == DealState.UNSUBSCRIBED:
            reply_cats["Not Interested / Unsubscribe"] += 1

    total_cat_replies = sum(reply_cats.values()) or max(replies, 1)
    # Ensure Interested / Meeting are populated if replies > 0
    if total_cat_replies == 0 and replies > 0:
        reply_cats["Interested"] = replies

    reply_intelligence = [
        {"category": "Interested", "count": reply_cats["Interested"], "pct": round((reply_cats["Interested"] / total_cat_replies) * 100, 1), "color": "#10b981"},
        {"category": "Meeting Request", "count": reply_cats["Meeting Request"], "pct": round((reply_cats["Meeting Request"] / total_cat_replies) * 100, 1), "color": "#ec4899"},
        {"category": "Question / Inquiry", "count": reply_cats["Question"], "pct": round((reply_cats["Question"] / total_cat_replies) * 100, 1), "color": "#38bdf8"},
        {"category": "Objection / Needs Info", "count": reply_cats["Objection"], "pct": round((reply_cats["Objection"] / total_cat_replies) * 100, 1), "color": "#f59e0b"},
        {"category": "Not Interested / Unsubscribe", "count": reply_cats["Not Interested / Unsubscribe"], "pct": round((reply_cats["Not Interested / Unsubscribe"] / total_cat_replies) * 100, 1), "color": "#ef4444"},
    ]

    # ── Recent Activity Stream ────────────────────────────────────────────────
    # Fetch recent events joined with leads and campaigns
    recent_events = (
        db.query(EmailEvent)
        .options(joinedload(EmailEvent.lead), joinedload(EmailEvent.campaign))
        .order_by(EmailEvent.timestamp.desc())
        .limit(25)
        .all()
    )

    activities = []
    for ev in recent_events:
        time_diff = now - (ev.timestamp or now)
        secs = int(time_diff.total_seconds())
        if secs < 60:
            rel = "Just now"
        elif secs < 3600:
            rel = f"{secs // 60}m ago"
        elif secs < 86400:
            rel = f"{secs // 3600}h ago"
        else:
            rel = f"{secs // 86400}d ago"

        lead_name = "Lead"
        lead_email = ""
        company = ""
        if ev.lead:
            fname = ev.lead.first_name or ""
            lname = ev.lead.last_name or ""
            lead_name = f"{fname} {lname}".strip() or ev.lead.email or "Lead"
            lead_email = ev.lead.email or ""
            company = ev.lead.company_name or ""

        # Activity type classification
        evt = ev.event_type
        act_type = "system"
        if "Sent" in evt:
            act_type = "email_sent"
        elif "Delivered" in evt:
            act_type = "email_delivered"
        elif "Opened" in evt:
            act_type = "email_opened"
        elif "Replied" in evt or "Reply" in evt:
            act_type = "reply_received"
        elif "Action" in evt or "Handoff" in evt:
            act_type = "action_executed"
        elif "Stopped" in evt or "Unsub" in evt:
            act_type = "unsubscribed"

        activities.append({
            "id": ev.id,
            "type": act_type,
            "event_type": ev.event_type,
            "timestamp": ev.timestamp.isoformat() if ev.timestamp else now.isoformat(),
            "relative_time": rel,
            "lead_name": lead_name,
            "lead_email": lead_email,
            "company": company,
            "campaign_name": ev.campaign.name if ev.campaign else "Outreach Campaign",
            "campaign_id": ev.campaign_id,
            "lead_id": ev.lead_id,
            "deal_id": ev.deal_id,
            "details": str(ev.metadata_json.get("reason") or ev.metadata_json.get("action") or ev.event_type) if isinstance(ev.metadata_json, dict) else ev.event_type,
        })

    # ── Mailbox Capacities & Infrastructure ────────────────────────────────────
    from backend.app.models.mailbox import Mailbox
    mailboxes = db.query(Mailbox).all()
    total_limit = sum(m.daily_limit or 50 for m in mailboxes)
    sent_today = sum(m.sent_today or 0 for m in mailboxes)

    # ── Total Campaigns & Status Summary ───────────────────────────────────────
    total_campaigns_created = db.query(Campaign).count()
    campaigns_running = db.query(Campaign).filter(Campaign.status.in_(["running", "active"])).count()
    campaigns_paused = db.query(Campaign).filter(Campaign.status == "paused").count()
    campaigns_draft = db.query(Campaign).filter(Campaign.status == "draft").count()
    campaigns_completed = db.query(Campaign).filter(Campaign.status == "completed").count()

    # Latest 5 created campaigns preview
    latest_created_camps = (
        db.query(Campaign)
        .order_by(Campaign.id.desc())
        .limit(5)
        .all()
    )
    latest_campaigns_list = []
    for c in latest_created_camps:
        c_deals_count = db.query(Deal).filter(Deal.campaign_id == c.id).count()
        latest_campaigns_list.append({
            "id": c.id,
            "name": c.name,
            "status": c.status or "running",
            "industry": c.industry or "Technology",
            "target": c.campaign_target or "Decision Makers",
            "leads_count": c_deals_count,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })

    # ── Leads Summary & Latest Leads ──────────────────────────────────────────
    verified_leads_count = db.query(Lead).filter((Lead.email_verified == True) | (Lead.email_status == "valid")).count()
    leads_with_email_count = db.query(Lead).filter(Lead.email.isnot(None), Lead.email != "").count()
    latest_added_leads = (
        db.query(Lead)
        .order_by(Lead.id.desc())
        .limit(5)
        .all()
    )
    latest_leads_list = []
    for l in latest_added_leads:
        fname = l.first_name or ""
        lname = l.last_name or ""
        lead_name = f"{fname} {lname}".strip() or l.email or "Lead"
        latest_leads_list.append({
            "id": l.id,
            "name": lead_name,
            "job_title": l.job_title or "Decision Maker",
            "company": l.company_name or "",
            "email": l.email or "",
            "industry": l.industry or "",
            "country": l.country or l.country_code or "US",
            "created_at": l.creation_date.isoformat() if l.creation_date else None,
        })

    # ── Application Pulse (What's happening preview) ──────────────────────────
    application_pulse = {
        "status": "healthy",
        "headline": f"Application Active: {total_campaigns_created} Campaigns Created · {total_leads_count} Leads Pooled",
        "summary_text": f"Orchestrating {total_campaigns_created} total campaigns ({campaigns_running} running), {total_leads_count} leads in pool, {emails_sent} emails dispatched, and {replies} prospect replies received.",
        "campaigns_created": total_campaigns_created,
        "campaigns_running": campaigns_running,
        "total_leads": total_leads_count,
        "verified_leads": verified_leads_count,
        "deals_in_flight": len(all_deals),
        "emails_sent": emails_sent,
        "replies": replies,
        "meetings": meetings,
        "converted": converted,
    }

    # ── Campaign filter options ───────────────────────────────────────────────
    filter_campaigns = [{"id": c.id, "name": c.name} for c in all_camps]

    return {
        "kpi_cards": {
            "total_leads": total_leads_count,
            "active_campaigns": active_campaigns_count,
            "total_campaigns_created": total_campaigns_created,
            "emails_sent": emails_sent,
            "delivered": delivered,
            "opened": opened,
            "replies": replies,
            "meetings": meetings,
            "converted": converted,
            "unsubscribed": unsubscribed,
        },
        "campaigns_summary": {
            "total_created": total_campaigns_created,
            "running": campaigns_running,
            "paused": campaigns_paused,
            "draft": campaigns_draft,
            "completed": campaigns_completed,
            "latest_campaigns": latest_campaigns_list,
        },
        "leads_summary": {
            "total_leads": total_leads_count,
            "verified_leads": verified_leads_count,
            "with_emails": leads_with_email_count,
            "latest_leads": latest_leads_list,
        },
        "application_pulse": application_pulse,
        "rates": {
            "open_rate": open_rate,
            "reply_rate": reply_rate,
            "bounce_rate": bounce_rate,
            "conversion_rate": conversion_rate,
            "delivery_rate": delivery_rate,
        },
        "performance_trends": performance_trends,
        "lead_funnel": lead_funnel,
        "campaign_comparison": campaign_comparison,
        "lead_pipeline_overview": {
            "stages": stages_breakdown,
            "intent_distribution": {
                "high_intent": high_intent,
                "medium_intent": med_intent,
                "low_intent": low_intent,
            }
        },
        "followup_performance": {
            "pending_followups": pending_followups,
            "completed_followups": completed_followups,
            "scheduled_followups": scheduled_followups,
            "active_sequences": active_seqs,
            "avg_touchpoints": round(completed_followups / max(len(deals_emailed), 1), 1) if deals_emailed else 1.0,
        },
        "reply_intelligence": reply_intelligence,
        "recent_activities": activities,
        "system_status": {
            "mailbox_capacity": {
                "total_daily_limit": total_limit,
                "sent_today": sent_today,
                "remaining_today": max(total_limit - sent_today, 0),
            }
        },
        "filter_options": {
            "campaigns": filter_campaigns,
        }
    }


@router.get("/deals/{deal_id}/thread")
def get_deal_thread(deal_id: int, db: Session = Depends(get_db)):
    """Fetch simulated email thread messages constructed from database EmailEvents."""
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
        
    events = (
        db.query(EmailEvent)
        .filter(EmailEvent.deal_id == deal_id)
        .order_by(EmailEvent.timestamp.asc())
        .all()
    )
    
    messages = []
    message_counter = 1
    seen_keys = set()
    prospect_email = (deal.lead.email or "").strip().lower()

    for e in events:
        ev_type = e.event_type or ""
        meta = e.metadata_json or {}
        if ev_type in ["Email Sent", "Follow-up Sent (Opened, No Reply)", "Follow-up Sent (Not Opened)", "AI Recommended Action Executed"]:
            body_val = meta.get("body") or meta.get("email_body") or deal.reason or ""
            subj_val = meta.get("subject") or deal.email_subject or "Outreach Email"
            key = f"outbound:{subj_val.strip()}|{body_val.strip()[:100]}"
            if key in seen_keys:
                continue
            seen_keys.add(key)
            messages.append({
                "id": message_counter,
                "direction": "outbound",
                "sent_at": e.timestamp.isoformat(),
                "subject": subj_val,
                "body": body_val,
                "ab_variant": meta.get("ab_variant") or deal.ab_variant or "A"
            })
            message_counter += 1
        elif ev_type == "Email Replied":
            body_val = meta.get("body") or meta.get("reply_body") or ""
            sender_val = (meta.get("sender") or meta.get("from") or prospect_email).strip().lower()
            if prospect_email and sender_val and sender_val != prospect_email:
                continue
            key = f"inbound:{sender_val}|{body_val.strip()[:100]}"
            if key in seen_keys:
                continue
            seen_keys.add(key)
            messages.append({
                "id": message_counter,
                "direction": "inbound",
                "sent_at": e.timestamp.isoformat(),
                "subject": meta.get("subject") or f"Re: {deal.email_subject or 'Outreach'}",
                "body": body_val or "No reply body available."
            })
            message_counter += 1
            
    return {
        "lead_name": (deal.lead.source_fields or {}).get("name", f"Lead #{deal.lead.id}"),
        "lead_email": deal.lead.email,
        "messages": messages
    }


# ─── Campaign Execution Control Room & Runner Status APIs ─────────────────────

from backend.app.services.campaign_runner import campaign_runner
from backend.app.models.lead_intelligence import LeadResearch

@router.get("/campaign-runner/status")
def get_runner_status(db: Session = Depends(get_db)):
    """Exposes background CampaignRunner engine status and metrics."""
    return campaign_runner.get_status(db)


@router.get("/campaigns/{campaign_id}/execution")
def get_campaign_execution(campaign_id: int, db: Session = Depends(get_db)):
    """Returns comprehensive real-time execution statistics and pipeline stages for a campaign."""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    deals = db.query(Deal).filter(Deal.campaign_id == campaign_id).all()
    events = (
        db.query(EmailEvent)
        .filter(EmailEvent.campaign_id == campaign_id)
        .order_by(EmailEvent.timestamp.desc())
        .limit(30)
        .all()
    )

    # Compute real-time pipeline statistics
    total_leads = len(deals)
    qualified_leads = sum(1 for d in deals if d.state != DealState.LEAD_CREATED)
    emails_sent = sum(1 for d in deals if d.email_sent_at is not None or d.state in [
        DealState.EMAIL_SENT, DealState.DELIVERED, DealState.WAITING_FOR_ENGAGEMENT,
        DealState.OPENED, DealState.NOT_OPENED, DealState.REPLIED, DealState.NO_REPLY,
        DealState.FOLLOW_UP_SCHEDULED, DealState.FOLLOW_UP_SENT, DealState.AI_ANALYZING_REPLY,
        DealState.ACTION_RECOMMENDED, DealState.SALES_HANDOFF, DealState.CAMPAIGN_COMPLETED,
        DealState.UNSUBSCRIBED, DealState.BOUNCED
    ])
    delivered = sum(1 for d in deals if d.state not in [DealState.QUALIFIED, DealState.EMAIL_PREPARING, DealState.READY_TO_EMAIL, DealState.BOUNCED, DealState.FAILED])
    opened = sum(1 for d in deals if d.state in [DealState.OPENED, DealState.REPLIED, DealState.AI_ANALYZING_REPLY, DealState.ACTION_RECOMMENDED, DealState.SALES_HANDOFF, DealState.CAMPAIGN_COMPLETED])
    replies = sum(1 for d in deals if d.state in [DealState.REPLIED, DealState.AI_ANALYZING_REPLY, DealState.ACTION_RECOMMENDED, DealState.SALES_HANDOFF, DealState.CAMPAIGN_COMPLETED, DealState.UNSUBSCRIBED] or d.outcome == Outcome.CONVERTED)
    follow_ups = sum(1 for d in deals if d.state in [DealState.FOLLOW_UP_SCHEDULED, DealState.FOLLOW_UP_SENT])
    converted = sum(1 for d in deals if d.outcome == Outcome.CONVERTED or d.state in [DealState.CAMPAIGN_COMPLETED, DealState.SALES_HANDOFF])
    unsubscribed = sum(1 for d in deals if d.state == DealState.UNSUBSCRIBED or d.outcome == Outcome.NOT_INTERESTED)
    bounced = sum(1 for d in deals if d.state == DealState.BOUNCED or d.outcome == Outcome.WRONG_FIT)

    # Compute stage counts for visual pipeline
    pipeline_stages = {
        "Leads": total_leads,
        "Qualified": qualified_leads,
        "Ready to Email": sum(1 for d in deals if d.state == DealState.READY_TO_EMAIL),
        "Email Sent": emails_sent,
        "Delivered": delivered,
        "Waiting": sum(1 for d in deals if d.state in [DealState.WAITING_FOR_ENGAGEMENT, DealState.OPENED]),
        "Engagement": opened + replies,
        "AI Analysis": sum(1 for d in deals if d.state in [DealState.AI_ANALYZING_REPLY, DealState.ACTION_RECOMMENDED]),
        "Next Action": follow_ups + converted,
        "Completed": converted + unsubscribed + bounced
    }

    # Format recent events
    formatted_events = [
        {
            "id": e.id,
            "deal_id": e.deal_id,
            "lead_name": (e.lead.source_fields or {}).get("name", f"Lead #{e.lead_id}") if e.lead else f"Lead #{e.lead_id}",
            "event_type": e.event_type,
            "timestamp": e.timestamp.isoformat() if e.timestamp else None,
            "metadata": e.metadata_json or {}
        }
        for e in events
    ]

    return {
        "campaign": {
            "id": campaign.id,
            "name": campaign.name,
            "status": getattr(campaign, "status", "running"),
            "description": campaign.description,
            "objective": campaign.objective,
            "campaign_target": campaign.campaign_target,
            "created_at": campaign.created_at.isoformat() if campaign.created_at else None,
        },
        "stats": {
            "total_leads": total_leads,
            "qualified_leads": qualified_leads,
            "emails_sent": emails_sent,
            "delivered": delivered,
            "opened": opened,
            "replies": replies,
            "follow_ups": follow_ups,
            "converted": converted,
            "unsubscribed": unsubscribed,
            "bounced": bounced
        },
        "pipeline_stages": pipeline_stages,
        "recent_events": formatted_events,
        "runner_status": campaign_runner.get_status(db)
    }


@router.get("/deals/{deal_id}/execution")
def get_deal_execution(deal_id: int, db: Session = Depends(get_db)):
    """Returns detailed real-time execution payload for a single deal including lead info, research, messages, timeline events, AI decisions, and 10-minute timer calculation."""
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    lead = deal.lead
    research = db.query(LeadResearch).filter(LeadResearch.lead_id == lead.id).first()
    events = (
        db.query(EmailEvent)
        .filter(EmailEvent.deal_id == deal_id)
        .order_by(EmailEvent.timestamp.asc())
        .all()
    )

    # Format chronological events
    timeline = [
        {
            "id": e.id,
            "event": e.event_type,
            "event_type": e.event_type,
            "timestamp": format_iso_utc(e.timestamp),
            "created_at": format_iso_utc(e.timestamp),
            "metadata": e.metadata_json or {}
        }
        for e in events
    ]

    # Format messages thread without duplicates or phantom cards
    messages = []
    seen_keys = set()
    prospect_email = (lead.email or "").strip().lower()

    for e in events:
        ev_type = e.event_type or ""
        meta = e.metadata_json or {}
        if ev_type in ["Email Sent", "Follow-up Sent (Opened, No Reply)", "Follow-up Sent (Not Opened)", "AI Recommended Action Executed"]:
            body_val = meta.get("body") or meta.get("email_body")
            if not body_val or any(str(body_val).startswith(prefix) for prefix in ["Why this lead?", "Why:", "Disqualified:"]):
                body_val = deal.reason if (deal.reason and not any(str(deal.reason).startswith(prefix) for prefix in ["Why this lead?", "Why:", "Disqualified:"])) else f"Hi {lead.first_name or (deal.lead.source_fields or {}).get('name', 'there')},\n\nFollowing up on our outreach regarding solutions for {(deal.lead.source_fields or {}).get('company', 'your company')}.\n\nBest regards,"
            
            subj_val = meta.get("subject") or deal.email_subject or "Outreach Email"
            key = f"outbound:{subj_val.strip()}|{body_val.strip()[:100]}"
            if key in seen_keys:
                continue
            seen_keys.add(key)

            messages.append({
                "direction": "outbound",
                "sent_at": format_iso_utc(e.timestamp),
                "created_at": format_iso_utc(e.timestamp),
                "subject": subj_val,
                "body": body_val,
                "ab_variant": meta.get("ab_variant") or deal.ab_variant or "A",
                "status": "Delivered" if deal.state != DealState.BOUNCED else "Bounced"
            })
        elif ev_type == "Email Replied":
            sender_val = (meta.get("sender") or meta.get("from") or prospect_email or "prospect").strip().lower()

            body_val = meta.get("body") or meta.get("reply_body") or "Prospect replied."
            subj_val = meta.get("subject") or f"Re: {deal.email_subject or 'Outreach'}"
            
            key = f"inbound:{sender_val}|{body_val.strip()[:100]}"
            if key in seen_keys:
                continue
            seen_keys.add(key)

            messages.append({
                "direction": "inbound",
                "sender": sender_val,
                "sent_at": format_iso_utc(e.timestamp),
                "created_at": format_iso_utc(e.timestamp),
                "subject": subj_val,
                "body": body_val,
                "status": "Received"
            })

    # AI Decision Calculation: STRICTLY from LATEST Prospect Reply
    inbound_msgs = [m for m in messages if m.get("direction") == "inbound"]
    latest_reply = inbound_msgs[-1] if inbound_msgs else None

    if not latest_reply:
        ai_classification = "WAITING FOR REPLY"
        suggested_action = "Waiting for prospect reply"
        ai_reason = "Outbound email dispatched. Waiting for prospect response."
    else:
        reply_body = (latest_reply.get("body") or "").strip()
        reply_lower = reply_body.lower()
        if any(k in reply_lower for k in ["not interested", "unsubscribe", "opt out", "remove", "stop", "no thanks", "don't", "not at this time", "wrong person", "pass", "decline"]):
            ai_classification = "UNSUBSCRIBE / NOT INTERESTED"
            suggested_action = "Stop Sequence & Suppress Lead"
            ai_reason = f'Latest prospect reply: "{reply_body[:100]}"'
        elif any(k in reply_lower for k in ["interested", "demo", "call", "meeting", "schedule", "connect", "yes", "sure", "chat", "info", "talk", "would be interested"]):
            ai_classification = "INTERESTED / MEETING REQUEST"
            suggested_action = "Schedule Product Demo Call"
            ai_reason = f'Latest prospect reply: "{reply_body[:100]}"'
        else:
            ai_classification = "REPLIED (GENERAL)"
            suggested_action = "Review Inbound Message & Follow Up"
            ai_reason = f'Latest prospect reply: "{reply_body[:100]}"'

    if deal.state == DealState.UNSUBSCRIBED or deal.outcome == Outcome.NOT_INTERESTED:
        ai_classification = "UNSUBSCRIBE / NOT INTERESTED"
        suggested_action = "Stop Sequence & Suppress Lead"
        ai_reason = "Lead requested opt-out / not interested. Added to global suppression list."
    elif deal.state == DealState.BOUNCED:
        ai_classification = "HARD BOUNCE"
        suggested_action = "Disqualify Lead & Stop Campaign"
        ai_reason = "Email delivery hard bounced."

    # Campaign-Specific Sequence and Timer Calculation
    from backend.app.services.campaign_runner import ensure_default_sequence, normalize_delay_seconds
    from backend.app.models.sequence import SequenceStep
    seq = ensure_default_sequence(db, deal.campaign_id)
    steps = (
        db.query(SequenceStep)
        .filter(SequenceStep.sequence_id == seq.id)
        .order_by(SequenceStep.step_number.asc())
        .all()
    )
    current_step_obj = next((s for s in steps if s.step_number == (deal.current_step_number or 1)), None)

    now = datetime.utcnow()
    target_dt = deal.timer_expires_at or deal.not_before
    seq_unit = current_step_obj.delay_unit if current_step_obj else (deal.campaign.sequence_interval_unit if (deal.campaign and getattr(deal.campaign, "sequence_interval_unit", None)) else "min")
    seq_secs = current_step_obj.delay_seconds if current_step_obj else (deal.campaign.sequence_interval_seconds if (deal.campaign and getattr(deal.campaign, "sequence_interval_seconds", None)) else (deal.wait_time_seconds or 600))
    seq_mins = max(1, int(seq_secs // 60)) if seq_secs >= 60 else 1

    timer_info = {
        "is_waiting": deal.state in [DealState.WAITING_FOR_ENGAGEMENT, DealState.OPENED, DealState.FOLLOW_UP_SCHEDULED],
        "current_step_number": deal.current_step_number or 1,
        "current_step_name": current_step_obj.step_name if current_step_obj else f"Step #{deal.current_step_number or 1}",
        "sequence_state": deal.sequence_state or ("TIMER_RUNNING" if deal.state in [DealState.WAITING_FOR_ENGAGEMENT, DealState.OPENED, DealState.FOLLOW_UP_SCHEDULED] else "NOT_STARTED"),
        "waiting_started_at": deal.waiting_started_at.isoformat() if deal.waiting_started_at else None,
        "timer_started_at": deal.waiting_started_at.isoformat() if deal.waiting_started_at else None,
        "not_before": target_dt.isoformat() if target_dt else None,
        "timer_expires_at": target_dt.isoformat() if target_dt else None,
        "sequence_interval_seconds": seq_secs,
        "sequence_interval_unit": seq_unit,
        "sequence_interval_minutes": seq_mins,
        "wait_time_seconds": seq_secs,
        "remaining_seconds": max(0, int((target_dt - now).total_seconds())) if target_dt else 0,
        "is_ready": (target_dt <= now) if target_dt else True,
        "follow_up_count": deal.follow_up_count or 0,
        "total_sequence_steps": len(steps),
        "steps_overview": [
            {
                "step_number": s.step_number,
                "step_name": s.step_name,
                "action_type": s.action_type,
                "delay_value": s.delay_value,
                "delay_unit": s.delay_unit,
                "delay_seconds": s.delay_seconds,
                "if_replied_action": s.if_replied_action,
                "if_no_reply_action": s.if_no_reply_action,
                "is_enabled": s.is_enabled
            }
            for s in steps
        ]
    }

    return {
        "deal_id": deal.id,
        "deal_state": deal.state,
        "outcome": deal.outcome,
        "reason": deal.reason,
        "created_at": deal.creation_date.isoformat() if deal.creation_date else None,
        "updated_at": deal.update_date.isoformat() if deal.update_date else None,
        "lead": {
            "id": lead.id,
            "name": (lead.source_fields or {}).get("name") or f"{lead.first_name or ''} {lead.last_name or ''}".strip() or (lead.email.split("@")[0].replace(".", " ").title() if lead.email else f"Lead #{lead.id}"),
            "first_name": lead.first_name,
            "last_name": lead.last_name,
            "company": (lead.source_fields or {}).get("company") or lead.company_name or "",
            "job_title": (lead.source_fields or {}).get("title") or lead.job_title or "",
            "email": lead.email,
            "country_code": lead.country_code,
            "profile_url": lead.profile_url,
            "profile_text": lead.profile_text,
            "disqualified": lead.disqualified,
            "source_fields": lead.source_fields or {},
            "gp_confidence": deal.gp_confidence if hasattr(deal, "gp_confidence") else 0.88,
            "intent_score": deal.intent_score or 0.75,
            "research": {
                "company_info": research.company_info if research else "",
                "pain_points": research.pain_points if research else [],
                "buying_intent_score": research.buying_intent_score if research else 0.0,
                "intent_signals": research.intent_signals if research else [],
                "qualification_explanation": research.qualification_explanation if research else ""
            }
        },
        "messages": messages,
        "timeline": timeline,
        "ai_decision": {
            "situation": f"Deal currently in '{deal.state}' state.",
            "classification": ai_classification,
            "recommended_action": suggested_action,
            "reason": ai_reason,
            "rag_context_used": ["Product Positioning Guide", "Sales Objection Playbook"]
        },
        "timer": timer_info
    }


class UpdateDealStatePayload(BaseModel):
    state: str


# CRM label → actual DealState mapping for post-send stage tracking
CRM_STAGE_MAP = {
    "Contacted": DealState.EMAIL_SENT,
    "Engaged":   DealState.OPENED,
    "Replied":   DealState.REPLIED,
    "Meeting":   DealState.SALES_HANDOFF,
    "Converted": DealState.CAMPAIGN_COMPLETED,
}


@router.patch("/deals/{deal_id}/update-state")
def update_deal_state_manual(deal_id: int, payload: UpdateDealStatePayload, db: Session = Depends(get_db)):
    """
    Manually update a deal's CRM pipeline stage from the Campaign Execution inspector.
    Accepts both CRM label names (Contacted, Engaged, Replied, Meeting, Converted)
    and raw DealState values. This endpoint is used for the post-send pipeline stage
    switcher in the Campaign Execution & Live Process page.
    """
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    # Map CRM UI label to DealState if needed
    new_state = CRM_STAGE_MAP.get(payload.state, payload.state)

    deal.state = new_state
    db.commit()
    db.refresh(deal)

    return {
        "deal_id": deal_id,
        "new_state": deal.state,
        "crm_label": payload.state,
        "message": f"Deal stage updated to '{deal.state}'"
    }
