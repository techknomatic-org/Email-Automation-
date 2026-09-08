from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float, JSON
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Sequence(Base):
    __tablename__ = "sequences"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), default="Default Sequence", nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    campaign = relationship("Campaign", back_populates="sequences")
    steps = relationship("SequenceStep", back_populates="sequence", cascade="all, delete-orphan", order_by="SequenceStep.step_number")


class SequenceStep(Base):
    __tablename__ = "sequence_steps"

    id = Column(Integer, primary_key=True, index=True)
    sequence_id = Column(Integer, ForeignKey("sequences.id", ondelete="CASCADE"), nullable=False)
    step_number = Column(Integer, nullable=False)
    step_name = Column(String(100), default="Follow-up Step")
    action_type = Column(String(50), default="send_followup")  # "send_initial_email", "send_followup"
    delay_value = Column(Integer, default=10)
    delay_unit = Column(String(20), default="min")  # "sec", "min", "hr", "day"
    delay_seconds = Column(Integer, default=600)    # Normalized calculated seconds
    condition_type = Column(String(50), default="did_receiver_reply")  # "did_receiver_reply", "no_reply"
    if_replied_action = Column(String(50), default="sales_handoff")  # "sales_handoff", "schedule_demo", "ai_reply", "mark_completed", "stop_sequence"
    if_no_reply_action = Column(String(50), default="send_followup")  # "send_followup", "mark_completed", "stop_sequence"
    custom_instructions = Column(Text, default="")
    subject_template = Column(String(300), default="")
    body_template = Column(Text, default="")
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    sequence = relationship("Sequence", back_populates="steps")



class ABExperiment(Base):
    __tablename__ = "ab_experiments"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    status = Column(String(32), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)

    variants = relationship("ABVariant", back_populates="experiment", cascade="all, delete-orphan")


class ABVariant(Base):
    __tablename__ = "ab_variants"

    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("ab_experiments.id", ondelete="CASCADE"), nullable=False)
    variant_name = Column(String(50), nullable=False)
    subject_line = Column(String(300), default="")
    prompt_instructions = Column(Text, default="")
    sends = Column(Integer, default=0)
    opens = Column(Integer, default=0)
    replies = Column(Integer, default=0)
    conversions = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    experiment = relationship("ABExperiment", back_populates="variants")
