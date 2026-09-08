from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime
from backend.app.models.lead import Lead

class LeadDeduplicationService:
    """
    Priority-Based Duplicate Detection & Record Resolution Engine for Master Lead Database.
    Priority Hierarchy:
      1. Email
      2. LinkedIn URL
      3. Profile URL
      4. Source ID
      5. Composite Key (first_name + last_name + company_name + job_title)
    """

    @classmethod
    def check_duplicate(cls, db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes 5-tier priority duplicate search on incoming profile payload.
        Returns {"is_duplicate": bool, "match_tier": str, "matched_lead": Lead, "match_reason": str}
        """
        email = (payload.get("email") or "").strip().lower()
        linkedin_url = (payload.get("linkedin_url") or "").strip().lower()
        profile_url = (payload.get("profile_url") or "").strip().lower()
        source_id = (payload.get("source_id") or "").strip()

        first_name = (payload.get("first_name") or "").strip().lower()
        last_name = (payload.get("last_name") or "").strip().lower()
        company_name = (payload.get("company_name") or "").strip().lower()
        job_title = (payload.get("job_title") or "").strip().lower()

        # Tier 1: Email
        if email and "@" in email:
            existing = db.query(Lead).filter(Lead.email.ilike(email)).first()
            if existing:
                return {
                    "is_duplicate": True,
                    "match_tier": "email",
                    "matched_lead_id": existing.id,
                    "matched_lead_name": f"{existing.first_name or ''} {existing.last_name or ''}".strip(),
                    "match_reason": f"A profile with this email ({existing.email}) already exists in the Master Database."
                }

        # Tier 2: LinkedIn URL
        if linkedin_url and "linkedin" in linkedin_url:
            existing = db.query(Lead).filter(Lead.linkedin_url.ilike(f"%{linkedin_url}%")).first()
            if existing:
                return {
                    "is_duplicate": True,
                    "match_tier": "linkedin_url",
                    "matched_lead_id": existing.id,
                    "matched_lead_name": f"{existing.first_name or ''} {existing.last_name or ''}".strip(),
                    "match_reason": f"Matching LinkedIn URL '{existing.linkedin_url}'"
                }

        # Tier 3: Profile URL
        if profile_url and not profile_url.startswith("manual://") and not profile_url.startswith("csv://"):
            existing = db.query(Lead).filter(Lead.profile_url.ilike(profile_url)).first()
            if existing:
                return {
                    "is_duplicate": True,
                    "match_tier": "profile_url",
                    "matched_lead_id": existing.id,
                    "matched_lead_name": f"{existing.first_name or ''} {existing.last_name or ''}".strip(),
                    "match_reason": f"Matching Profile URL '{existing.profile_url}'"
                }

        # Tier 4: Source ID
        if source_id:
            existing = db.query(Lead).filter(Lead.source_id == source_id).first()
            if existing:
                return {
                    "is_duplicate": True,
                    "match_tier": "source_id",
                    "matched_lead_id": existing.id,
                    "matched_lead_name": f"{existing.first_name or ''} {existing.last_name or ''}".strip(),
                    "match_reason": f"Matching Source ID '{existing.source_id}'"
                }

        # Tier 5: Composite Key (first_name + last_name + company_name + job_title)
        if first_name and last_name and company_name:
            all_leads = db.query(Lead).filter(
                Lead.first_name.ilike(first_name),
                Lead.last_name.ilike(last_name),
                Lead.company_name.ilike(company_name)
            ).all()

            for cand in all_leads:
                cand_title = (cand.job_title or "").strip().lower()
                if not job_title or not cand_title or job_title in cand_title or cand_title in job_title:
                    return {
                        "is_duplicate": True,
                        "match_tier": "composite_key",
                        "matched_lead_id": cand.id,
                        "matched_lead_name": f"{cand.first_name or ''} {cand.last_name or ''}".strip(),
                        "match_reason": f"Matching Name & Company profile: '{cand.first_name} {cand.last_name}' at '{cand.company_name}'"
                    }

        return {
            "is_duplicate": False,
            "match_tier": None,
            "matched_lead_id": None,
            "matched_lead_name": None,
            "match_reason": "No duplicate record found in Master Lead Database."
        }

    @classmethod
    def execute_action(cls, db: Session, action: str, lead_data: Dict[str, Any], existing_lead_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Executes duplicate resolution action:
          - 'skip': Ignore duplicate record
          - 'update': Update existing profile with newer non-empty fields
          - 'merge': Combine missing info into existing profile
          - 'add_as_new' / 'append': Insert as new record with guaranteed unique profile_url
        """
        act = (action or "skip").lower()

        if act == "skip":
            return {"status": "skipped", "message": "Duplicate profile ignored.", "lead_id": existing_lead_id}

        existing_lead = None
        if existing_lead_id:
            existing_lead = db.query(Lead).filter(Lead.id == existing_lead_id).first()

        if not existing_lead and act in ["update", "merge"]:
            # Attempt finding duplicate if ID wasn't passed directly
            check_res = cls.check_duplicate(db, lead_data)
            if check_res.get("matched_lead_id"):
                existing_lead = db.query(Lead).filter(Lead.id == check_res["matched_lead_id"]).first()

        if act == "update" and existing_lead:
            # Overwrite non-empty fields from payload onto existing lead
            for k, v in lead_data.items():
                if v is not None and str(v).strip() != "" and hasattr(existing_lead, k):
                    setattr(existing_lead, k, v)
            existing_lead.update_date = datetime.utcnow()
            db.commit()
            db.refresh(existing_lead)
            return {"status": "updated", "message": f"Updated existing lead #{existing_lead.id}.", "lead": existing_lead}

        elif act == "merge" and existing_lead:
            # Fill in missing (empty/None) fields on existing lead without overwriting non-empty data
            for k, v in lead_data.items():
                if v is not None and str(v).strip() != "" and hasattr(existing_lead, k):
                    curr_val = getattr(existing_lead, k)
                    if curr_val is None or str(curr_val).strip() == "" or curr_val == []:
                        setattr(existing_lead, k, v)
            existing_lead.update_date = datetime.utcnow()
            db.commit()
            db.refresh(existing_lead)
            return {"status": "merged", "message": f"Merged missing data into lead #{existing_lead.id}.", "lead": existing_lead}

        # Action: 'add_as_new' or 'append' or if no existing record to update/merge
        return cls._create_new_profile(db, lead_data)

    @classmethod
    def _create_new_profile(cls, db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
        """Creates a new record in Master Lead Database with unique profile_url."""
        fn = (data.get("first_name") or "").strip()
        ln = (data.get("last_name") or "").strip()
        email = (data.get("email") or "").strip()
        company = (data.get("company_name") or "").strip()

        base_url = data.get("profile_url") or data.get("linkedin_url")
        if not base_url or base_url.strip() == "":
            unique_slug = f"{fn}_{ln}_{company}".lower().replace(" ", "_") or str(int(datetime.utcnow().timestamp() * 1000))
            base_url = f"manual://profile/{unique_slug}"

        # Ensure profile_url uniqueness in DB
        existing_url = db.query(Lead).filter(Lead.profile_url == base_url).first()
        if existing_url:
            base_url = f"{base_url}_{int(datetime.utcnow().timestamp())}"

        data["profile_url"] = base_url
        if not data.get("source"):
            data["source"] = "Manual Entry"

        lead = Lead(**{k: v for k, v in data.items() if hasattr(Lead, k)})
        db.add(lead)
        db.commit()
        db.refresh(lead)

        return {"status": "created", "message": f"Created new profile #{lead.id} in Master Database.", "lead": lead}
