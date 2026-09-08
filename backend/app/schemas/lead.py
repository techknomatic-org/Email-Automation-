from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class LeadBase(BaseModel):
    # Identity & Contact
    first_name: Optional[str] = ""
    last_name: Optional[str] = ""
    email: Optional[str] = None
    phone: Optional[str] = ""
    job_title: Optional[str] = ""
    profile_url: Optional[str] = ""
    linkedin_url: Optional[str] = ""

    # Company Information
    company_name: Optional[str] = ""
    company_website: Optional[str] = ""
    company_domain: Optional[str] = ""
    industry: Optional[str] = ""
    company_info: Optional[str] = ""
    company_description: Optional[str] = ""
    headcount: Optional[int] = None
    company_size: Optional[str] = ""
    company_revenue: Optional[str] = ""
    company_founded_year: Optional[str] = ""

    # Location Information
    country: Optional[str] = ""
    country_code: Optional[str] = ""
    state: Optional[str] = ""
    city: Optional[str] = ""
    location: Optional[str] = ""
    timezone: Optional[str] = ""

    # Professional / ICP Information
    seniority: Optional[str] = ""
    department: Optional[str] = ""
    skills: Optional[List[str]] = Field(default_factory=list)
    technologies: Optional[List[str]] = Field(default_factory=list)
    keywords: Optional[List[str]] = Field(default_factory=list)
    profile_headline: Optional[str] = ""
    profile_summary: Optional[str] = ""

    # Business Information
    products_services: Optional[str] = ""
    business_model: Optional[str] = ""
    funding_stage: Optional[str] = ""
    funding_amount: Optional[str] = ""
    last_funding_date: Optional[str] = ""

    # Lead Verification
    email_status: Optional[str] = "valid"
    email_verified: Optional[bool] = True
    profile_verified: Optional[bool] = True
    company_verified: Optional[bool] = True
    data_source: Optional[str] = "Master Database"
    last_verified_at: Optional[datetime] = None

    # Lead Source / Tracking
    source: Optional[str] = "Manual Entry"
    source_file: Optional[str] = None
    source_id: Optional[str] = None
    import_batch_id: Optional[str] = None

    profile_text: Optional[str] = ""
    source_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)
    disqualified: Optional[bool] = False

class LeadCreate(LeadBase):
    pass

class LeadUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None
    profile_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    company_name: Optional[str] = None
    company_website: Optional[str] = None
    company_domain: Optional[str] = None
    industry: Optional[str] = None
    company_info: Optional[str] = None
    company_size: Optional[str] = None
    company_revenue: Optional[str] = None
    company_founded_year: Optional[str] = None
    country: Optional[str] = None
    country_code: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    location: Optional[str] = None
    timezone: Optional[str] = None
    seniority: Optional[str] = None
    department: Optional[str] = None
    skills: Optional[List[str]] = None
    technologies: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    profile_headline: Optional[str] = None
    profile_summary: Optional[str] = None
    products_services: Optional[str] = None
    business_model: Optional[str] = None
    funding_stage: Optional[str] = None
    funding_amount: Optional[str] = None
    last_funding_date: Optional[str] = None
    source: Optional[str] = None
    source_file: Optional[str] = None
    source_id: Optional[str] = None
    disqualified: Optional[bool] = None

class LeadResponse(LeadBase):
    id: int
    creation_date: Optional[datetime] = None
    update_date: Optional[datetime] = None

    class Config:
        from_attributes = True

class DuplicateCheckRequest(BaseModel):
    email: Optional[str] = None
    linkedin_url: Optional[str] = None
    profile_url: Optional[str] = None
    source_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company_name: Optional[str] = None
    job_title: Optional[str] = None

class DuplicateActionPayload(BaseModel):
    action: str  # "skip", "append", "update", "merge", "add_as_new"
    existing_lead_id: Optional[int] = None
    lead_data: Dict[str, Any]
