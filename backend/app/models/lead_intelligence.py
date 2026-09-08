from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, JSON, Boolean
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class LeadResearch(Base):
    __tablename__ = "lead_research"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False)
    company_info = Column(Text, default="")
    pain_points = Column(JSON, default=list)
    buying_intent_score = Column(Float, default=0.0)
    intent_signals = Column(JSON, default=list)
    qualification_explanation = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    lead = relationship("Lead", back_populates="research")


class NextBestAction(Base):
    __tablename__ = "next_best_actions"

    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id", ondelete="CASCADE"), nullable=False)
    recommended_action = Column(String(100), nullable=False)
    confidence_score = Column(Float, default=0.90)
    reasoning = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class Suppression(Base):
    __tablename__ = "suppressions"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(200), unique=True, index=True, nullable=False)
    reason = Column(String(100), default="unsubscribed")
    created_at = Column(DateTime, default=datetime.utcnow)
