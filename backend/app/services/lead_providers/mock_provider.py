import re
from typing import List, Dict, Any
from backend.app.services.lead_providers.base import LeadProvider


class MockLeadProvider(LeadProvider):
    """
    Mock B2B Lead Provider used ONLY for local development when LEAD_PROVIDER=mock.
    Dynamic mock implementation adapting to AI Campaign Search Strategies.
    """

    def health_check(self) -> Dict[str, Any]:
        return {
            "status": "healthy",
            "provider": "mock",
            "configured": True,
            "message": "Mock Lead Provider active (Development Mode)."
        }

    def search_people(self, criteria: Any, page: int = 1, page_size: int = 25) -> Dict[str, Any]:
        crit_dict = criteria.model_dump() if hasattr(criteria, "model_dump") else (dict(criteria) if isinstance(criteria, dict) else {})
        role = crit_dict.get("primary_role") or (crit_dict.get("roles")[0] if crit_dict.get("roles") else "Executive")
        industry = crit_dict.get("industry", "B2B Technology")
        country = crit_dict.get("country_code") or crit_dict.get("country") or "US"

        names_by_country = {
            "IN": [
                ("Vikram Sharma", "vikram.s"), ("Pooja Reddy", "pooja.r"), ("Amitabh Das", "amitabh.d"),
                ("Aarav Patel", "aarav.p"), ("Neha Gupta", "neha.g"), ("Rahul Verma", "rahul.v")
            ],
            "DE": [
                ("Hans Weber", "h.weber"), ("Greta Fischer", "g.fischer"), ("Karl Hoffmann", "karl.h"),
                ("Stefan Becker", "stefan.b"), ("Monika Richter", "m.richter"), ("Lukas Schmidt", "lukas.s")
            ],
            "US": [
                ("Sarah Chen", "sarah.chen"), ("David Miller", "david.m"), ("Elena Rostova", "elena.r"),
                ("Marcus Vance", "marcus.v"), ("Priya Sharma", "priya.s"), ("Alex Thorne", "alex.t")
            ],
            "UK": [
                ("Oliver Smith", "oliver.s"), ("Charlotte Jones", "c.jones"), ("Harry Davies", "harry.d"),
                ("Emily Taylor", "emily.t"), ("George Brown", "george.b"), ("Sophie Wilson", "sophie.w")
            ]
        }

        country_names = names_by_country.get(country, names_by_country["US"])
        domain_suffix = ".in" if country == "IN" else (".de" if country == "DE" else ".com")
        clean_ind = re.sub(r'[^a-zA-Z]', '', industry).lower() or "b2b"

        results = []
        for i, (name, handle) in enumerate(country_names[:page_size]):
            first, last = name.split()[0], name.split()[1]
            company = f"{last} {industry} Group" if i % 2 == 0 else f"{industry} {country}"
            email = f"{handle}@{clean_ind}{domain_suffix}"

            results.append({
                "provider": "mock",
                "provider_lead_id": f"mock_{handle}_{clean_ind}",
                "first_name": first,
                "last_name": last,
                "name": name,
                "job_title": role,
                "seniority": "Executive",
                "email": email,
                "email_status": "verified",
                "company": company,
                "company_domain": f"{clean_ind}{domain_suffix}",
                "company_size": "50-500",
                "industry": industry,
                "location": country,
                "country_code": country,
                "profile_url": f"https://linkedin.com/in/{handle}-{clean_ind}",
                "linkedin_url": f"https://linkedin.com/in/{handle}-{clean_ind}",
                "company_description": f"Leading {industry} organization in {country}.",
                "profile_text": f"{role} at {company} ({industry}, {country}). Focused on operational efficiency and domain growth."
            })

        return {
            "leads": results,
            "total": len(results),
            "provider": "mock"
        }

    def enrich_person(self, details: Dict[str, Any]) -> Dict[str, Any]:
        return {"enrichment_source": "mock"}

    def search_companies(self, criteria: Dict[str, Any]) -> List[Dict[str, Any]]:
        return [{"name": "Mock Org", "domain": "example.com"}]
