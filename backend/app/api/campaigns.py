from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from backend.app.core.database import get_db
from backend.app.models.campaign import Campaign
from backend.app.models.lead import Lead
from backend.app.models.deal import Deal, DealState
from backend.app.models.lead_intelligence import Suppression, LeadResearch
from backend.app.schemas.campaign import CampaignCreate, CampaignUpdate, CampaignResponse
from backend.app.services.lead_discovery_service import generate_lead_pool_for_campaign
from backend.app.services.campaign_intelligence import CampaignIntelligenceService
import time
from datetime import datetime, timedelta

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])

def run_lead_pool_background(campaign_id: int):
    try:
        from backend.app.core.database import SessionLocal
        db = SessionLocal()
        generate_lead_pool_for_campaign(db, campaign_id)
        db.close()
    except Exception as e:
        print(f"Background lead pool generation error: {e}")

@router.get("", response_model=List[CampaignResponse])
def list_campaigns(db: Session = Depends(get_db)):
    return db.query(Campaign).all()

@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
def create_campaign(payload: CampaignCreate, db: Session = Depends(get_db)):

    # Validate campaign name is not empty
    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(status_code=422, detail="Campaign name cannot be empty")

    # If duplicate name, auto-append timestamp to make it unique
    existing = db.query(Campaign).filter(Campaign.name == name).first()
    if existing:
        name = f"{name} ({int(time.time())})"

    try:
        data = payload.model_dump()
        data["name"] = name
        campaign = Campaign(**data)
        db.add(campaign)
        db.commit()
        db.refresh(campaign)

        # Generate campaign-specific Lead Pool synchronously (single thread, zero race condition)
        try:
            generate_lead_pool_for_campaign(db, campaign.id)
        except Exception as gen_err:
            db.rollback()
            print(f"Lead pool generation warning for campaign {campaign.id}: {gen_err}")

        return campaign
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to create campaign: {str(e)}")

class SequenceTimerUpdatePayload(BaseModel):
    value: Optional[float] = 10
    unit: Optional[str] = "min"
    sequence_interval_minutes: Optional[int] = None

def _calculate_total_seconds(val: float, unit: str) -> tuple[int, str]:
    u = (unit or "min").strip().lower()
    if u in ["sec", "secs", "second", "seconds", "s"]:
        tot_sec = max(1, int(val))
        clean_unit = "sec"
    elif u in ["hr", "hrs", "hour", "hours", "h"]:
        tot_sec = max(1, int(val * 3600))
        clean_unit = "hr"
    elif u in ["day", "days", "d"]:
        tot_sec = max(1, int(val * 86400))
        clean_unit = "day"
    else:  # default min
        tot_sec = max(1, int(val * 60))
        clean_unit = "min"
    return tot_sec, clean_unit

@router.put("/{campaign_id}/sequence-timer")
@router.post("/{campaign_id}/sequence-timer")
def update_campaign_sequence_timer(campaign_id: int, payload: SequenceTimerUpdatePayload, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    val = payload.value if payload.value is not None else (payload.sequence_interval_minutes if payload.sequence_interval_minutes is not None else 10)
    unit = payload.unit or "min"

    total_seconds, clean_unit = _calculate_total_seconds(float(val), unit)

    campaign.sequence_interval_seconds = total_seconds
    campaign.sequence_interval_unit = clean_unit
    campaign.sequence_interval_minutes = max(1, int(total_seconds // 60)) if total_seconds >= 60 else 1

    deals = db.query(Deal).filter(Deal.campaign_id == campaign_id).all()
    now = datetime.utcnow()
    for deal in deals:
        deal.wait_time_seconds = total_seconds
        if deal.state in [DealState.WAITING_FOR_ENGAGEMENT, DealState.OPENED, DealState.FOLLOW_UP_SCHEDULED, DealState.DELIVERED, DealState.NOT_OPENED, DealState.EMAIL_SENT]:
            deal.not_before = now + timedelta(seconds=total_seconds)
            deal.timer_expires_at = deal.not_before
            deal.waiting_started_at = now
            deal.sequence_state = "TIMER_RUNNING"

    # Synchronize Sequence Step 2 for this campaign
    from backend.app.services.campaign_runner import ensure_default_sequence
    from backend.app.models.sequence import SequenceStep
    seq = ensure_default_sequence(db, campaign_id)
    step2 = db.query(SequenceStep).filter(
        SequenceStep.sequence_id == seq.id,
        SequenceStep.step_number == 2
    ).first()
    if step2:
        step2.delay_value = int(val) if float(val).is_integer() else val
        step2.delay_unit = clean_unit
        step2.delay_seconds = total_seconds

    db.commit()
    db.refresh(campaign)
    return {
        "status": "success",
        "campaign_id": campaign.id,
        "value": val,
        "unit": clean_unit,
        "sequence_interval_seconds": campaign.sequence_interval_seconds,
        "sequence_interval_minutes": campaign.sequence_interval_minutes
    }

@router.get("/{campaign_id}", response_model=CampaignResponse)
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign

@router.put("/{campaign_id}", response_model=CampaignResponse)
def update_campaign(campaign_id: int, payload: CampaignUpdate, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(campaign, field, value)

    if ("sequence_interval_minutes" in update_data and update_data["sequence_interval_minutes"] is not None) or \
       ("sequence_interval_seconds" in update_data and update_data["sequence_interval_seconds"] is not None):
        if "sequence_interval_seconds" in update_data and update_data["sequence_interval_seconds"] is not None:
            new_seconds = max(1, int(update_data["sequence_interval_seconds"]))
        else:
            new_seconds = max(1, int(update_data["sequence_interval_minutes"])) * 60

        campaign.sequence_interval_seconds = new_seconds
        campaign.sequence_interval_minutes = max(1, int(new_seconds // 60))

        # Sync all active waiting deals for this campaign
        now = datetime.utcnow()
        deals = db.query(Deal).filter(Deal.campaign_id == campaign_id).all()
        for deal in deals:
            deal.wait_time_seconds = new_seconds
            if deal.state in [DealState.WAITING_FOR_ENGAGEMENT, DealState.OPENED, DealState.FOLLOW_UP_SCHEDULED, DealState.DELIVERED, DealState.NOT_OPENED, DealState.EMAIL_SENT]:
                deal.not_before = now + timedelta(seconds=new_seconds)
                deal.timer_expires_at = deal.not_before
                deal.waiting_started_at = now
                deal.sequence_state = "TIMER_RUNNING"

        # Synchronize sequence step 2
        from backend.app.services.campaign_runner import ensure_default_sequence
        from backend.app.models.sequence import SequenceStep
        seq = ensure_default_sequence(db, campaign_id)
        step2 = db.query(SequenceStep).filter(
            SequenceStep.sequence_id == seq.id,
            SequenceStep.step_number == 2
        ).first()
        if step2:
            step2.delay_seconds = new_seconds
            step2.delay_value = new_seconds if campaign.sequence_interval_unit == "sec" else max(1, int(new_seconds // 60))

    db.commit()
    db.refresh(campaign)
    return campaign

@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    db.delete(campaign)
    db.commit()
    return None

@router.post("/{campaign_id}/control")
def control_campaign(campaign_id: int, action: str, db: Session = Depends(get_db)):
    """Control campaign execution state (start, pause, resume, stop) and its timer sequence."""
    from backend.app.services.campaign_runner import pause_campaign_timers, resume_campaign_timers, stop_campaign_timers
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    act = (action or "").strip().lower()
    if act == "start" or act == "resume":
        campaign.status = "running"
        resume_campaign_timers(campaign.id, db)
    elif act == "pause":
        campaign.status = "paused"
        pause_campaign_timers(campaign.id, db)
    elif act == "stop":
        campaign.status = "stopped"
        stop_campaign_timers(campaign.id, db)
    else:
        raise HTTPException(status_code=400, detail=f"Invalid action '{action}'. Valid actions: start, pause, resume, stop")
    
    db.commit()
    db.refresh(campaign)
    return {"status": "success", "campaign_id": campaign.id, "campaign_status": campaign.status}

@router.get("/{campaign_id}/leads")
def get_campaign_leads(campaign_id: int, db: Session = Depends(get_db)):
    """Fetch campaign-specific lead pool with fit scores, research explanation, and deal status."""
    from backend.app.services.campaign_intelligence import CampaignIntelligenceService
    from backend.app.services.lead_discovery_service import evaluate_lead_relevance, generate_lead_pool_for_campaign

    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    strategy = CampaignIntelligenceService.derive_strategy(campaign)

    deals = db.query(Deal).filter(Deal.campaign_id == campaign_id).all()
    if not deals:
        try:
            generate_lead_pool_for_campaign(db, campaign_id)
            deals = db.query(Deal).filter(Deal.campaign_id == campaign_id).all()
        except Exception as gen_err:
            db.rollback()
            print(f"Lead pool generation warning for campaign {campaign_id}: {gen_err}")

    results = []
    seen_keys = set()
    deals_modified = False

    for d in deals:
        lead = d.lead
        if not lead:
            continue
        
        # Verify deal lead relevance against current campaign strategy
        eval_res = evaluate_lead_relevance(lead, strategy)
        if not eval_res.get("is_qualified", True) and d.state not in [DealState.EMAIL_SENT, DealState.FOLLOW_UP_SENT, DealState.REPLIED, DealState.SALES_HANDOFF, "Email Sent", "Follow-up Sent", "Replied", "Sales Handoff", "Meeting Booked"]:
            db.delete(d)
            deals_modified = True
            continue

        source = lead.source_fields or {}
        lname = (source.get("name") or "").strip().lower()
        lcomp = (source.get("company") or "").strip().lower()
        dedup_key = f"{lname}|{lcomp}" if (lname and lcomp) else f"lead_{lead.id}"
        if dedup_key in seen_keys:
            continue
        seen_keys.add(dedup_key)

        # Check suppression status
        is_suppressed = False
        if lead.email:
            supp = db.query(Suppression).filter(Suppression.email == lead.email).first()
            if supp or d.state == DealState.UNSUBSCRIBED:
                is_suppressed = True

        research = lead.research

        results.append({
            "id": lead.id,
            "deal_id": d.id,
            "provider": lead.provider or source.get("provider", "apollo"),
            "provider_lead_id": lead.provider_lead_id or source.get("provider_lead_id", ""),
            "name": source.get("name") or f"{lead.first_name or ''} {lead.last_name or ''}".strip() or (lead.email.split("@")[0] if lead.email else "Prospect"),
            "email": lead.email or "Pending Enrichment",
            "email_status": source.get("verification_status", "verified" if lead.email else "unavailable"),
            "company": source.get("company") or lead.company_name or "Unknown",
            "company_domain": source.get("company_domain", ""),
            "title": source.get("title") or lead.job_title or "Executive",
            "industry": source.get("industry") or lead.industry or "SaaS",
            "location": lead.country or lead.country_code or "US",
            "profile_url": lead.profile_url,
            "source_type": lead.source or lead.source_type or source.get("source_type", "excel_import"),

            "source_url": lead.source_url or source.get("source_url") or lead.profile_url,
            "linkedin_url": source.get("linkedin_url", ""),
            "disqualified": lead.disqualified or (d.state == DealState.FAILED),
            "is_suppressed": is_suppressed,
            "fit_score": d.predictive_score or 85,
            "qualification_status": "Suppressed" if is_suppressed else ("Disqualified" if (lead.disqualified or d.state == DealState.FAILED) else "Qualified"),
            "qualification_explanation": (research.qualification_explanation if (research and research.qualification_explanation) else (d.reason if (d.reason and any(str(d.reason).startswith(p) for p in ["Why this lead?", "Why:", "Disqualified:"])) else "Matches campaign persona")),
            "deal_state": d.state
        })

    if deals_modified:
        try:
            db.commit()
        except Exception:
            db.rollback()

    return results

@router.post("/{campaign_id}/leads/discover")
@router.post("/{campaign_id}/discover-leads")
@router.post("/{campaign_id}/generate-lead-pool")
def generate_lead_pool_endpoint(campaign_id: int, db: Session = Depends(get_db)):
    """Trigger real B2B lead pool discovery for a specific campaign."""
    try:
        res = generate_lead_pool_for_campaign(db, campaign_id, refresh=True)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{campaign_id}/lead-pool-status")
def get_lead_pool_status(campaign_id: int, db: Session = Depends(get_db)):
    """Get generation metrics for the specified campaign's lead pool."""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    strategy = CampaignIntelligenceService.derive_strategy(campaign)

    deals = db.query(Deal).filter(Deal.campaign_id == campaign_id).all()
    total_matched = len(deals)
    total_dataset = db.query(Lead).count()
    suppressed = 0
    disqualified = 0
    qualified = 0

    for d in deals:
        lead = d.lead
        if not lead:
            continue
        is_supp = False
        if lead.email:
            if db.query(Suppression).filter(Suppression.email == lead.email).first():
                is_supp = True
        
        if is_supp or d.state == DealState.UNSUBSCRIBED:
            suppressed += 1
        elif (lead and lead.disqualified) or d.state == DealState.FAILED:
            disqualified += 1
        else:
            qualified += 1

    excluded = max(0, total_dataset - total_matched)

    return {
        "status": "Lead Pool Ready" if total_matched > 0 else "No Leads",
        "campaign_id": campaign.id,
        "campaign_name": campaign.name,
        "strategy": strategy.model_dump(),
        "total_discovered": total_matched,
        "relevant_count": qualified,
        "suppressed_count": suppressed,
        "disqualified_count": disqualified,
        "eligible_count": qualified,
        "dataset_stats": {
            "total": total_dataset,
            "matched": total_matched,
            "excluded": excluded,
            "qualified": qualified,
            "suppressed": suppressed,
            "disqualified": disqualified
        }
    }

@router.post("/{campaign_id}/regenerate-lead-pool")
def regenerate_lead_pool_endpoint(campaign_id: int, db: Session = Depends(get_db)):
    """Regenerate lead pool when campaign targeting changes."""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    try:
        # Clear non-emailed deals for this campaign to allow full fresh generation
        db.query(Deal).filter(
            Deal.campaign_id == campaign_id,
            Deal.state.in_([DealState.QUALIFIED, DealState.LEAD_CREATED, DealState.FAILED])
        ).delete(synchronize_session=False)
        db.commit()

        res = generate_lead_pool_for_campaign(db, campaign_id, refresh=True)
        return res
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{campaign_id}/leads/{lead_id}")
def validate_and_get_campaign_lead(campaign_id: int, lead_id: int, db: Session = Depends(get_db)):
    """
    Validate that the selected lead belongs to the campaign's Lead Pool.
    Returns 400 Bad Request if the lead is not associated with this campaign.
    """
    deal = db.query(Deal).filter(Deal.campaign_id == campaign_id, Deal.lead_id == lead_id).first()
    if not deal:
        raise HTTPException(
            status_code=400,
            detail="Selected lead is not associated with this campaign's Lead Pool."
        )

    lead = deal.lead
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    research = db.query(LeadResearch).filter(LeadResearch.lead_id == lead.id).first()
    source = lead.source_fields or {}

    return {
        "campaign_id": campaign_id,
        "deal_id": deal.id,
        "lead_id": lead.id,
        "name": source.get("name") or f"Lead #{lead.id}",
        "email": lead.email,
        "company": source.get("company") or "N/A",
        "title": source.get("title") or "Prospect",
        "industry": source.get("industry") or "SaaS",
        "location": lead.country_code or "US",
        "profile_url": lead.profile_url,
        "disqualified": lead.disqualified,
        "fit_score": deal.predictive_score or 85,
        "deal_state": deal.state.value if hasattr(deal.state, 'value') else str(deal.state),
        "explanation": (research.qualification_explanation if (research and research.qualification_explanation) else (deal.reason if (deal.reason and any(str(deal.reason).startswith(p) for p in ["Why this lead?", "Why:", "Disqualified:"])) else "Campaign target match")),
        "research": {
            "company_info": research.company_info if research else None,
            "pain_points": research.pain_points if research else [],
            "buying_intent_score": research.buying_intent_score if research else None
        } if research else None
    }


@router.post("/{campaign_id}/leads/{lead_id}/accept")
def accept_campaign_lead(campaign_id: int, lead_id: int, db: Session = Depends(get_db)):
    """Accept a lead from the Lead Pool into the Deals & Pipeline section."""
    deal = db.query(Deal).filter(Deal.campaign_id == campaign_id, Deal.lead_id == lead_id).first()
    if not deal:
        # Create a new deal if not already associated
        deal = Deal(campaign_id=campaign_id, lead_id=lead_id, state=DealState.QUALIFIED, predictive_score=88)
        db.add(deal)
    else:
        deal.state = DealState.QUALIFIED
    db.commit()
    return {"status": "success", "message": "Lead accepted into Deals & Pipeline", "deal_id": deal.id, "deal_state": deal.state}


@router.post("/{campaign_id}/accept-all-leads")
def accept_all_campaign_leads(campaign_id: int, db: Session = Depends(get_db)):
    """Accept all discovered leads from Lead Pool into Deals & Pipeline."""
    deals = db.query(Deal).filter(Deal.campaign_id == campaign_id).all()
    count = 0
    for d in deals:
        if d.state == DealState.LEAD_CREATED or d.state == "Lead Created":
            d.state = DealState.QUALIFIED
            count += 1
    db.commit()
    return {"status": "success", "message": f"Accepted {count} leads into Deals & Pipeline", "accepted_count": count}


@router.post("/{campaign_id}/accept-leads")
def accept_campaign_leads_batch(campaign_id: int, payload: dict, db: Session = Depends(get_db)):
    """Accept a batch list of lead IDs into Deals & Pipeline instantly."""
    lead_ids = payload.get("lead_ids", [])
    if not lead_ids:
        return {"status": "success", "accepted_count": 0}
    
    count = 0
    for lid in lead_ids:
        try:
            deal = db.query(Deal).filter(Deal.campaign_id == campaign_id, Deal.lead_id == lid).first()
            if not deal:
                deal = Deal(campaign_id=campaign_id, lead_id=lid, state=DealState.QUALIFIED, predictive_score=88)
                db.add(deal)
            else:
                deal.state = DealState.QUALIFIED
            count += 1
        except Exception as e:
            print(f"Error accepting lead {lid}: {e}")
    db.commit()
    return {"status": "success", "message": f"Accepted {count} leads into Deals & Pipeline", "accepted_count": count}





