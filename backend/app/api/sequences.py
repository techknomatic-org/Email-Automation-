from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

from backend.app.core.database import get_db
from backend.app.models.campaign import Campaign
from backend.app.models.sequence import Sequence, SequenceStep, ABExperiment, ABVariant
from backend.app.services.campaign_runner import ensure_default_sequence, normalize_delay_seconds

router = APIRouter(prefix="/sequences", tags=["Sequences & Automation Workflows"])


class SequenceStepSchema(BaseModel):
    id: Optional[int] = None
    step_number: int = Field(default=1, description="1-indexed step order")
    step_name: str = Field(default="Follow-up Step", description="Display title for step")
    action_type: str = Field(default="send_followup", description="Action type: send_initial_email, send_followup")
    delay_value: int = Field(default=10, description="Delay duration count")
    delay_unit: str = Field(default="min", description="Unit: sec, min, hr, day")
    delay_seconds: Optional[int] = Field(default=600, description="Normalized integer seconds")
    condition_type: str = Field(default="did_receiver_reply", description="Condition to evaluate")
    if_replied_action: str = Field(default="sales_handoff", description="Action if prospect replied")
    if_no_reply_action: str = Field(default="send_followup", description="Action if no reply received")
    custom_instructions: Optional[str] = Field(default="", description="Custom AI instructions for this step")
    subject_template: Optional[str] = Field(default="", description="Optional custom subject template")
    body_template: Optional[str] = Field(default="", description="Optional custom body template")
    is_enabled: bool = Field(default=True, description="Whether this step is active in sequence")


class SequenceSaveRequest(BaseModel):
    name: Optional[str] = "Default Sequence"
    is_active: bool = True
    steps: List[SequenceStepSchema] = []


def serialize_step(step: SequenceStep) -> Dict[str, Any]:
    norm_secs = step.delay_seconds if step.delay_seconds is not None else normalize_delay_seconds(step.delay_value, step.delay_unit)
    return {
        "id": step.id,
        "sequence_id": step.sequence_id,
        "step_number": step.step_number,
        "step_name": step.step_name or f"Step #{step.step_number}",
        "action_type": step.action_type or "send_followup",
        "delay_value": step.delay_value or 10,
        "delay_unit": step.delay_unit or "min",
        "delay_seconds": norm_secs,
        "condition_type": step.condition_type or "did_receiver_reply",
        "if_replied_action": step.if_replied_action or "sales_handoff",
        "if_no_reply_action": step.if_no_reply_action or "send_followup",
        "custom_instructions": step.custom_instructions or "",
        "subject_template": step.subject_template or "",
        "body_template": step.body_template or "",
        "is_enabled": step.is_enabled if step.is_enabled is not None else True,
        "created_at": step.created_at.isoformat() if step.created_at else None,
        "updated_at": step.updated_at.isoformat() if step.updated_at else None,
    }


def serialize_sequence(seq: Sequence) -> Dict[str, Any]:
    sorted_steps = sorted(seq.steps or [], key=lambda s: s.step_number)
    return {
        "id": seq.id,
        "campaign_id": seq.campaign_id,
        "name": seq.name,
        "is_active": seq.is_active,
        "created_at": seq.created_at.isoformat() if seq.created_at else None,
        "updated_at": seq.updated_at.isoformat() if seq.updated_at else None,
        "steps": [serialize_step(s) for s in sorted_steps],
        "total_steps": len(sorted_steps)
    }


@router.get("/campaign/{campaign_id}")
def get_campaign_sequence(campaign_id: int, db: Session = Depends(get_db)):
    """
    Fetches the campaign-specific sequence and all ordered steps.
    Guarantees that a campaign owns an independent sequence.
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    seq = ensure_default_sequence(db, campaign_id)
    return serialize_sequence(seq)


@router.put("/campaign/{campaign_id}")
def save_campaign_sequence(campaign_id: int, payload: SequenceSaveRequest, db: Session = Depends(get_db)):
    """
    Saves or updates the campaign-specific automation sequence and all its steps.
    Supports reordering, adding, modifying delays/units/actions, and enabling/disabling steps.
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    seq = (
        db.query(Sequence)
        .filter(Sequence.campaign_id == campaign_id, Sequence.is_active == True)
        .first()
    )
    if not seq:
        seq = Sequence(campaign_id=campaign_id, name=payload.name or "Outreach Automation Sequence")
        db.add(seq)
        db.flush()
    else:
        if payload.name:
            seq.name = payload.name
        seq.is_active = payload.is_active
        seq.updated_at = datetime.utcnow()

    # Reconcile steps
    existing_steps = {s.id: s for s in seq.steps}
    incoming_step_ids = set()

    for idx, st_payload in enumerate(payload.steps, 1):
        norm_seconds = normalize_delay_seconds(st_payload.delay_value, st_payload.delay_unit)
        st_num = st_payload.step_number if st_payload.step_number > 0 else idx

        if st_payload.id and st_payload.id in existing_steps:
            st = existing_steps[st_payload.id]
            st.step_number = st_num
            st.step_name = st_payload.step_name
            st.action_type = st_payload.action_type
            st.delay_value = st_payload.delay_value
            st.delay_unit = st_payload.delay_unit
            st.delay_seconds = norm_seconds
            st.condition_type = st_payload.condition_type
            st.if_replied_action = st_payload.if_replied_action
            st.if_no_reply_action = st_payload.if_no_reply_action
            st.custom_instructions = st_payload.custom_instructions or ""
            st.subject_template = st_payload.subject_template or ""
            st.body_template = st_payload.body_template or ""
            st.is_enabled = st_payload.is_enabled
            st.updated_at = datetime.utcnow()
            incoming_step_ids.add(st.id)
        else:
            new_st = SequenceStep(
                sequence_id=seq.id,
                step_number=st_num,
                step_name=st_payload.step_name,
                action_type=st_payload.action_type,
                delay_value=st_payload.delay_value,
                delay_unit=st_payload.delay_unit,
                delay_seconds=norm_seconds,
                condition_type=st_payload.condition_type,
                if_replied_action=st_payload.if_replied_action,
                if_no_reply_action=st_payload.if_no_reply_action,
                custom_instructions=st_payload.custom_instructions or "",
                subject_template=st_payload.subject_template or "",
                body_template=st_payload.body_template or "",
                is_enabled=st_payload.is_enabled
            )
            db.add(new_st)
            db.flush()
            incoming_step_ids.add(new_st.id)

    # Delete steps that were removed in the builder
    for s_id, s_obj in existing_steps.items():
        if s_id not in incoming_step_ids:
            db.delete(s_obj)

    # Synchronize active waiting deals for this campaign with the updated step delays
    from backend.app.models.deal import Deal, DealState
    from datetime import timedelta
    now = datetime.utcnow()
    deals = db.query(Deal).filter(
        Deal.campaign_id == campaign_id,
        Deal.state.in_([DealState.WAITING_FOR_ENGAGEMENT, DealState.OPENED, DealState.FOLLOW_UP_SCHEDULED])
    ).all()
    for deal in deals:
        step_obj = next((s for s in seq.steps if s.step_number == (deal.current_step_number or 2)), None)
        if step_obj:
            d_sec = step_obj.delay_seconds or normalize_delay_seconds(step_obj.delay_value, step_obj.delay_unit)
            deal.wait_time_seconds = d_sec
            start_t = deal.waiting_started_at or now
            deal.not_before = start_t + timedelta(seconds=d_sec)
            deal.timer_expires_at = deal.not_before
            deal.sequence_state = "TIMER_RUNNING"

    db.commit()
    db.refresh(seq)
    return serialize_sequence(seq)


@router.post("/campaign/{campaign_id}/reset-default")
def reset_campaign_sequence_default(campaign_id: int, db: Session = Depends(get_db)):
    """Resets the campaign's sequence to the standard 4-step outreach template."""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Delete existing sequence steps and sequences for this campaign
    existing_seqs = db.query(Sequence).filter(Sequence.campaign_id == campaign_id).all()
    for s in existing_seqs:
        db.query(SequenceStep).filter(SequenceStep.sequence_id == s.id).delete()
        db.delete(s)
    db.commit()

    seq = ensure_default_sequence(db, campaign_id)
    return serialize_sequence(seq)


@router.post("/campaign/{campaign_id}/steps", status_code=status.HTTP_201_CREATED)
def add_step_to_campaign(campaign_id: int, payload: SequenceStepSchema, db: Session = Depends(get_db)):
    """Appends a new step to the campaign sequence."""
    seq = ensure_default_sequence(db, campaign_id)
    highest_step = db.query(SequenceStep).filter(SequenceStep.sequence_id == seq.id).count()
    next_step_num = highest_step + 1

    norm_seconds = normalize_delay_seconds(payload.delay_value, payload.delay_unit)
    step = SequenceStep(
        sequence_id=seq.id,
        step_number=next_step_num,
        step_name=payload.step_name or f"Follow-up #{next_step_num - 1}",
        action_type=payload.action_type or "send_followup",
        delay_value=payload.delay_value or 10,
        delay_unit=payload.delay_unit or "min",
        delay_seconds=norm_seconds,
        condition_type=payload.condition_type or "did_receiver_reply",
        if_replied_action=payload.if_replied_action or "sales_handoff",
        if_no_reply_action=payload.if_no_reply_action or "send_followup",
        custom_instructions=payload.custom_instructions or "",
        subject_template=payload.subject_template or "",
        body_template=payload.body_template or "",
        is_enabled=payload.is_enabled
    )
    db.add(step)
    db.commit()
    db.refresh(step)
    return serialize_step(step)


@router.delete("/steps/{step_id}")
def delete_sequence_step(step_id: int, db: Session = Depends(get_db)):
    """Deletes a step from a sequence and renumbers remaining steps."""
    step = db.query(SequenceStep).filter(SequenceStep.id == step_id).first()
    if not step:
        raise HTTPException(status_code=404, detail="Sequence step not found")

    seq_id = step.sequence_id
    db.delete(step)
    db.commit()

    # Renumber remaining steps sequentially
    remaining = (
        db.query(SequenceStep)
        .filter(SequenceStep.sequence_id == seq_id)
        .order_by(SequenceStep.step_number.asc())
        .all()
    )
    for idx, s in enumerate(remaining, 1):
        s.step_number = idx
    db.commit()

    return {"status": "success", "message": f"Step #{step_id} deleted."}
