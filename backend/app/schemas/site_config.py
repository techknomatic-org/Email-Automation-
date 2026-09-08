from pydantic import BaseModel, ConfigDict
from typing import Optional

class SiteConfigBase(BaseModel):
    ai_model: Optional[str] = "openai:gpt-4o-mini"
    llm_api_key: Optional[str] = ""
    llm_api_base: Optional[str] = ""
    lead_discovery_provider: Optional[str] = "web_search"
    web_search_api_key: Optional[str] = ""
    apollo_api_key: Optional[str] = ""
    bettercontact_api_key: Optional[str] = ""
    contacts_api_token: Optional[str] = ""
    contacts_api_url: Optional[str] = ""
    country_code: Optional[str] = ""
    meeting_link: Optional[str] = "https://meet.google.com/your-meeting-id"

class SiteConfigUpdate(SiteConfigBase):
    pass

class SiteConfigResponse(SiteConfigBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
