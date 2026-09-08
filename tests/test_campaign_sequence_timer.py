import datetime
from unittest.mock import patch, AsyncMock, MagicMock
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.core.database import Base
from backend.app.models.campaign import Campaign
from backend.app.models.deal import Deal, DealState, Outcome
from backend.app.models.lead import Lead
from backend.app.models.sequence import Sequence, SequenceStep
from backend.app.models.email_event import EmailEvent
from backend.app.services.campaign_runner import (
    CampaignRunner,
    normalize_delay_seconds,
    ensure_default_sequence,
    pause_campaign_timers,
    resume_campaign_timers,
    stop_campaign_timers,
)


@pytest.fixture
def db_session():
    """Create an in-memory SQLite database session with proper schema for testing."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def test_normalize_delay_seconds():
    """Test delay conversion across all supported units: sec, min, hr, day."""
    assert normalize_delay_seconds(30, "sec") == 30
    assert normalize_delay_seconds(30, "seconds") == 30
    assert normalize_delay_seconds(30, "s") == 30
    assert normalize_delay_seconds(5, "min") == 300
    assert normalize_delay_seconds(5, "minute") == 300
    assert normalize_delay_seconds(2, "hr") == 7200
    assert normalize_delay_seconds(2, "hours") == 7200
    assert normalize_delay_seconds(3, "day") == 259200
    assert normalize_delay_seconds(3, "days") == 259200
    # Fallback to minutes
    assert normalize_delay_seconds(10, "unknown") == 600


def test_ensure_default_sequence(db_session):
    """Test default sequence initialization creates an isolated sequence for each campaign."""
    camp_a = Campaign(name="Campaign Alpha", status="draft")
    camp_b = Campaign(name="Campaign Beta", status="draft")
    db_session.add_all([camp_a, camp_b])
    db_session.commit()

    seq_a = ensure_default_sequence(db_session, camp_a.id)
    seq_b = ensure_default_sequence(db_session, camp_b.id)

    assert seq_a.campaign_id == camp_a.id
    assert seq_b.campaign_id == camp_b.id
    assert seq_a.id != seq_b.id

    steps_a = db_session.query(SequenceStep).filter_by(sequence_id=seq_a.id).order_by(SequenceStep.step_number).all()
    steps_b = db_session.query(SequenceStep).filter_by(sequence_id=seq_b.id).order_by(SequenceStep.step_number).all()

    assert len(steps_a) == 4
    assert len(steps_b) == 4

    # Step 1: Initial Send
    assert steps_a[0].step_number == 1
    assert steps_a[0].action_type == "send_initial_email"
    assert steps_a[0].delay_seconds == 0

    # Step 2: First follow-up (10 min)
    assert steps_a[1].step_number == 2
    assert steps_a[1].action_type == "send_followup"
    assert steps_a[1].delay_value == 10
    assert steps_a[1].delay_unit == "min"
    assert steps_a[1].delay_seconds == 600

    # Step 3: Second follow-up (30 min)
    assert steps_a[2].step_number == 3
    assert steps_a[2].delay_value == 30
    assert steps_a[2].delay_seconds == 1800

    # Step 4: Third follow-up (2 hr)
    assert steps_a[3].step_number == 4
    assert steps_a[3].delay_value == 2
    assert steps_a[3].delay_unit == "hr"
    assert steps_a[3].delay_seconds == 7200


def test_multi_campaign_sequence_isolation(db_session):
    """Test modifying Campaign A's sequence does NOT alter Campaign B's sequence."""
    camp_a = Campaign(name="Enterprise Tech", status="running")
    camp_b = Campaign(name="SMB Retail", status="running")
    db_session.add_all([camp_a, camp_b])
    db_session.commit()

    seq_a = ensure_default_sequence(db_session, camp_a.id)
    seq_b = ensure_default_sequence(db_session, camp_b.id)

    # Customize Campaign A Step 2 to 15 seconds for rapid testing/outreach
    step2_a = db_session.query(SequenceStep).filter_by(sequence_id=seq_a.id, step_number=2).first()
    step2_a.delay_value = 15
    step2_a.delay_unit = "sec"
    step2_a.delay_seconds = 15
    step2_a.custom_instructions = "Emphasize enterprise SOC2 compliance and API reliability"
    db_session.commit()

    # Verify Campaign B Step 2 is completely unchanged
    step2_b = db_session.query(SequenceStep).filter_by(sequence_id=seq_b.id, step_number=2).first()
    assert step2_b.delay_value == 10
    assert step2_b.delay_unit == "min"
    assert step2_b.delay_seconds == 600
    assert "SOC2" not in (step2_b.custom_instructions or "")


@pytest.mark.anyio
async def test_campaign_runner_executes_followup_when_timer_expires_no_reply(db_session):
    """Test CampaignRunner triggers follow-up when timer expires and no reply was detected."""
    # Create Campaign
    camp = Campaign(name="Active Outreach Campaign", status="running")
    db_session.add(camp)
    db_session.commit()

    seq = ensure_default_sequence(db_session, camp.id)
    steps = db_session.query(SequenceStep).filter_by(sequence_id=seq.id).order_by(SequenceStep.step_number).all()

    # Create Lead
    lead = Lead(
        first_name="Alice",
        last_name="Smith",
        email="alice@techcorp.io",
        company_name="TechCorp",
        job_title="CTO",
        profile_url="https://linkedin.com/in/alicesmith",
    )
    db_session.add(lead)
    db_session.commit()

    now = datetime.datetime.utcnow()
    expired_time = now - datetime.timedelta(seconds=10)

    # Create Deal waiting on Step 2 timer that has expired
    deal = Deal(
        campaign_id=camp.id,
        lead_id=lead.id,
        state=DealState.WAITING_FOR_ENGAGEMENT,
        current_step_number=2,
        sequence_state="TIMER_RUNNING",
        waiting_started_at=expired_time - datetime.timedelta(minutes=10),
        wait_time_seconds=600,
        not_before=expired_time,
        timer_expires_at=expired_time,
        follow_up_count=0,
        email_subject="Initial outreach to TechCorp",
    )
    db_session.add(deal)
    db_session.commit()

    # Mock outreach_agent.generate_followup_email
    mock_followup = MagicMock()
    mock_followup.subject = "Re: Initial outreach to TechCorp"
    mock_followup.body = "Hi Alice, following up on our previous note."

    runner = CampaignRunner()

    with patch("backend.app.services.campaign_runner.outreach_agent.generate_followup_email", new=AsyncMock(return_value=mock_followup)):
        with patch("backend.app.services.campaign_runner.email_service.send_mailbox_email", return_value={"success": True, "message_id": "test-msg-123"}):
            await runner.evaluate_and_execute_deal(db_session, deal, seq, steps)

    db_session.refresh(deal)

    # Verify follow-up sent and state advanced to step 3
    assert deal.follow_up_count == 1
    assert deal.email_subject == "Re: Initial outreach to TechCorp"
    assert deal.current_step_number == 3
    assert deal.sequence_state == "TIMER_RUNNING"
    assert deal.state == DealState.WAITING_FOR_ENGAGEMENT
    assert deal.timer_expires_at is not None
    assert deal.timer_expires_at > datetime.datetime.utcnow()


@pytest.mark.anyio
async def test_pre_send_reply_verification_cancels_timer(db_session):
    """Test race condition protection: if reply is detected before follow-up send, timer cancels immediately."""
    camp = Campaign(name="Active Outreach", status="running")
    db_session.add(camp)
    db_session.commit()

    seq = ensure_default_sequence(db_session, camp.id)
    steps = db_session.query(SequenceStep).filter_by(sequence_id=seq.id).order_by(SequenceStep.step_number).all()

    lead = Lead(
        first_name="Bob",
        last_name="Vance",
        email="bob@refrigeration.com",
        company_name="Vance Refrigeration",
        profile_url="https://linkedin.com/in/bobvance",
    )
    db_session.add(lead)
    db_session.commit()

    now = datetime.datetime.utcnow()
    expired_time = now - datetime.timedelta(seconds=5)

    deal = Deal(
        campaign_id=camp.id,
        lead_id=lead.id,
        state=DealState.WAITING_FOR_ENGAGEMENT,
        current_step_number=2,
        sequence_state="TIMER_RUNNING",
        not_before=expired_time,
        timer_expires_at=expired_time,
    )
    db_session.add(deal)
    db_session.commit()

    # Add Email Replied event to DB (e.g. from webhook or inbox check)
    reply_event = EmailEvent(
        lead_id=lead.id,
        campaign_id=camp.id,
        deal_id=deal.id,
        event_type="Email Replied",
        metadata_json={"body": "I'm interested! Send me more details.", "subject": "Re: Solution"}
    )
    db_session.add(reply_event)
    db_session.commit()

    runner = CampaignRunner()
    await runner.evaluate_and_execute_deal(db_session, deal, seq, steps)

    db_session.refresh(deal)

    # Timer must be cancelled and state moved to Sales Handoff / Action Recommended / REPLIED
    assert deal.sequence_state == "REPLIED"
    assert deal.state in [DealState.SALES_HANDOFF, DealState.ACTION_RECOMMENDED]
    assert deal.timer_expires_at is None
    assert deal.not_before is None
    assert deal.outcome == Outcome.CONVERTED


def test_pause_resume_stop_campaign_timers(db_session):
    """Test pausing a campaign freezes remaining time, resuming recalculates expiry, and stopping cancels."""
    camp = Campaign(name="Pausable Campaign", status="running")
    db_session.add(camp)
    db_session.commit()

    seq = ensure_default_sequence(db_session, camp.id)

    lead = Lead(
        first_name="Charlie",
        email="charlie@enterprise.com",
        profile_url="https://linkedin.com/in/charlie",
    )
    db_session.add(lead)
    db_session.commit()

    now = datetime.datetime.utcnow()
    future_expiry = now + datetime.timedelta(seconds=300)  # 5 minutes remaining

    deal = Deal(
        campaign_id=camp.id,
        lead_id=lead.id,
        state=DealState.WAITING_FOR_ENGAGEMENT,
        current_step_number=2,
        sequence_state="TIMER_RUNNING",
        waiting_started_at=now,
        wait_time_seconds=300,
        not_before=future_expiry,
        timer_expires_at=future_expiry,
    )
    db_session.add(deal)
    db_session.commit()

    # 1. PAUSE CAMPAIGN
    pause_campaign_timers(camp.id, db_session)
    db_session.refresh(deal)
    assert deal.sequence_state == "PAUSED"
    assert deal.timer_expires_at is None
    assert deal.wait_time_seconds > 0

    # 2. RESUME CAMPAIGN
    resume_campaign_timers(camp.id, db_session)
    db_session.refresh(deal)
    assert deal.sequence_state == "TIMER_RUNNING"
    assert deal.timer_expires_at is not None
    assert deal.timer_expires_at > datetime.datetime.utcnow()

    # 3. STOP CAMPAIGN
    stop_campaign_timers(camp.id, db_session)
    db_session.refresh(deal)
    assert deal.sequence_state == "CANCELLED"
    assert deal.state == DealState.CAMPAIGN_STOPPED
    assert deal.timer_expires_at is None
    assert deal.not_before is None
