from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class EmailEvent(Base):
    __tablename__ = "email_events"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    deal_id = Column(Integer, ForeignKey("deals.id", ondelete="CASCADE"), nullable=False)
    message_id = Column(String(300), nullable=True)
    event_type = Column(String(100), nullable=False) # e.g. "Email Prepared", "Email Sent", "Email Opened", etc.
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    provider_event_id = Column(String(200), nullable=True)
    metadata_json = Column(JSON, default=dict)

    lead = relationship("Lead")
    campaign = relationship("Campaign")
    deal = relationship("Deal")
