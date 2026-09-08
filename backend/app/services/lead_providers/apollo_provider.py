import os
import requests
from typing import List, Dict, Any, Optional
from backend.app.core.config import settings
from backend.app.services.lead_providers.base import LeadProvider


class ApolloLeadProvider(LeadProvider):
    """
    Real B2B Lead Provider for Apollo.io API.
    Executes dynamic prospect searches mapped from AI Campaign Intelligence strategies.
    """

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = (api_key or settings.APOLLO_API_KEY or os.getenv("APOLLO_API_KEY", "")).strip()
        self.base_url = (base_url or settings.APOLLO_BASE_URL or "https://api.apollo.io/v1").rstrip("/")

    def health_check(self) -> Dict[str, Any]:
        """Verify connection and key validity with Apollo API."""
        if not self.api_key:
            return {
                "status": "unconfigured",
                "provider": "apollo",
                "configured": False,
                "message": "Apollo API key is missing. Add APOLLO_API_KEY to backend .env."
            }

        try:
            payload = {
                "api_key": self.api_key,
                "page": 1,
                "per_page": 1
            }
            resp = requests.post(f"{self.base_url}/mixed_people/search", json=payload, timeout=8)
            if resp.status_code == 200:
                return {
                    "status": "healthy",
                    "provider": "apollo",
                    "configured": True,
                    "message": "Apollo API connection successful."
                }
            elif resp.status_code in [401, 403]:
                return {
                    "status": "auth_error",
                    "provider": "apollo",
                    "configured": True,
                    "message": f"Apollo authentication failed (HTTP {resp.status_code}). Check your API key."
                }
            else:
                return {
                    "status": "error",
                    "provider": "apollo",
                    "configured": True,
                    "message": f"Apollo API returned HTTP {resp.status_code}: {resp.text[:150]}"
                }
        except Exception as e:
            return {
                "status": "network_error",
                "provider": "apollo",
                "configured": True,
                "message": f"Could not connect to Apollo API: {str(e)}"
            }

    def search_people(self, criteria: Any, page: int = 1, page_size: int = 25) -> Dict[str, Any]:
        """
        Execute Apollo People Search mapped dynamically from AI Campaign Search Strategy.
        """
        if not self.api_key:
            raise ValueError("Apollo API key is not configured. Please set APOLLO_API_KEY in backend environment.")

        # Convert strategy object or dict to normalized dict
        crit_dict = criteria.model_dump() if hasattr(criteria, "model_dump") else (dict(criteria) if isinstance(criteria, dict) else {})

        payload: Dict[str, Any] = {
            "api_key": self.api_key,
            "page": page,
            "per_page": min(page_size, settings.LEAD_DISCOVERY_PAGE_SIZE)
        }

        # Dynamic AI Strategy Mapping
        roles = crit_dict.get("roles") or ([crit_dict.get("primary_role")] if crit_dict.get("primary_role") else [])
        if roles:
            payload["person_titles"] = roles

        locations = crit_dict.get("locations") or ([crit_dict.get("country")] if crit_dict.get("country") else ([crit_dict.get("country_code")] if crit_dict.get("country_code") else []))
        if locations:
            payload["person_locations"] = locations

        if crit_dict.get("seniorities"):
            payload["person_seniorities"] = crit_dict["seniorities"]

        keywords = crit_dict.get("keywords") or []
        if crit_dict.get("industry") and crit_dict["industry"] not in keywords:
            keywords.append(crit_dict["industry"])
        if keywords:
            payload["q_organization_keyword_tags"] = keywords[:5]

        if crit_dict.get("employee_ranges"):
            payload["organization_num_employees_ranges"] = crit_dict["employee_ranges"]
        elif crit_dict.get("headcount_min") or crit_dict.get("headcount_max"):
            hmin = crit_dict.get("headcount_min", 10)
            hmax = crit_dict.get("headcount_max", 5000)
            payload["organization_num_employees_ranges"] = [f"{hmin},{hmax}"]

        headers = {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache"
        }

        url = f"{self.base_url}/mixed_people/search"
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=12)
        except requests.RequestException as req_err:
            raise RuntimeError(f"Apollo API network request failed: {str(req_err)}")

        if resp.status_code in [401, 403]:
            raise PermissionError("Apollo API authentication failed. Verify APOLLO_API_KEY.")
        elif resp.status_code == 429:
            raise RuntimeError("Apollo API rate limit exceeded (HTTP 429). Please try again later.")
        elif resp.status_code != 200:
            raise RuntimeError(f"Apollo API request failed with HTTP {resp.status_code}: {resp.text[:200]}")

        data = resp.json()
        raw_people = data.get("people", []) or data.get("contacts", [])
        total_results = data.get("pagination", {}).get("total_entries", len(raw_people))

        normalized_leads = []
        for p in raw_people:
            org = p.get("organization") or {}
            first_name = p.get("first_name", "")
            last_name = p.get("last_name", "")
            full_name = p.get("name") or f"{first_name} {last_name}".strip() or "B2B Prospect"
            email = p.get("email") or ""
            email_status = p.get("email_status", "verified" if email else "unavailable")

            pid = str(p.get("id", ""))
            profile_url = p.get("linkedin_url") or (f"https://app.apollo.io/#/people/{pid}" if pid else f"https://apollo.io/lead/{email}")

            normalized_leads.append({
                "provider": "apollo",
                "provider_lead_id": pid,
                "first_name": first_name,
                "last_name": last_name,
                "name": full_name,
                "job_title": p.get("title") or crit_dict.get("primary_role", "Executive"),
                "seniority": p.get("seniority", ""),
                "email": email,
                "email_status": email_status,
                "company": org.get("name") or "Enterprise",
                "company_domain": org.get("primary_domain", ""),
                "company_size": str(org.get("estimated_num_employees", "")),
                "industry": org.get("industry") or crit_dict.get("industry", "B2B"),
                "location": p.get("city") or p.get("state") or p.get("country") or (locations[0] if locations else "US"),
                "country_code": p.get("country") or crit_dict.get("country_code", "US"),
                "profile_url": profile_url,
                "linkedin_url": p.get("linkedin_url", ""),
                "company_description": org.get("short_description") or org.get("seo_description") or "",
                "profile_text": f"{p.get('title', 'Executive')} at {org.get('name', 'Company')} ({org.get('industry', 'Industry')}). {org.get('short_description', '')}".strip()
            })

        return {
            "leads": normalized_leads,
            "total": total_results,
            "provider": "apollo"
        }

    def enrich_person(self, details: Dict[str, Any]) -> Dict[str, Any]:
        """Enrich contact via Apollo People Match."""
        if not self.api_key:
            return {}
        try:
            payload = {
                "api_key": self.api_key,
                "details": details
            }
            resp = requests.post(f"{self.base_url}/people/match", json=payload, timeout=8)
            if resp.status_code == 200:
                return resp.json().get("person", {})
        except Exception as e:
            print(f"Apollo enrichment warning: {e}")
        return {}

    def search_companies(self, criteria: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Search organizations via Apollo Organization Search."""
        if not self.api_key:
            return []
        try:
            crit_dict = criteria.model_dump() if hasattr(criteria, "model_dump") else (dict(criteria) if isinstance(criteria, dict) else {})
            payload = {
                "api_key": self.api_key,
                "q_organization_keyword_tags": [crit_dict.get("industry", "B2B")],
                "page": 1,
                "per_page": 10
            }
            resp = requests.post(f"{self.base_url}/organizations/search", json=payload, timeout=8)
            if resp.status_code == 200:
                return resp.json().get("organizations", [])
        except Exception as e:
            print(f"Apollo organization search warning: {e}")
        return []
