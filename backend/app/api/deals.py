from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from backend.app.core.database import get_db
from backend.app.models.deal import Deal
from backend.app.schemas.deal import DealCreate, DealUpdate, DealResponse
from backend.app.agents.outreach_agent import outreach_agent

router = APIRouter(prefix="/deals", tags=["Deals"])

@router.get("", response_model=List[DealResponse])
def list_deals(db: Session = Depends(get_db)):
    return db.query(Deal).options(joinedload(Deal.lead), joinedload(Deal.campaign)).all()

@router.post("", response_model=DealResponse, status_code=status.HTTP_201_CREATED)
def create_deal(payload: DealCreate, db: Session = Depends(get_db)):
    deal = Deal(**payload.model_dump())
    db.add(deal)
    db.commit()
    db.refresh(deal)
    return deal

@router.put("/{deal_id}", response_model=DealResponse)
def update_deal(deal_id: int, payload: DealUpdate, db: Session = Depends(get_db)):
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(deal, key, value)
    db.commit()
    db.refresh(deal)
    return deal

@router.post("/{deal_id}/generate-opener")
async def generate_deal_opener(deal_id: int, db: Session = Depends(get_db)):
    deal = db.query(Deal).options(joinedload(Deal.lead), joinedload(Deal.campaign)).filter(Deal.id == deal_id).first()
    if not deal or not deal.lead or not deal.campaign:
        raise HTTPException(status_code=404, detail="Deal, lead, or campaign not found")
    
    lead_source = deal.lead.source_fields or {}
    lead_name = lead_source.get("name") or f"{deal.lead.first_name or ''} {deal.lead.last_name or ''}".strip() or f"Lead #{deal.lead.id}"
    company = lead_source.get("company") or deal.lead.company_name or "Target Company"
    lead_title = lead_source.get("title") or deal.lead.job_title or ""
    lead_industry = lead_source.get("industry") or deal.lead.industry or ""

    draft = await outreach_agent.generate_opener(
        product_docs=deal.campaign.product_docs or "",
        target_market=deal.campaign.campaign_target or "",
        lead_name=lead_name,
        company=company,
        profile_text=deal.lead.profile_text or "",
        campaign_name=deal.campaign.name or "",
        campaign_description=deal.campaign.description or "",
        lead_title=lead_title,
        lead_industry=lead_industry
    )
    deal.email_subject = draft.subject
    deal.reason = draft.body
    db.commit()
    return draft


@router.delete("/{deal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_deal(deal_id: int, db: Session = Depends(get_db)):

    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    db.delete(deal)
    db.commit()
    return None

