from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime

from backend.app.core.database import get_db
from backend.app.models.lead import Lead
from backend.app.schemas.lead import (
    LeadCreate, LeadUpdate, LeadResponse,
    DuplicateCheckRequest, DuplicateActionPayload
)
from backend.app.services.lead_deduplication import LeadDeduplicationService

router = APIRouter(prefix="/leads", tags=["Leads"])

@router.get("")
def list_leads(
    campaign_id: Optional[int] = None,
    source: Optional[str] = None,
    skip: int = 0,
    limit: int = 10000,
    db: Session = Depends(get_db)
):
    """List leads from Master Lead Database with optional filtering by campaign or source."""
    query = db.query(Lead).filter(Lead.disqualified == False)

    if campaign_id:
        from backend.app.models.deal import Deal
        deals = db.query(Deal).filter(Deal.campaign_id == campaign_id).all()
        lead_ids = [d.lead_id for d in deals]
        query = query.filter(Lead.id.in_(lead_ids))

    if source and source.strip():
        query = query.filter(Lead.source.ilike(f"%{source.strip()}%"))

    return query.order_by(Lead.id.desc()).offset(skip).limit(limit).all()


@router.post("/reset-master-db")
@router.post("/reset-master-db/")
@router.delete("/reset-master-db")
@router.delete("/reset-master-db/")
def reset_master_database(db: Session = Depends(get_db)):
    """
    Purge all Master Database lead records permanently.
    """
    try:
        from backend.app.models.deal import Deal
        from backend.app.models.lead_intelligence import LeadResearch, Suppression
        from backend.app.models.email_event import EmailEvent

        db.query(Deal).delete(synchronize_session=False)
        db.query(LeadResearch).delete(synchronize_session=False)
        db.query(Suppression).delete(synchronize_session=False)
        try:
            db.query(EmailEvent).delete(synchronize_session=False)
        except Exception:
            pass

        deleted_count = db.query(Lead).delete(synchronize_session=False)
        db.commit()
        return {
            "success": True,
            "message": "Master Database successfully reset.",
            "total_profiles": 0,
            "deleted_count": deleted_count
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to reset Master Database: {str(e)}")


@router.post("/check-duplicate")
@router.post("/check-duplicate/")
def check_lead_duplicate_api(payload: DuplicateCheckRequest, db: Session = Depends(get_db)):
    """API endpoint to check if an incoming profile is a duplicate in the Master Database."""
    return LeadDeduplicationService.check_duplicate(db, payload.model_dump())


@router.post("/duplicate-action")
@router.post("/duplicate-action/")
def execute_duplicate_action_api(payload: DuplicateActionPayload, db: Session = Depends(get_db)):
    """API endpoint to execute duplicate management action (skip, update, merge, add_as_new)."""
    return LeadDeduplicationService.execute_action(
        db,
        action=payload.action,
        lead_data=payload.lead_data,
        existing_lead_id=payload.existing_lead_id
    )


@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
def create_lead(payload: LeadCreate, db: Session = Depends(get_db)):
    """Create a new manual profile or import profile into the Master Lead Database."""
    data = payload.model_dump()
    
    raw_email = (data.get("email") or "").strip().lower()
    if raw_email:
        data["email"] = raw_email
        existing = db.query(Lead).filter(Lead.email.ilike(raw_email)).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A profile with this email already exists in the Master Database."
            )

    if not data.get("source") or data.get("source") in ["Manual Entry", "MANUAL_ENTRY"]:
        data["source"] = "MANUAL_ENTRY"
        data["source_type"] = "MANUAL_ENTRY"
        data["data_source"] = "Master Database"

    res = LeadDeduplicationService._create_new_profile(db, data)
    return res["lead"]



@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    """Get lead details by ID."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.put("/{lead_id}", response_model=LeadResponse)
def update_lead(lead_id: int, payload: LeadUpdate, db: Session = Depends(get_db)):
    """Update existing lead profile in Master Lead Database."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None and hasattr(lead, key):
            setattr(lead, key, value)

    lead.update_date = datetime.utcnow()
    db.commit()
    db.refresh(lead)
    return lead


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(lead_id: int, db: Session = Depends(get_db)):
    """Delete a lead profile from Master Lead Database."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    db.delete(lead)
    db.commit()
    return None


@router.post("/search")
def search_leads_api(payload: dict, db: Session = Depends(get_db)):
    """Dynamic hybrid lead search engine endpoint over Master Lead Database."""
    from backend.app.services.hybrid_search_engine import hybrid_search_engine
    from backend.app.services.campaign_intelligence import CampaignSearchStrategy

    query_text = payload.get("query_text", "")
    strategy = CampaignSearchStrategy(
        department=payload.get("department", []),
        job_title_keywords=payload.get("job_titles", payload.get("roles", [])),
        seniority=payload.get("seniority", []),
        country=payload.get("country", []),
        industry_list=payload.get("industry", [])
    )
    
    results = hybrid_search_engine.search(db, strategy, query_text=query_text, limit=payload.get("limit", 100))
    formatted = []
    for r in results:
        l = r["lead"]
        formatted.append({
            "id": l.id,
            "first_name": l.first_name,
            "last_name": l.last_name,
            "name": f"{l.first_name or ''} {l.last_name or ''}".strip() or l.profile_url,
            "job_title": l.job_title,
            "department": l.department,
            "seniority": l.seniority,
            "company_name": l.company_name,
            "industry": l.industry,
            "country": l.country,
            "email": l.email,
            "source": l.source or "Master Database",
            "relevance_score": r["score"],
            "explanation": r["explanation"],
            "why_reasons": r["why_reasons"]
        })
    return {"leads": formatted, "total": len(formatted)}
