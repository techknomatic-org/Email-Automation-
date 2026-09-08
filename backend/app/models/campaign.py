from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, JSON, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), unique=True, index=True, nullable=False)
    description = Column(Text, default="")
    objective = Column(Text, default="")
    product_docs = Column(Text, default="")
    campaign_target = Column(Text, default="")
    booking_link = Column(String(500), default="")
    is_freemium = Column(Boolean, default=False)
    country_code = Column(String(2), default="")
    industry = Column(String(500), default="", nullable=True)  # Optional industry field for campaign targeting
    headcount_min = Column(Integer, default=1)
    headcount_max = Column(Integer, default=10000)
    anchor_profiles = Column(JSON, default=list)
    status = Column(String(50), default="running")  # draft, running, paused, completed, stopped
    sequence_interval_minutes = Column(Integer, default=10)  # Configurable sequence cadence wait timer (mins)
    sequence_interval_seconds = Column(Integer, default=600) # Configurable sequence cadence wait timer (secs)
    sequence_interval_unit = Column(String(20), default="min") # "sec", "min", "hr", "day"
    campaign_targeting = Column(JSON, default=dict)  # Cached AI-extracted targeting criteria JSON
    created_at = Column(DateTime, default=datetime.utcnow)

    deals = relationship("Deal", back_populates="campaign", cascade="all, delete-orphan")
    sequences = relationship("Sequence", back_populates="campaign", cascade="all, delete-orphan")


class Keyword(Base):
    __tablename__ = "keywords"

    id = Column(Integer, primary_key=True, index=True)
    field = Column(String(32), nullable=False)
    token = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("field", "token", name="uniq_keyword"),
    )


class QueryNode(Base):
    __tablename__ = "query_nodes"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=True)
    parent_id = Column(Integer, ForeignKey("query_nodes.id", ondelete="SET NULL"), nullable=True)
    state = Column(String(32), default="frontier")
    level = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    leads = relationship("Lead", back_populates="discovered_by_node")
