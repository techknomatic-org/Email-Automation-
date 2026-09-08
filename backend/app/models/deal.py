from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Float, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class DealState:
    LEAD_CREATED = "Lead Created"
    QUALIFIED = "Qualified"
    EMAIL_PREPARING = "Email Preparing"
    READY_TO_EMAIL = "Ready to Email"
    EMAIL_SENT = "Email Sent"
    DELIVERED = "Delivered"
    WAITING_FOR_ENGAGEMENT = "Waiting for Engagement"
    OPENED = "Opened"
    NOT_OPENED = "Not Opened"
    REPLIED = "Replied"
    NO_REPLY = "No Reply"
    UNSUBSCRIBED = "Unsubscribed"
    BOUNCED = "Bounced"
    FOLLOW_UP_SCHEDULED = "Follow-up Scheduled"
    FOLLOW_UP_GENERATING = "Follow-up Generating"
    FOLLOW_UP_SENDING = "Follow-up Sending"
    FOLLOW_UP_SENT = "Follow-up Sent"
    AI_ANALYZING_REPLY = "AI Analyzing Reply"
    ACTION_RECOMMENDED = "Action Recommended"
    SALES_HANDOFF = "Sales Handoff"
    CAMPAIGN_STOPPED = "Campaign Stopped"
    CAMPAIGN_COMPLETED = "Campaign Completed"
    FAILED = "Failed"

class Outcome:
    CONVERTED = "converted"
    NOT_INTERESTED = "not_interested"
    WRONG_FIT = "wrong_fit"
    NO_BUDGET = "no_budget"
    HAS_SOLUTION = "has_solution"
    BAD_TIMING = "bad_timing"
    UNRESPONSIVE = "unresponsive"
    UNKNOWN = "unknown"

class Deal(Base):
    __tablename__ = "deals"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    state = Column(String(50), default=DealState.QUALIFIED, index=True)
    outcome = Column(String(20), default="")
    reason = Column(Text, default="")
    mailbox_id = Column(Integer, ForeignKey("mailboxes.id", ondelete="SET NULL"), nullable=True)
    email_subject = Column(String(300), default="")
    email_sent_at = Column(DateTime, nullable=True)
    thread_id = Column(Integer, ForeignKey("threads.id", ondelete="SET NULL"), nullable=True)
    not_before = Column(DateTime, nullable=True, index=True)
    
    # Sequence & Automation State Fields
    current_step_number = Column(Integer, default=1)
    sequence_state = Column(String(50), default="NOT_STARTED")  # NOT_STARTED, WAITING, TIMER_RUNNING, TIMER_EXPIRED, FOLLOW_UP_GENERATING, FOLLOW_UP_SENDING, REPLIED, COMPLETED, PAUSED, CANCELLED, FAILED
    timer_started_at = Column(DateTime, nullable=True)
    timer_expires_at = Column(DateTime, nullable=True)
    last_reply_at = Column(DateTime, nullable=True)
    last_message_id = Column(String(200), nullable=True)
    follow_up_count = Column(Integer, default=0)

    # Workflow timing fields
    waiting_started_at = Column(DateTime, nullable=True)
    wait_time_seconds = Column(Integer, default=600)  # 10 minutes default
    ab_variant = Column(String(10), default="A")      # A/B Testing Variant

    # Predictive Intelligence Score
    predictive_score = Column(Integer, default=85)    # Heuristic/Rule-based out of 100
    intent_score = Column(Float, default=0.75)         # Between 0.0 and 1.0

    lookup_request_id = Column(String(64), default="")
    lookup_attempt = Column(Integer, default=0)
    profile_summary = Column(JSON, nullable=True)
    chat_summary = Column(JSON, nullable=True)
    creation_date = Column(DateTime, default=datetime.utcnow)
    update_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    lead = relationship("Lead", back_populates="deals")
    campaign = relationship("Campaign", back_populates="deals")
    mailbox = relationship("Mailbox", back_populates="deals")
    thread = relationship("Thread", back_populates="deals")

    __table_args__ = (
        UniqueConstraint("lead_id", "campaign_id", name="unique_deal_per_campaign"),
        Index("deal_state_not_before_idx", "state", "not_before"),
    )
