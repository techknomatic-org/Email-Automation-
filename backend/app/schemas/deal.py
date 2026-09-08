from pydantic import BaseModel, ConfigDict
from typing import Optional, Any
from datetime import datetime
from backend.app.schemas.lead import LeadResponse
from backend.app.schemas.campaign import CampaignResponse

class DealBase(BaseModel):
    lead_id: int
    campaign_id: int
    state: Optional[str] = "Qualified"
    outcome: Optional[str] = ""
    reason: Optional[str] = ""
    email_subject: Optional[str] = ""

class DealCreate(DealBase):
    pass

class DealUpdate(BaseModel):
    state: Optional[str] = None
    outcome: Optional[str] = None
    reason: Optional[str] = None

class DealResponse(DealBase):
    id: int
    email_sent_at: Optional[datetime] = None
    creation_date: datetime
    not_before: Optional[datetime] = None
    timer_expires_at: Optional[datetime] = None
    waiting_started_at: Optional[datetime] = None
    wait_time_seconds: Optional[int] = 600
    current_step_number: Optional[int] = 1
    sequence_state: Optional[str] = "NOT_STARTED"
    follow_up_count: Optional[int] = 0
    last_reply_at: Optional[datetime] = None
    ab_variant: Optional[str] = "A"
    predictive_score: Optional[int] = 85
    intent_score: Optional[float] = 0.75
    lead: Optional[LeadResponse] = None
    campaign: Optional[CampaignResponse] = None

    model_config = ConfigDict(from_attributes=True)

