from sqlalchemy import Column, Integer, String
from backend.app.core.database import Base

class SiteConfig(Base):
    __tablename__ = "site_config"

    id = Column(Integer, primary_key=True, index=True, default=1)
    ai_model = Column(String(200), default="openai:gpt-4o-mini")
    llm_api_key = Column(String(500), default="")
    llm_api_base = Column(String(500), default="")
    lead_discovery_provider = Column(String(100), default="web_search")
    web_search_api_key = Column(String(500), default="")
    apollo_api_key = Column(String(500), default="")
    bettercontact_api_key = Column(String(500), default="")
    contacts_api_token = Column(String(500), default="")
    contacts_api_url = Column(String(500), default="")
    country_code = Column(String(2), default="")
    meeting_link = Column(String(500), default="https://meet.google.com/your-meeting-id")
