import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session, joinedload
from backend.app.core.database import SessionLocal
from backend.app.models.campaign import Campaign
from backend.app.models.deal import Deal, DealState, Outcome
from backend.app.models.sequence import Sequence, SequenceStep
from backend.app.models.email_event import EmailEvent
from backend.app.models.lead import Lead
from backend.app.models.lead_intelligence import Suppression
from backend.app.models.mailbox import Mailbox
from backend.app.services.email_service import email_service
from backend.app.agents.outreach_agent import outreach_agent, reply_agent
from backend.app.services.rag_service import rag_service

logger = logging.getLogger("campaign_runner")
logger.setLevel(logging.INFO)


def normalize_delay_seconds(delay_value: int, delay_unit: str) -> int:
    """Normalizes delay value and unit into exact integer seconds."""
    val = max(1, int(delay_value or 10))
    unit = (delay_unit or "min").lower().strip()
    if unit in ["sec", "second", "seconds", "s"]:
        return val
    elif unit in ["min", "minute", "minutes", "m"]:
        return val * 60
    elif unit in ["hr", "hour", "hours", "h"]:
        return val * 3600
    elif unit in ["day", "days", "d"]:
        return val * 86400
    return val * 60


def ensure_default_sequence(db: Session, campaign_id: int) -> Sequence:
    """
    Ensures a campaign has an active Sequence and default ordered steps if none exist.
    Guarantees that every campaign owns an independent sequence.
    """
    seq = (
        db.query(Sequence)
        .filter(Sequence.campaign_id == campaign_id, Sequence.is_active == True)
        .first()
    )
    if not seq:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        camp_sec = campaign.sequence_interval_seconds if campaign and campaign.sequence_interval_seconds else 600
        camp_unit = campaign.sequence_interval_unit if campaign and campaign.sequence_interval_unit else "min"
        if camp_unit == "sec":
            step2_val = camp_sec
        elif camp_unit == "hr":
            step2_val = max(1, int(camp_sec // 3600))
        elif camp_unit == "day":
            step2_val = max(1, int(camp_sec // 86400))
        else:
            step2_val = max(1, int(camp_sec // 60))

        seq = Sequence(
            campaign_id=campaign_id,
            name="Default Outreach Automation Sequence",
            is_active=True
        )
        db.add(seq)
        db.flush()

        # Step 1: Initial Send
        step1 = SequenceStep(
            sequence_id=seq.id,
            step_number=1,
            step_name="Send Initial Email",
            action_type="send_initial_email",
            delay_value=0,
            delay_unit="min",
            delay_seconds=0,
            condition_type="none",
            if_replied_action="sales_handoff",
            if_no_reply_action="send_followup",
            is_enabled=True
        )
        # Step 2: Follow-up #1 (Configured timer delay)
        step2 = SequenceStep(
            sequence_id=seq.id,
            step_number=2,
            step_name="Follow-up #1",
            action_type="send_followup",
            delay_value=step2_val,
            delay_unit=camp_unit,
            delay_seconds=camp_sec,
            condition_type="did_receiver_reply",
            if_replied_action="sales_handoff",
            if_no_reply_action="send_followup",
            custom_instructions="Brief check-in highlighting operational efficiency and value proposition.",
            is_enabled=True
        )
        # Step 3: Follow-up #2 (Wait 30 minutes)
        step3 = SequenceStep(
            sequence_id=seq.id,
            step_number=3,
            step_name="Follow-up #2",
            action_type="send_followup",
            delay_value=30,
            delay_unit="min",
            delay_seconds=1800,
            condition_type="did_receiver_reply",
            if_replied_action="sales_handoff",
            if_no_reply_action="send_followup",
            custom_instructions="Polite follow-up inquiring if they have time for a 5-minute chat this week.",
            is_enabled=True
        )
        # Step 4: Follow-up #3 (Wait 2 hours)
        step4 = SequenceStep(
            sequence_id=seq.id,
            step_number=4,
            step_name="Follow-up #3",
            action_type="send_followup",
            delay_value=2,
            delay_unit="hr",
            delay_seconds=7200,
            condition_type="did_receiver_reply",
            if_replied_action="sales_handoff",
            if_no_reply_action="mark_completed",
            custom_instructions="Final polite check-in leaving the door open for future collaboration.",
            is_enabled=True
        )
        db.add_all([step1, step2, step3, step4])
        db.commit()
        db.refresh(seq)

    return seq


class CampaignRunner:
    """
    Persistent Backend Campaign Automation Engine.
    Executes campaign-specific timer sequences, checks reply conditions,
    automatically generates & sends follow-ups, and triggers configured next actions.
    Runs server-side in the background independently of the browser.
    """

    def __init__(self):
        self._running = False
        self._task = None
        self.last_check = None
        self.deals_evaluated_count = 0
        self.emails_processed_count = 0
        self.last_error = None
        self._processing_deal_ids = set()

    def start(self):
        if not self._running:
            self._running = True
            try:
                loop = asyncio.get_running_loop()
                self._task = loop.create_task(self._loop())
            except Exception as e:
                logger.info(f"Campaign runner start deferred: {e}")
            logger.info("Persistent Campaign background runner started.")

    def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            logger.info("Persistent Campaign background runner stopped.")

    def get_status(self, db: Session) -> Dict[str, Any]:
        try:
            active_campaigns = db.query(Campaign).filter(~Campaign.status.in_(["paused", "stopped"])).count()
        except Exception:
            active_campaigns = 0

        pending_deals = db.query(Deal).filter(
            Deal.state.in_([
                DealState.WAITING_FOR_ENGAGEMENT,
                DealState.OPENED,
                DealState.FOLLOW_UP_SCHEDULED,
                DealState.EMAIL_PREPARING,
                DealState.READY_TO_EMAIL
            ])
        ).count()

        active_timers = db.query(Deal).filter(
            Deal.state.in_([DealState.WAITING_FOR_ENGAGEMENT, DealState.OPENED, DealState.FOLLOW_UP_SCHEDULED]),
            Deal.timer_expires_at != None
        ).count()

        return {
            "status": "running" if self._running else "stopped",
            "last_check": self.last_check.isoformat() if self.last_check else datetime.utcnow().isoformat(),
            "active_campaigns": active_campaigns,
            "deals_evaluated": self.deals_evaluated_count,
            "emails_processed": self.emails_processed_count,
            "pending_deals": pending_deals,
            "active_timers": active_timers,
            "last_error": self.last_error
        }

    async def _loop(self):
        await asyncio.sleep(2)
        while self._running:
            try:
                self.last_check = datetime.utcnow()
                await self.poll_and_evaluate_deals()
            except Exception as e:
                self.last_error = str(e)
                logger.error(f"Error in campaign runner poll loop: {e}")
            await asyncio.sleep(5)  # Scan every 5 seconds

    async def poll_and_evaluate_deals(self):
        """
        Main decision cycle: Scans active campaigns and processes due timers per campaign.
        Strictly enforces campaign isolation.
        """
        db = SessionLocal()
        try:
            now = datetime.utcnow()
            # Process all campaigns unless explicitly paused or stopped
            active_campaigns = db.query(Campaign).filter(
                ~Campaign.status.in_(["paused", "stopped"])
            ).all()

            for campaign in active_campaigns:
                # Ensure sequence is initialized for this campaign
                sequence = ensure_default_sequence(db, campaign.id)
                steps = (
                    db.query(SequenceStep)
                    .filter(SequenceStep.sequence_id == sequence.id, SequenceStep.is_enabled == True)
                    .order_by(SequenceStep.step_number.asc())
                    .all()
                )
                if not steps:
                    continue

                # Query due deals specifically belonging to THIS campaign
                due_deals = (
                    db.query(Deal)
                    .options(joinedload(Deal.lead), joinedload(Deal.campaign))
                    .filter(Deal.campaign_id == campaign.id)
                    .filter(
                        Deal.state.in_([
                            DealState.WAITING_FOR_ENGAGEMENT,
                            DealState.OPENED,
                            DealState.FOLLOW_UP_SCHEDULED,
                            DealState.DELIVERED,
                            DealState.NOT_OPENED,
                            DealState.EMAIL_SENT
                        ])
                    )
                    .filter(
                        or_(
                            and_(Deal.timer_expires_at.isnot(None), Deal.timer_expires_at <= now),
                            and_(Deal.not_before.isnot(None), Deal.not_before <= now)
                        )
                    )
                    .all()
                )

                for deal in due_deals:
                    if deal.id in self._processing_deal_ids:
                        continue
                    try:
                        self._processing_deal_ids.add(deal.id)
                        await self.evaluate_and_execute_deal(db, deal, sequence, steps)
                    finally:
                        self._processing_deal_ids.discard(deal.id)

        except Exception as err:
            db.rollback()
            self.last_error = str(err)
            logger.error(f"Campaign runner evaluation error: {err}")
        finally:
            db.close()

    async def evaluate_and_execute_deal(
        self,
        db: Session,
        deal: Deal,
        sequence: Sequence,
        steps: List[SequenceStep]
    ):
        """
        Evaluates a single deal when its timer expires with concurrency & idempotency protection:
        1. Pre-execution final reply check (IMAP & database events).
        2. IF REPLIED: Cancel timer, cancel follow-up, mark REPLIED, execute configured next action.
        3. IF NO REPLY: Generate follow-up via AI with campaign/prospect context, send automatically, advance step & schedule next timer.
        """
        self.deals_evaluated_count += 1
        now = datetime.utcnow()
        lead = deal.lead
        target_email = (lead.email or "").strip().lower() if lead else ""

        logger.info(f"[CAMPAIGN #{deal.campaign_id} TIMER EXPIRED] Evaluating deal #{deal.id} ({target_email}) at step #{deal.current_step_number}")

        # Check existing events
        events = (
            db.query(EmailEvent)
            .filter(EmailEvent.deal_id == deal.id)
            .order_by(EmailEvent.timestamp.asc())
            .all()
        )
        event_types = {e.event_type for e in events}

        # ── 1. Check Global Suppression / Unsubscribed ──────────────────────────
        if "Unsubscribed" in event_types or (target_email and db.query(Suppression).filter(Suppression.email == target_email).first()):
            deal.state = DealState.CAMPAIGN_STOPPED
            deal.sequence_state = "CANCELLED"
            deal.outcome = Outcome.NOT_INTERESTED
            deal.reason = "Lead unsubscribed / globally suppressed. Follow-up sequence stopped."
            deal.timer_expires_at = None
            deal.not_before = None
            db.add(EmailEvent(
                lead_id=deal.lead_id, campaign_id=deal.campaign_id, deal_id=deal.id,
                event_type="Campaign Stopped", metadata_json={"reason": "Suppression Triggered"}
            ))
            db.commit()
            return

        # ── 2. Check Bounce ───────────────────────────────────────────────────
        if "Bounced" in event_types:
            deal.state = DealState.FAILED
            deal.sequence_state = "FAILED"
            deal.outcome = Outcome.WRONG_FIT
            deal.reason = "Email bounced. Sequence halted."
            deal.timer_expires_at = None
            deal.not_before = None
            db.add(EmailEvent(
                lead_id=deal.lead_id, campaign_id=deal.campaign_id, deal_id=deal.id,
                event_type="Campaign Stopped", metadata_json={"reason": "Bounce Detected"}
            ))
            db.commit()
            return

        # ── 3. CRITICAL: Final Pre-Execution Reply Check (IMAP & DB) ─────────
        has_replied = "Email Replied" in event_types
        latest_reply_body = ""
        latest_reply_subject = ""

        # Check IMAP if mailbox credentials exist
        if not has_replied and target_email:
            connected_mailboxes = db.query(Mailbox).filter(Mailbox.auth_type != "disconnected").all()
            if deal.mailbox_id:
                assigned_mb = db.query(Mailbox).filter(Mailbox.id == deal.mailbox_id, Mailbox.auth_type != "disconnected").first()
                if assigned_mb:
                    connected_mailboxes = [assigned_mb] + [m for m in connected_mailboxes if m.id != assigned_mb.id]

            for mb in connected_mailboxes:
                try:
                    imap_replies = email_service.check_imap_replies(
                        mailbox=mb,
                        target_email=target_email,
                        target_subject=deal.email_subject,
                        sent_after=deal.email_sent_at
                    )
                    if imap_replies and isinstance(imap_replies, list) and len(imap_replies) > 0:
                        has_replied = True
                        latest_reply_body = imap_replies[0].get("body", "")
                        latest_reply_subject = imap_replies[0].get("subject", "")
                        break
                except Exception as imap_err:
                    logger.warning(f"IMAP check during timer evaluation skipped for Mailbox #{mb.id}: {imap_err}")

        # Find current step configuration
        current_step_num = deal.current_step_number or 1
        current_step = next((s for s in steps if s.step_number == current_step_num), None)
        if not current_step and steps:
            current_step = steps[0]

        # ─── BRANCH A: PROSPECT REPLIED ───────────────────────────────────────
        if has_replied:
            logger.info(f"[TIMER CANCELLED - REPLY DETECTED] Deal #{deal.id} received reply. Converting follow-up plan into Next Action Plan.")

            # Find actual reply body if available
            effective_reply_body = latest_reply_body
            if not effective_reply_body:
                for ev in events:
                    if ev.event_type == "Email Replied":
                        meta = ev.metadata_json or {}
                        effective_reply_body = meta.get("body") or meta.get("reply_body") or ""
                        if effective_reply_body:
                            break

            if not effective_reply_body:
                effective_reply_body = "Prospect replied to email outreach."

            # Record EmailReplied event if not already present
            if "Email Replied" not in event_types:
                db.add(EmailEvent(
                    lead_id=deal.lead_id,
                    campaign_id=deal.campaign_id,
                    deal_id=deal.id,
                    event_type="Email Replied",
                    metadata_json={"body": effective_reply_body, "subject": latest_reply_subject or f"Re: {deal.email_subject or 'Outreach'}"}
                ))

            # Stop active follow-up timer & sequence
            deal.timer_expires_at = None
            deal.not_before = None
            deal.last_reply_at = now
            deal.sequence_state = "REPLIED"

            # Dynamically classify reply intent to determine Next Action Plan
            sentiment_cat = "Interested"
            suggested_action = "Schedule Product Demo Call"
            try:
                classification = await reply_agent.classify_reply(effective_reply_body)
                sentiment_cat = classification.intent_category
                suggested_action = classification.suggested_response
            except Exception as classify_err:
                logger.warning(f"Reply classification fallback: {classify_err}")
                lower_reply = effective_reply_body.lower()
                if any(k in lower_reply for k in ["not interested", "unsubscribe", "stop", "remove", "no thanks", "pass"]):
                    sentiment_cat = "Not Interested"
                    suggested_action = "Stop Sequence & Suppress Lead"
                elif any(k in lower_reply for k in ["demo", "call", "schedule", "meet", "interested", "yes", "talk", "chat"]):
                    sentiment_cat = "Meeting Request"
                    suggested_action = "Schedule Product Demo Call"
                else:
                    sentiment_cat = "Question"
                    suggested_action = "Review Inquiry & Send Contextual AI Response"

            # Convert follow-up plan into Next Action Plan based on reply classification
            if sentiment_cat in ["Unsubscribe", "Not Interested"]:
                deal.state = DealState.UNSUBSCRIBED
                deal.outcome = Outcome.NOT_INTERESTED
                deal.reason = f"Prospect Opted Out / Declined: \"{effective_reply_body[:100]}\" | Next Action: Stop Sequence & Suppress Lead"
                next_action_name = "Stop Sequence & Suppress Lead"

                # Add to global suppression
                if target_email:
                    existing_supp = db.query(Suppression).filter(Suppression.email == target_email).first()
                    if not existing_supp:
                        db.add(Suppression(email=target_email, reason="unsubscribed"))

                db.add(EmailEvent(
                    lead_id=deal.lead_id, campaign_id=deal.campaign_id, deal_id=deal.id,
                    event_type="Campaign Stopped", metadata_json={"reason": "Customer Unsubscribed / Declined"}
                ))
            elif sentiment_cat in ["Interested", "Meeting Request"]:
                deal.state = DealState.ACTION_RECOMMENDED
                deal.outcome = Outcome.CONVERTED
                deal.reason = f"Prospect Interested: \"{effective_reply_body[:100]}\" | Next Action Plan: Schedule Product Demo & Meeting Invitation"
                next_action_name = "Schedule Product Demo Call"
                
                db.add(EmailEvent(
                    lead_id=deal.lead_id, campaign_id=deal.campaign_id, deal_id=deal.id,
                    event_type="Action Recommended", metadata_json={"action": "Schedule Product Demo Call", "sentiment": sentiment_cat}
                ))
            else:
                deal.state = DealState.ACTION_RECOMMENDED
                deal.reason = f"Prospect Inquiry: \"{effective_reply_body[:100]}\" | Next Action Plan: {suggested_action}"
                next_action_name = suggested_action

                db.add(EmailEvent(
                    lead_id=deal.lead_id, campaign_id=deal.campaign_id, deal_id=deal.id,
                    event_type="Action Recommended", metadata_json={"action": suggested_action, "sentiment": sentiment_cat}
                ))

            # Log Audit Trail Events
            db.add(EmailEvent(
                lead_id=deal.lead_id,
                campaign_id=deal.campaign_id,
                deal_id=deal.id,
                event_type="Timer Cancelled - Reply Detected",
                metadata_json={
                    "step_number": current_step_num,
                    "action_executed": next_action_name,
                    "sentiment": sentiment_cat,
                    "reply_received_at": now.isoformat()
                }
            ))
            db.commit()
            return

        # ─── BRANCH B: NO REPLY -> EXECUTE AUTOMATED FOLLOW-UP ────────────────
        no_reply_action = (current_step.if_no_reply_action if current_step else "send_followup").lower()

        if no_reply_action in ["mark_completed", "stop_sequence", "stop"]:
            deal.state = DealState.CAMPAIGN_COMPLETED
            deal.sequence_state = "COMPLETED"
            deal.outcome = Outcome.UNRESPONSIVE
            deal.reason = f"Sequence completed after step #{current_step_num} with no reply."
            deal.timer_expires_at = None
            deal.not_before = None
            db.add(EmailEvent(
                lead_id=deal.lead_id,
                campaign_id=deal.campaign_id,
                deal_id=deal.id,
                event_type="Sequence Completed",
                metadata_json={"reason": "Reached sequence conclusion without reply"}
            ))
            db.commit()
            return

        # Generate & Send Follow-up
        deal.sequence_state = "FOLLOW_UP_GENERATING"
        db.commit()

        # Gather previous thread email context
        previous_emails = []
        for ev in events:
            meta = ev.metadata_json or {}
            if ev.event_type in ["Email Sent", "Follow-up Sent", "Follow-up Sent (Opened, No Reply)", "Follow-up Sent (Not Opened)", "AI Recommended Action Executed"]:
                previous_emails.append({
                    "subject": meta.get("subject") or deal.email_subject or "Outreach",
                    "body": meta.get("body") or deal.reason or "",
                    "sent_at": ev.timestamp.isoformat() if ev.timestamp else "Sent"
                })

        lead_name = (lead.source_fields or {}).get("name") or f"{lead.first_name or ''} {lead.last_name or ''}".strip() or "Prospect"
        company = (lead.source_fields or {}).get("company") or lead.company_name or "your organization"
        lead_title = (lead.source_fields or {}).get("title") or lead.job_title or "Leader"
        lead_industry = (lead.source_fields or {}).get("industry") or lead.industry or "B2B"

        step_title = current_step.step_name if current_step else f"Follow-up #{deal.follow_up_count + 1}"
        custom_inst = current_step.custom_instructions if current_step else ""

        # AI Follow-up Email Generation
        try:
            followup_draft = await outreach_agent.generate_followup_email(
                campaign_name=deal.campaign.name or "Outreach Campaign",
                campaign_description=deal.campaign.description or "",
                product_docs=deal.campaign.product_docs or deal.campaign.objective or "",
                target_market=deal.campaign.campaign_target or "",
                lead_name=lead_name,
                company=company,
                lead_title=lead_title,
                lead_industry=lead_industry,
                step_number=current_step_num,
                step_name=step_title,
                custom_instructions=custom_inst,
                previous_emails=previous_emails,
                subject_template=current_step.subject_template if current_step else "",
                body_template=current_step.body_template if current_step else ""
            )
            subj_to_send = followup_draft.subject
            body_to_send = followup_draft.body
        except Exception as gen_err:
            logger.error(f"Error generating follow-up email for deal #{deal.id}: {gen_err}")
            subj_to_send = f"Re: {deal.email_subject or 'Our conversation'}"
            body_to_send = f"Hi {lead_name.split()[0]},\n\nI wanted to follow up briefly regarding our outreach for {company}. Would you have 5 minutes this week to connect?\n\nBest regards,"

        # Send follow-up email
        deal.sequence_state = "FOLLOW_UP_SENDING"
        db.commit()

        # Find connected mailbox
        connected_mailboxes = db.query(Mailbox).filter(Mailbox.auth_type != "disconnected").all()
        if deal.mailbox_id:
            assigned_mb = db.query(Mailbox).filter(Mailbox.id == deal.mailbox_id, Mailbox.auth_type != "disconnected").first()
            if assigned_mb:
                connected_mailboxes = [assigned_mb] + [m for m in connected_mailboxes if m.id != assigned_mb.id]

        send_result = None
        for mb in connected_mailboxes:
            res = email_service.send_mailbox_email(
                mailbox=mb,
                to_address=target_email,
                subject=subj_to_send,
                body=body_to_send,
                db=db
            )
            if res and res.get("success"):
                send_result = res
                deal.mailbox_id = mb.id
                logger.info(f"[FOLLOW-UP SENT] Real email sent via Mailbox #{mb.id} ({mb.from_address}) to {target_email}")
                break
            else:
                err_text = res.get("error") if res else "Unknown error"
                logger.warning(f"Follow-up send attempt via Mailbox #{mb.id} failed: {err_text}")

        if not send_result or not send_result.get("success"):
            logger.info(f"[FOLLOW-UP NOTICE] Real send attempts failed. Falling back to simulation send for {target_email}")
            send_result = email_service.simulate_send(
                to_address=target_email,
                subject=subj_to_send,
                body=body_to_send
            )

        self.emails_processed_count += 1
        deal.email_subject = subj_to_send
        deal.reason = body_to_send
        deal.follow_up_count = (deal.follow_up_count or 0) + 1
        deal.last_message_id = send_result.get("message_id")

        # Log Follow-up Sent Event
        db.add(EmailEvent(
            lead_id=deal.lead_id,
            campaign_id=deal.campaign_id,
            deal_id=deal.id,
            event_type="Follow-up Sent",
            metadata_json={
                "subject": subj_to_send,
                "body": body_to_send,
                "recipient": target_email,
                "step_number": current_step_num,
                "step_name": step_title,
                "message_id": send_result.get("message_id")
            }
        ))

        # ─── 4. Find and Schedule Next Sequence Step ──────────────────────────
        # Next enabled step with step_number > current_step_num
        next_step = next((s for s in steps if s.step_number > current_step_num and s.is_enabled), None)

        if next_step:
            delay_sec = next_step.delay_seconds or normalize_delay_seconds(next_step.delay_value, next_step.delay_unit)
            deal.current_step_number = next_step.step_number
            deal.state = DealState.WAITING_FOR_ENGAGEMENT
            deal.sequence_state = "TIMER_RUNNING"
            deal.waiting_started_at = now
            deal.wait_time_seconds = delay_sec
            deal.not_before = now + timedelta(seconds=delay_sec)
            deal.timer_expires_at = deal.not_before

            # Log next timer event
            db.add(EmailEvent(
                lead_id=deal.lead_id,
                campaign_id=deal.campaign_id,
                deal_id=deal.id,
                event_type="Waiting for Engagement",
                metadata_json={
                    "step_number": next_step.step_number,
                    "step_name": next_step.step_name,
                    "delay_seconds": delay_sec,
                    "delay_unit": next_step.delay_unit,
                    "timer_expires_at": deal.timer_expires_at.isoformat()
                }
            ))
            logger.info(f"[TIMER STARTED] Deal #{deal.id} scheduled for step #{next_step.step_number} ({next_step.step_name}) in {delay_sec}s.")
        else:
            deal.state = DealState.CAMPAIGN_COMPLETED
            deal.sequence_state = "COMPLETED"
            deal.outcome = Outcome.UNRESPONSIVE
            deal.timer_expires_at = None
            deal.not_before = None
            db.add(EmailEvent(
                lead_id=deal.lead_id,
                campaign_id=deal.campaign_id,
                deal_id=deal.id,
                event_type="Sequence Completed",
                metadata_json={"total_follow_ups": deal.follow_up_count}
            ))
            logger.info(f"[SEQUENCE COMPLETED] Deal #{deal.id} completed full sequence.")

        db.commit()


def pause_campaign_timers(campaign_id: int, db: Session):
    """Freezes active timers for a campaign, preserving remaining seconds."""
    now = datetime.utcnow()
    deals = db.query(Deal).filter(
        Deal.campaign_id == campaign_id,
        Deal.state.in_([DealState.WAITING_FOR_ENGAGEMENT, DealState.OPENED]),
        Deal.timer_expires_at != None
    ).all()

    for d in deals:
        if d.timer_expires_at:
            rem = max(0, int((d.timer_expires_at - now).total_seconds()))
            d.wait_time_seconds = rem
            d.timer_expires_at = None
            d.not_before = None
            d.sequence_state = "PAUSED"
    db.commit()


def resume_campaign_timers(campaign_id: int, db: Session):
    """Resumes paused timers for a campaign using preserved remaining seconds."""
    now = datetime.utcnow()
    deals = db.query(Deal).filter(
        Deal.campaign_id == campaign_id,
        Deal.state.in_([DealState.WAITING_FOR_ENGAGEMENT, DealState.OPENED]),
        Deal.sequence_state == "PAUSED"
    ).all()

    for d in deals:
        delay = max(5, d.wait_time_seconds or 600)
        d.waiting_started_at = now
        d.not_before = now + timedelta(seconds=delay)
        d.timer_expires_at = d.not_before
        d.sequence_state = "TIMER_RUNNING"
    db.commit()


def stop_campaign_timers(campaign_id: int, db: Session):
    """Cancels all active timers for a campaign."""
    deals = db.query(Deal).filter(
        Deal.campaign_id == campaign_id,
        Deal.state.in_([DealState.WAITING_FOR_ENGAGEMENT, DealState.OPENED])
    ).all()

    for d in deals:
        d.timer_expires_at = None
        d.not_before = None
        d.state = DealState.CAMPAIGN_STOPPED
        d.sequence_state = "CANCELLED"
    db.commit()


campaign_runner = CampaignRunner()
