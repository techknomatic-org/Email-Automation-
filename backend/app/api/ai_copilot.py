from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from backend.app.core.database import get_db
from backend.app.agents.outreach_agent import copilot_agent, lead_research_agent, reply_agent, nba_engine
from backend.app.models.lead import Lead
from backend.app.models.deal import Deal
from backend.app.models.lead_intelligence import LeadResearch, NextBestAction

router = APIRouter(prefix="/copilot", tags=["AI Copilot & Lead 360"])

from typing import Optional, Dict, Any

class CopilotPlanRequest(BaseModel):
    product_docs: Optional[str] = ""
    target_prompt: Optional[str] = ""
    csv_filename: Optional[str] = None
    csv_context: Optional[Any] = None

class ReplyClassifyRequest(BaseModel):
    inbound_email_body: Optional[str] = ""

class DatasetAccuracyRequest(BaseModel):
    target_prompt: Optional[str] = ""
    seniorities: Optional[list[str]] = None
    keywords: Optional[list[str]] = None
    departments: Optional[list[str]] = None
    industries: Optional[list[str]] = None
    locations: Optional[list[str]] = None
    csv_filename: Optional[str] = None


@router.post("/generate-plan")
async def generate_campaign_plan(payload: CopilotPlanRequest):
    try:
        plan = await copilot_agent.generate_plan(
            payload.product_docs,
            payload.target_prompt,
            csv_context=payload.csv_context,
            csv_filename=payload.csv_filename
        )
        return plan
    except Exception as e:
        print(f"[Copilot API] Error generating plan: {e}")
        return copilot_agent._dynamic_input_parser(
            payload.product_docs,
            payload.target_prompt,
            csv_context=payload.csv_context
        )


@router.post("/dataset-accuracy")
def get_dataset_accuracy_endpoint(payload: DatasetAccuracyRequest, db: Session = Depends(get_db)):
    """Calculate dynamic Dataset Match Accuracy breakdown live from actual PostgreSQL lead data."""
    from backend.app.services.lead_discovery_service import calculate_dataset_accuracy
    return calculate_dataset_accuracy(
        db,
        target_prompt=payload.target_prompt,
        seniorities=payload.seniorities,
        keywords=payload.keywords,
        departments=payload.departments,
        industries=payload.industries,
        locations=payload.locations,
        csv_filename=payload.csv_filename
    )


@router.get("/lead-360/{lead_id}")
async def get_lead_360(lead_id: int, campaign_target: Optional[str] = "B2B Technology", db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Run or fetch existing 360 research
    if not lead.research:
        res = await lead_research_agent.analyze_lead(lead.profile_text or lead.profile_url, campaign_target)
        research_row = LeadResearch(
            lead_id=lead.id,
            company_info=res.company_summary,
            buying_intent_score=res.buying_intent_score,
            intent_signals=res.intent_signals,
            pain_points=res.pain_points,
            qualification_explanation=res.reason_for_contact
        )
        db.add(research_row)
        db.commit()
        db.refresh(lead)

    deal = db.query(Deal).filter(Deal.lead_id == lead.id).first()
    nba = nba_engine.compute_action(
        deal_state=deal.state if deal else "Qualified",
        intent_score=lead.research.buying_intent_score if lead.research else 0.8
    )

    return {
        "lead": {
            "id": lead.id,
            "profile_url": lead.profile_url,
            "email": lead.email,
            "country_code": lead.country_code
        },
        "research": {
            "company_summary": lead.research.company_info,
            "buying_intent_score": lead.research.buying_intent_score,
            "intent_signals": lead.research.intent_signals,
            "pain_points": lead.research.pain_points,
            "qualification_explanation": lead.research.qualification_explanation
        },
        "next_best_action": nba
    }

@router.post("/classify-reply")
async def classify_reply(payload: ReplyClassifyRequest):
    res = await reply_agent.classify_reply(payload.inbound_email_body)
    return res
