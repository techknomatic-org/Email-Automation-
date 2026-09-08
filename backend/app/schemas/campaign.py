from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CampaignBase(BaseModel):
    name: str
    product_docs: Optional[str] = ""
    campaign_target: Optional[str] = ""
    booking_link: Optional[str] = ""
    is_freemium: Optional[bool] = False
    country_code: Optional[str] = ""
    headcount_min: Optional[int] = 1
    headcount_max: Optional[int] = 10000
    sequence_interval_minutes: Optional[int] = 10
    sequence_interval_seconds: Optional[int] = 600
    sequence_interval_unit: Optional[str] = "min"
    campaign_targeting: Optional[dict] = None

class CampaignCreate(CampaignBase):
    pass

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    product_docs: Optional[str] = None
    campaign_target: Optional[str] = None
    booking_link: Optional[str] = None
    is_freemium: Optional[bool] = None
    country_code: Optional[str] = None
    sequence_interval_minutes: Optional[int] = None
    sequence_interval_seconds: Optional[int] = None
    sequence_interval_unit: Optional[str] = None

class CampaignResponse(CampaignBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
