import os
import pandas as pd
from typing import List, Dict, Any, Optional
from backend.app.core.config import settings
from backend.app.services.lead_providers.base import LeadProvider


class ExcelLeadProvider(LeadProvider):
    """
    B2B Lead Provider that loads prospect data directly from an uploaded Excel file
    (e.g., Master_Contact_List_filled.xlsx).
    """

    def __init__(self, excel_path: Optional[str] = None):
        raw_path = excel_path or getattr(settings, "EXCEL_FILE_PATH", "Master_Contact_List_filled.xlsx")
        
        # Resolve path relative to project root if needed
        if not os.path.isabs(raw_path):
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
            self.excel_path = os.path.join(base_dir, raw_path)
            if not os.path.exists(self.excel_path):
                self.excel_path = os.path.abspath(raw_path)
        else:
            self.excel_path = raw_path


    def health_check(self) -> Dict[str, Any]:
        exists = os.path.exists(self.excel_path)
        total_rows = 0
        if exists:
            try:
                df = pd.read_excel(self.excel_path)
                total_rows = len(df)
            except Exception as e:
                return {
                    "status": "unhealthy",
                    "provider": "excel",
                    "configured": False,
                    "error": f"Failed to read Excel file at {self.excel_path}: {str(e)}"
                }
        return {
            "status": "healthy" if exists else "unhealthy",
            "provider": "excel",
            "configured": exists,
            "excel_path": self.excel_path,
            "total_records": total_rows,
            "message": f"Excel Lead Provider active ({total_rows} contacts loaded from {os.path.basename(self.excel_path)})."
        }

    def _read_excel_data(self) -> pd.DataFrame:
        if not os.path.exists(self.excel_path):
            raise FileNotFoundError(f"Excel file not found at path: {self.excel_path}")
        return pd.read_excel(self.excel_path)

    def search_people(self, criteria: Any = None, page: int = 1, page_size: int = 150) -> Dict[str, Any]:
        """
        Extract contacts from the Excel file and format as Lead dictionaries.
        """
        try:
            df = self._read_excel_data()
        except Exception as e:
            print(f"[ExcelLeadProvider] Error reading excel file: {e}")
            return {"leads": [], "total": 0, "provider": "excel"}

        # Normalize column names for flexible matching
        col_map = {str(col).strip().lower(): col for col in df.columns}
        
        leads = []
        for idx, row in df.iterrows():
            row_id = row.get(col_map.get("#", "#"), idx + 1)
            first_name = str(row.get(col_map.get("first_name", "first_name"), "") or "").strip()
            last_name = str(row.get(col_map.get("last_name", "last_name"), "") or "").strip()
            name = f"{first_name} {last_name}".strip() or f"Contact #{row_id}"
            
            email_val = str(row.get(col_map.get("email", "email"), "") or "").strip()
            job_title = str(row.get(col_map.get("job_title", "job_title"), "") or "").strip()
            company_name = str(row.get(col_map.get("company_name", "company_name"), "") or "").strip()
            company_website = str(row.get(col_map.get("company_website", "company_website"), "") or "").strip()
            industry = str(row.get(col_map.get("industry", "industry"), "") or "").strip()
            country = str(row.get(col_map.get("country", "country"), "") or "").strip()
            seniority = str(row.get(col_map.get("seniority", "seniority"), "") or "").strip()
            department = str(row.get(col_map.get("department", "department"), "") or "").strip()
            source = str(row.get(col_map.get("source", "source"), "") or "Excel_Import").strip()
            created_at = str(row.get(col_map.get("created_at", "created_at"), "") or "").strip()
            updated_at = str(row.get(col_map.get("updated_at", "updated_at"), "") or "").strip()

            clean_email = email_val if ("@" in email_val and "." in email_val) else None
            profile_url = f"excel://contact/{row_id}/{first_name}_{last_name}".lower()

            lead_dict = {
                "provider": "excel",
                "provider_lead_id": f"excel_{row_id}",
                "first_name": first_name,
                "last_name": last_name,
                "name": name,
                "job_title": job_title,
                "seniority": seniority,
                "department": department,
                "email": clean_email or "",
                "email_status": "verified" if clean_email else "unverified",
                "company": company_name,
                "company_domain": company_website,
                "industry": industry,
                "location": country,
                "country_code": country,
                "source": source,
                "source_type": "excel_import",
                "profile_url": profile_url,
                "linkedin_url": "",
                "created_at": created_at,
                "updated_at": updated_at,
                "company_description": f"{company_name} {industry} ({company_website}).".strip(),
                "profile_text": f"{name} - {job_title} ({seniority}, {department}) at {company_name} ({industry}, {country}). Source: {source}."
            }
            leads.append(lead_dict)

        # Extract and enforce universal keyword & criteria filtering
        if criteria:
            stopwords = {
                'a', 'an', 'the', 'and', 'or', 'to', 'for', 'in', 'with', 'of', 'on', 'at', 'by', 'is', 'are',
                'we', 'want', 'create', 'campaign', 'search', 'searching', 'find', 'prospects', 'leads',
                'outreach', 'need', 'get', 'show', 'dept', 'department', 'relevent', 'related', 'pool',
                'pools', 'profile', 'profiles', 'target', 'objective', 'description', 'list', 'master',
                'generate', 'lead', 'campaigns', 'from', 'excel', 'data', 'file', 'only', 'all', 'any',
                'which', 'have', 'i', 'my', 'me', 'please', 'make', 'sure', 'should', 'get', 'proper', 'result',
                'test', 'debug', 'draft', 'new', 'copy', 'outbound', 'inbound', 'v1', 'v2', 'demo', 'sample',
                'transforming', 'tomorrow', 'tomorrows', 'workforce', 'future', 'solution', 'solutions',
                'scaling', 'empowering', 'unlocking', 'growth', 'excellence', 'nextgen', 'driving', 'revolution',
                'strategy', 'strategies', 'strategic', 'modern', 'innovative', 'innovation', 'building',
                'accelerating', 'leading', 'maximizing', 'optimizing', 'optimization', 'enablement', 'work'
            }

            raw_kws = []
            if hasattr(criteria, "keywords") and criteria.keywords:
                raw_kws.extend([k.lower() for k in criteria.keywords])
            if hasattr(criteria, "required_role_keywords") and criteria.required_role_keywords:
                raw_kws.extend([r.lower() for r in criteria.required_role_keywords])
            if hasattr(criteria, "required_keywords") and criteria.required_keywords:
                raw_kws.extend([rk.lower() for rk in criteria.required_keywords])
            
            clean_kws = list(dict.fromkeys([w for w in raw_kws if w not in stopwords and len(w) > 1]))

            target_dept = (getattr(criteria, "target_department", None) or getattr(criteria, "industry", None) or "").strip().lower()
            target_dept_clean = target_dept if target_dept not in ["b2b", "global", "all"] else ""
            target_cnt = (getattr(criteria, "country_code", None) or "").strip().upper()
            target_cnt_clean = target_cnt if target_cnt not in ["GLOBAL", "ALL", ""] else ""

            filtered = []
            for l in leads:
                lead_dept = str(l.get("department", "")).lower()
                lead_title = str(l.get("job_title", "")).lower()
                lead_country = str(l.get("country_code") or l.get("location") or "").upper()
                lead_full_text = f"{l.get('first_name','')} {l.get('last_name','')} {l.get('email','')} {lead_title} {l.get('company','')} {l.get('company_website','')} {l.get('industry','')} {lead_country} {l.get('seniority','')} {lead_dept} {l.get('source','')} {l.get('profile_text','')}".lower()

                # 1. Department constraint if explicitly set
                if target_dept_clean and any(dk in clean_kws for dk in ["finance", "marketing", "sales", "it", "customer support", "hr", "procurement", "engineering", "legal", "operations"]):
                    if target_dept_clean not in lead_dept and target_dept_clean not in l.get('industry', '').lower():
                        continue

                # 2. Country constraint if explicitly set
                if target_cnt_clean:
                    country_aliases = {
                        "AE": ["UAE", "AE", "UNITED ARAB EMIRATES", "DUBAI", "ABU DHABI"],
                        "UAE": ["UAE", "AE", "UNITED ARAB EMIRATES", "DUBAI", "ABU DHABI"],
                        "IN": ["IN", "INDIA"],
                        "INDIA": ["IN", "INDIA"],
                        "US": ["US", "USA", "UNITED STATES"],
                        "DE": ["DE", "GERMANY"],
                        "UK": ["UK", "UNITED KINGDOM", "GREAT BRITAIN"]
                    }
                    allowed_countries = country_aliases.get(target_cnt_clean, [target_cnt_clean])
                    if not any(ac == lead_country or ac in lead_country for ac in allowed_countries):
                        continue


                # 3. Role / Seniority constraint (OR logic across alternative titles e.g. Director OR Manager)
                role_kws = [w for w in clean_kws if any(rk in w.rstrip('s') for rk in ["director", "manager", "officer", "assistant", "vp", "executive", "head", "lead", "specialist", "analyst", "ciso", "cto", "ceo", "cfo", "coo", "chro"])]
                if role_kws:
                    if not any(w.rstrip('s') in lead_title or w.rstrip('s') in lead_full_text for w in role_kws):
                        continue

                # 4. Non-role mandatory keywords constraint
                non_role_kws = [w for w in clean_kws if w not in role_kws and w not in ["uae", "india", "us", "uk", "germany"]]
                if non_role_kws and not all(kw in lead_full_text for kw in non_role_kws):
                    continue


                filtered.append(l)


            # Strict Section 5 Rule: if 0 match, leads is []! (Do NOT fall back to all profiles)
            leads = filtered



        # Pagination slice if requested
        start = (page - 1) * page_size
        end = start + page_size
        paginated_leads = leads[start:end]

        return {
            "leads": paginated_leads,
            "total": len(leads),
            "provider": "excel"
        }


    def enrich_person(self, details: Dict[str, Any]) -> Dict[str, Any]:
        return {"enrichment_source": "excel_file", "excel_path": self.excel_path}

    def search_companies(self, criteria: Dict[str, Any]) -> List[Dict[str, Any]]:
        try:
            df = self._read_excel_data()
            companies = df["company_name"].dropna().unique().tolist()
            return [{"name": c} for c in companies]
        except Exception:
            return []
