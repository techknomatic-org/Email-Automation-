import os
import re
import csv
import pandas as pd
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.app.models.lead import Lead
from backend.app.services.normalizer import DataNormalizer
from backend.app.services.rag_service import rag_service

class CsvExcelImporter:
    """
    Production-Grade CSV / Excel Import & PostgreSQL Ingestion Engine.
    Handles file validation, column mapping, normalization, deduplication, and embedding generation.
    """

    COLUMN_ALIASES = {
        "first_name": ["first_name", "firstname", "first name", "given_name"],
        "last_name": ["last_name", "lastname", "last name", "surname", "family_name"],
        "name": ["name", "full_name", "fullname", "contact_name", "prospect_name", "contact"],
        "job_title": ["job_title", "title", "job title", "designation", "position", "role"],
        "department": ["department", "dept", "function", "business_unit"],
        "seniority": ["seniority", "level", "tier", "grade"],
        "company_name": ["company_name", "company", "organization", "firm", "company name"],
        "company_domain": ["company_domain", "company_website", "domain", "website"],
        "industry": ["industry", "sector", "domain_sector", "business_type"],
        "country": ["country", "location", "nation", "country_name", "region"],
        "state": ["state", "province"],
        "city": ["city", "town"],
        "headcount": ["headcount", "company_size", "employee_count", "employees"],
        "email": ["email", "e-mail", "email_address", "contact_email"],
        "phone": ["phone", "phone_number", "mobile", "telephone"],
        "linkedin_url": ["linkedin_url", "linkedin", "profile_url", "linkedin_profile"],
        "notes": ["notes", "pain_points", "company_info", "description", "summary"]
    }

    @classmethod
    def _map_columns(cls, df_columns: List[str]) -> Dict[str, str]:
        mapped = {}
        for col in df_columns:
            clean = str(col).strip().lower().replace("-", "_").replace(" ", "_")
            found = False
            for std_field, aliases in cls.COLUMN_ALIASES.items():
                if clean in aliases or any(a == clean for a in aliases):
                    mapped[std_field] = col
                    found = True
                    break
            if not found:
                mapped[clean] = col
        return mapped

    @classmethod
    def import_file(
        cls,
        db: Session,
        file_path: str,
        source_name: Optional[str] = None,
        import_mode: str = "append"
    ) -> Dict[str, Any]:
        """Import CSV or Excel file into PostgreSQL Lead database."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        filename = os.path.basename(file_path)
        ext = filename.split(".")[-1].lower()

        try:
            if ext == "csv":
                df = pd.read_csv(file_path, encoding="utf-8-sig", on_bad_lines="skip")
            elif ext in ["xlsx", "xls"]:
                df = pd.read_excel(file_path)
            else:
                raise ValueError(f"Unsupported file format '{ext}'. Supported: .csv, .xlsx, .xls")
        except Exception as e:
            raise ValueError(f"Failed to parse file '{filename}': {str(e)}")

        mapped_cols = cls._map_columns(list(df.columns))

        total_rows = len(df)
        imported_count = 0
        duplicate_count = 0
        invalid_rows = 0
        missing_optional_count = 0

        # Handle 'reset' mode: delete all existing profiles from Master Database
        if import_mode and import_mode.lower() == "reset":
            try:
                from backend.app.models.deal import Deal
                from backend.app.models.lead_intelligence import LeadResearch, Suppression
                from backend.app.models.email_event import EmailEvent

                db.query(Deal).delete(synchronize_session=False)
                db.query(LeadResearch).delete(synchronize_session=False)
                db.query(Suppression).delete(synchronize_session=False)
                try:
                    db.query(EmailEvent).delete(synchronize_session=False)
                except Exception:
                    pass
                db.query(Lead).delete(synchronize_session=False)
                db.commit()
            except Exception as reset_err:
                db.rollback()
                print(f"[CSV_IMPORTER] Failed to reset database: {reset_err}")
                raise Exception(f"Failed to clear Master Database for reset import: {reset_err}")

        # Query existing emails, profile URLs, and company+name keys for deduplication
        existing_emails = set(e[0].strip().lower() for e in db.query(Lead.email).filter(Lead.email != None).all() if e[0])
        existing_urls = set(u[0].strip().lower() for u in db.query(Lead.profile_url).all() if u[0])
        existing_keys = set()
        for l in db.query(Lead.company_name, Lead.first_name, Lead.last_name).all():
            if l.company_name and (l.first_name or l.last_name):
                k = f"{l.company_name.lower()}|{str(l.first_name or '').lower()}|{str(l.last_name or '').lower()}"
                existing_keys.add(k)

        new_leads = []

        for idx, row in df.iterrows():
            def get_val(field: str) -> str:
                col = mapped_cols.get(field)
                if col and col in row and pd.notna(row[col]):
                    return str(row[col]).strip()
                return ""

            raw_email = get_val("email")
            raw_title = get_val("job_title")
            raw_company = get_val("company_name")
            raw_name = get_val("name")
            raw_first = get_val("first_name")
            raw_last = get_val("last_name")
            raw_dept = get_val("department")
            raw_seniority = get_val("seniority")
            raw_industry = get_val("industry")
            raw_country = get_val("country")
            raw_phone = get_val("phone")
            raw_linkedin = get_val("linkedin_url")
            raw_notes = get_val("notes")

            # Validate basic row completeness
            if not raw_company and not raw_name and not raw_title and not raw_email:
                invalid_rows += 1
                continue

            # Email validation and normalization
            email = None
            if raw_email and "@" in raw_email and "." in raw_email:
                email = raw_email.strip().lower()
            
            # Full name extraction
            if not raw_first and raw_name:
                parts = raw_name.split()
                first_name = parts[0]
                last_name = " ".join(parts[1:]) if len(parts) > 1 else ""
            else:
                first_name = raw_first
                last_name = raw_last

            full_name = f"{first_name} {last_name}".strip() or raw_name or f"Contact #{idx+1}"

            # Deduplication Check (Normalized Email is unique key)
            dedup_key = f"{raw_company.lower()}|{first_name.lower()}|{last_name.lower()}" if (raw_company and full_name) else None
            profile_url = raw_linkedin or f"csv://{filename}/{idx+1}/{full_name.replace(' ', '_').lower()}"

            if (email and email in existing_emails) or (profile_url.lower() in existing_urls) or (dedup_key and dedup_key in existing_keys):
                duplicate_count += 1
                continue

            # Mark missing optional fields metric
            if not email or not raw_phone or not raw_linkedin:
                missing_optional_count += 1

            # Normalization
            norm_title, norm_seniority, norm_dept = DataNormalizer.normalize_job_title_and_seniority(raw_title, dept_hint=raw_dept)
            norm_country_name, norm_country_code = DataNormalizer.normalize_country(raw_country)
            norm_industry = DataNormalizer.normalize_industry(raw_industry)

            profile_text = f"{full_name} - {norm_title or 'Executive'} ({norm_seniority or 'Manager'}, {norm_dept or 'Business'}) at {raw_company or 'Enterprise'} ({norm_industry or 'B2B'}, {norm_country_name or 'Global'}). {raw_notes}".strip()

            # Generate profile embedding ONCE on insertion
            try:
                embeddings = rag_service.generate_embeddings([profile_text])
                emb_bytes = None
                if embeddings and len(embeddings) > 0:
                    import json
                    emb_bytes = json.dumps(embeddings[0]).encode("utf-8")
            except Exception:
                emb_bytes = None

            lead = Lead(
                profile_url=profile_url,
                provider="csv_import",
                provider_lead_id=f"csv_{idx+1}",
                source_type="csv_import" if not ext.startswith("xls") else "excel_import",
                first_name=first_name,
                last_name=last_name,
                job_title=norm_title or raw_title,
                department=norm_dept or raw_dept,
                seniority=norm_seniority or raw_seniority,
                company_name=raw_company,
                company_domain=get_val("company_domain"),
                industry=norm_industry or raw_industry,
                country=norm_country_name or raw_country,
                country_code=norm_country_code,
                email=email,
                phone=raw_phone,
                linkedin_url=raw_linkedin,
                company_info=raw_notes,
                profile_text=profile_text,
                source=source_name or filename,
                source_file=filename,
                embedding=emb_bytes,
                source_fields={
                    "name": full_name,
                    "first_name": first_name,
                    "last_name": last_name,
                    "job_title": norm_title or raw_title,
                    "department": norm_dept or raw_dept,
                    "seniority": norm_seniority or raw_seniority,
                    "company_name": raw_company,
                    "company": raw_company,
                    "industry": norm_industry or raw_industry,
                    "country": norm_country_name or raw_country,
                    "location": norm_country_name or raw_country,
                    "source": filename
                }
            )

            new_leads.append(lead)
            if email:
                existing_emails.add(email)
            existing_urls.add(profile_url.lower())
            if dedup_key:
                existing_keys.add(dedup_key)
            imported_count += 1

        if new_leads:
            db.bulk_save_objects(new_leads)
            db.commit()

        total_master_db_count = db.query(Lead).count()

        return {
            "status": "success",
            "filename": filename,
            "total_rows": total_rows,
            "imported_count": imported_count,
            "duplicate_count": duplicate_count,
            "invalid_rows": invalid_rows,
            "missing_optional_fields": missing_optional_count,
            "total_master_db_count": total_master_db_count,
            "message": f"Successfully imported {imported_count} leads from {filename} into PostgreSQL Master Lead Database."
        }

csv_importer = CsvExcelImporter()

