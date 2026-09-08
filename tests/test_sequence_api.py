import uuid
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import SessionLocal, Base, engine, init_db
from backend.app.models.campaign import Campaign
from backend.app.models.sequence import Sequence, SequenceStep


def test_sequence_api_endpoints():
    init_db()
    with TestClient(app) as client:
        db = SessionLocal()
        try:
            camp_name = f"API Test Campaign {uuid.uuid4().hex[:8]}"
            camp = Campaign(name=camp_name, status="draft")
            db.add(camp)
            db.commit()
            db.refresh(camp)
            camp_id = camp.id

            # 1. GET campaign sequence (should auto-initialize if not present)
            response = client.get(f"/api/v1/sequences/campaign/{camp_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["campaign_id"] == camp_id
            assert len(data["steps"]) >= 3

            # 2. PUT update sequence
            steps_payload = [
                {
                    "step_number": 1,
                    "step_name": "Custom Initial Outreach",
                    "action_type": "send_initial_email",
                    "delay_value": 0,
                    "delay_unit": "min",
                    "delay_seconds": 0,
                    "condition_type": "none",
                    "if_replied_action": "sales_handoff",
                    "if_no_reply_action": "send_followup",
                    "is_enabled": True
                },
                {
                    "step_number": 2,
                    "step_name": "Rapid 15s Follow-up",
                    "action_type": "send_followup",
                    "delay_value": 15,
                    "delay_unit": "sec",
                    "delay_seconds": 15,
                    "condition_type": "did_receiver_reply",
                    "if_replied_action": "schedule_demo",
                    "if_no_reply_action": "send_followup",
                    "custom_instructions": "Highlight fast deployment timeline",
                    "is_enabled": True
                }
            ]
            put_response = client.put(
                f"/api/v1/sequences/campaign/{camp_id}",
                json={
                    "name": "Rapid Sequence",
                    "is_active": True,
                    "steps": steps_payload
                }
            )
            assert put_response.status_code == 200
            updated = put_response.json()
            assert updated["name"] == "Rapid Sequence"
            assert len(updated["steps"]) == 2
            assert updated["steps"][1]["delay_value"] == 15
            assert updated["steps"][1]["delay_unit"] == "sec"
            assert updated["steps"][1]["delay_seconds"] == 15

            # 3. POST reset to default
            reset_response = client.post(f"/api/v1/sequences/campaign/{camp_id}/reset-default")
            assert reset_response.status_code == 200
            reset_data = reset_response.json()
            assert len(reset_data["steps"]) == 4

        finally:
            db.close()
