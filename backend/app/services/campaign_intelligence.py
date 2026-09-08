import re
import json
import os
import requests
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from backend.app.core.config import settings
from backend.app.models.campaign import Campaign


class CampaignSearchStrategy(BaseModel):
    """Structured prospect-search criteria dynamically derived by AI for any B2B domain."""
    job_titles: List[str] = Field(default_factory=list, description="Target job titles e.g. ['Customer Support Manager', 'Customer Support Director']")
    seniority_levels: List[str] = Field(default_factory=list, description="Target seniorities e.g. ['Director', 'Manager']")
    departments: List[str] = Field(default_factory=list, description="Target departments e.g. ['Customer Support', 'Support']")
    industries: List[str] = Field(default_factory=list, description="Target industries (empty list if unspecified)")
    locations: List[str] = Field(default_factory=list, description="Target locations e.g. ['India']")
    keywords: List[str] = Field(default_factory=list, description="Target search keywords")
    company_keywords: List[str] = Field(default_factory=list, description="Target company keywords")
    exclude_keywords: List[str] = Field(default_factory=list, description="Keywords to exclude")
    synonyms: Dict[str, List[str]] = Field(default_factory=dict, description="Extracted synonyms & abbreviations mapping e.g. {'pbi': ['power bi', 'powerbi']}")
    
    # Backwards-compatible aliases & derived helpers
    department: List[str] = Field(default_factory=list)
    job_title_keywords: List[str] = Field(default_factory=list)
    seniority: List[str] = Field(default_factory=list)
    country: List[str] = Field(default_factory=list)
    industry_list: List[str] = Field(default_factory=list)
    required_keywords: List[str] = Field(default_factory=list)
    industry: str = Field(default="")
    target_department: Optional[str] = Field(default=None)
    roles: List[str] = Field(default_factory=list)
    primary_role: str = Field(default="")
    country_code: str = Field(default="")
    reasoning: str = Field(default="")

    def model_post_init(self, __context: Any) -> None:
        """Ensure back-compatibility aliases are populated and infer missing departments/seniorities from job titles."""
        dept_keywords_map = {
            "business development": "Business Development",
            "biz dev": "Business Development",
            "bdo": "Business Development",
            "bd": "Business Development",
            "commercial": "Commercial",
            "growth": "Growth",
            "product": "Product",
            "strategy": "Strategy",
            "revenue": "Revenue",
            "customer support": "Customer Support",
            "customer service": "Customer Support",
            "support": "Customer Support",
            "customer success": "Customer Success",
            "finance": "Finance",
            "accounting": "Finance",
            "hr": "HR",
            "human resources": "HR",
            "people": "HR",
            "talent": "HR",
            "procurement": "Procurement",
            "purchasing": "Procurement",
            "supply chain": "Procurement",
            "sales": "Sales",
            "marketing": "Marketing",
            "it": "IT",
            "information technology": "IT",
            "tech": "IT",
            "technology": "IT",
            "engineering": "Engineering",
            "legal": "Legal",
            "operations": "Operations",
            "ops": "Operations"
        }
        seniority_keywords_map = {
            "director": "Director",
            "head": "Director",
            "manager": "Manager",
            "vp": "VP",
            "vice president": "VP",
            "c-level": "C-Level",
            "chief": "C-Level",
            "ceo": "C-Level",
            "cfo": "C-Level",
            "coo": "C-Level",
            "cto": "C-Level",
            "senior": "Senior",
            "lead": "Senior",
            "specialist": "Specialist",
            "analyst": "Analyst",
            "executive": "Executive"
        }

        # Auto-infer departments from job_titles if empty
        if self.job_titles and not self.departments and not self.department:
            inferred_depts = []
            for jt in self.job_titles:
                jt_lower = jt.lower()
                for key, val in dept_keywords_map.items():
                    if key in jt_lower and val not in inferred_depts:
                        inferred_depts.append(val)
            if inferred_depts:
                self.departments = inferred_depts
                self.department = list(inferred_depts)

        # Auto-infer seniority_levels from job_titles if empty
        if self.job_titles and not self.seniority_levels and not self.seniority:
            inferred_sen = []
            for jt in self.job_titles:
                jt_lower = jt.lower()
                for key, val in seniority_keywords_map.items():
                    if key in jt_lower and val not in inferred_sen:
                        inferred_sen.append(val)
            if inferred_sen:
                self.seniority_levels = inferred_sen
                self.seniority = list(inferred_sen)

        if self.departments and not self.department:
            self.department = list(self.departments)
        elif self.department and not self.departments:
            self.departments = list(self.department)

        if self.job_titles and not self.job_title_keywords:
            self.job_title_keywords = list(self.job_titles)
        elif self.job_title_keywords and not self.job_titles:
            self.job_titles = list(self.job_title_keywords)

        if self.seniority_levels and not self.seniority:
            self.seniority = list(self.seniority_levels)
        elif self.seniority and not self.seniority_levels:
            self.seniority_levels = list(self.seniority)

        if self.locations and not self.country:
            self.country = list(self.locations)
        elif self.country and not self.locations:
            self.locations = list(self.country)

        if self.industries and not self.industry_list:
            self.industry_list = list(self.industries)
        elif self.industry_list and not self.industries:
            self.industries = list(self.industry_list)

        if self.departments:
            self.target_department = self.departments[0]
        if self.job_titles:
            self.roles = list(self.job_titles)
            self.primary_role = self.job_titles[0]
        if self.industries:
            self.industry = self.industries[0]
_STRATEGY_CACHE: Dict[str, Any] = {}


class CampaignIntelligenceService:
    """
    Data-Driven AI Campaign Intelligence System.
    Dynamically converts natural language campaign requests into structured search criteria.
    NO hardcoded fallback strategies (CTO/VP/SaaS/Cloud defaults removed).
    """

    @staticmethod
    def _call_openrouter_llm(raw_text: str) -> Optional[CampaignSearchStrategy]:
        """
        Multi-Model OpenRouter API Call for Data-Driven Campaign Criteria Extraction.
        """
        try:
            from backend.app.services.openrouter_service import openrouter_service

            prompt = (
                "Your task is to extract structured B2B prospect targeting criteria strictly from the user's campaign prompt.\n\n"
                f"Campaign Context:\n{raw_text}\n\n"
                "Return ONLY a valid JSON object formatted as:\n"
                "{\n"
                '  "job_titles": ["Specific Job Title 1", "Specific Job Title 2"],\n'
                '  "seniority_levels": ["Manager", "Director", "VP", "Head", "C-Level"],\n'
                '  "departments": ["Customer Support", "Finance", "HR", "IT", "Procurement", "Sales"],\n'
                '  "industries": ["Healthcare", "Banking"],\n'
                '  "locations": ["India", "United States", "Germany"],\n'
                '  "keywords": ["keyword1", "keyword2"],\n'
                '  "company_keywords": [],\n'
                '  "exclude_keywords": ["Finance", "HR", "Oil & Gas", "Construction"],\n'
                '  "synonyms": {"pbi": ["power bi", "powerbi"], "fpa": ["financial planning", "fp&a"]},\n'
                '  "reasoning": "Brief explanation of extracted targeting requirements"\n'
                "}\n\n"
                "CRITICAL RULES:\n"
                "1. Extract ONLY criteria explicitly requested or clearly implied in the prompt.\n"
                "2. Include synonym and abbreviation expansions in synonyms dict (e.g. PBI -> power bi, CX -> customer experience, FP&A -> financial planning).\n"
                "3. If an attribute (such as industry, location, or exclude_keywords) is not specified, return an empty array []. DO NOT invent industries or locations.\n"
                "4. NEVER inject hardcoded defaults like CTO, VP Engineering, SaaS, Cloud, or Cybersecurity unless explicitly requested.\n"
                "5. Distinguish between REQUIRED department/function and REQUIRED seniority level."
            )

            res_text = openrouter_service.complete(
                prompt=prompt,
                system_instruction="You are OpenOutreach AI Campaign Criteria Parser.",
                temperature=0.1,
                timeout=12.0,
                response_format_json=True

            )

            if res_text:
                clean_json = re.sub(r'^```(?:json)?\s*', '', res_text, flags=re.MULTILINE)
                clean_json = re.sub(r'\s*```$', '', clean_json, flags=re.MULTILINE).strip()

                data = json.loads(clean_json)
                job_titles = data.get("job_titles") or data.get("job_title_keywords") or []
                seniorities = data.get("seniority_levels") or data.get("seniority") or []
                depts = data.get("departments") or data.get("department") or []
                inds = data.get("industries") or data.get("industry_list") or []
                locs = data.get("locations") or data.get("country") or []
                kws = data.get("keywords") or data.get("required_keywords") or []

                strat = CampaignSearchStrategy(
                    job_titles=job_titles,
                    seniority_levels=seniorities,
                    departments=depts,
                    industries=inds,
                    locations=locs,
                    keywords=kws,
                    company_keywords=data.get("company_keywords", []),
                    exclude_keywords=data.get("exclude_keywords", []),
                    synonyms=data.get("synonyms", {}),
                    reasoning=data.get("reasoning", "Derived strategy via multi-model OpenRouter criteria extraction.")
                )
                return strat
        except Exception as e:
            print(f"[CAMPAIGN_INTELLIGENCE] OpenRouter call exception: {e}")

        return None

    @staticmethod
    def derive_heuristic_strategy(campaign: Campaign) -> CampaignSearchStrategy:
        """Derive data-driven campaign criteria directly from prompt text without hardcoded defaults."""
        from backend.app.services.normalizer import DataNormalizer

        target_prompt = f"{campaign.name or ''} {campaign.campaign_target or ''} {campaign.objective or ''} {campaign.description or ''}".strip()
        parsed = DataNormalizer.parse_natural_prompt(target_prompt)

        combined_text = target_prompt.lower()

        extracted_depts = parsed.get("inferred_departments", [])
        if not extracted_depts and parsed.get("interpreted_department") and parsed["interpreted_department"] != "General":
            extracted_depts = [parsed["interpreted_department"]]

        extracted_industries = parsed.get("inferred_industries", [])
        # Merge explicit industry field from campaign (comma-separated or single value)
        if getattr(campaign, "industry", None) and campaign.industry.strip():
            for ind_val in [v.strip() for v in campaign.industry.split(",") if v.strip()]:
                if ind_val not in extracted_industries:
                    extracted_industries.append(ind_val)
        extracted_seniorities = parsed.get("inferred_seniorities", [])
        extracted_roles = parsed.get("inferred_roles", [])
        extracted_countries = parsed.get("inferred_locations", [])

        # Check for explicit Target Roles prompt clause
        explicit_roles_match = re.search(r'target roles:\s*([^)]+)', combined_text, re.IGNORECASE)
        if explicit_roles_match:
            roles_str = explicit_roles_match.group(1).strip()
            extracted_roles = [r.strip().title() for r in roles_str.split(',') if r.strip()]

        # Country code from campaign or parsed
        extracted_country_code = (campaign.country_code or "").strip().upper()
        if not extracted_country_code and extracted_countries:
            _, ccode = DataNormalizer.normalize_country(extracted_countries[0])
            extracted_country_code = ccode

        # Required Search Keywords
        extracted_kws = CampaignIntelligenceService.extract_prompt_keywords(combined_text)

        # Synonym & Abbreviation Extraction
        syn_map = {
            "bfsi": ["bfsi", "banking", "finance", "financial services", "insurance", "fintech"],
            "banking": ["banking", "bank", "financial services", "finance", "bfsi", "fintech"],
            "pbi": ["power bi", "powerbi", "pbi", "bi"],
            "power bi": ["power bi", "powerbi", "pbi", "bi"],
            "hr": ["human resources", "hr", "people", "talent"],
            "it": ["information technology", "it", "tech"],
            "cx": ["customer experience", "customer support", "cx"],
            "fpa": ["financial planning", "fp&a", "finance", "fpa"],
            "fp&a": ["financial planning", "fp&a", "finance", "fpa"],
            "ciso": ["ciso", "information security", "cybersecurity", "security"]
        }
        extracted_synonyms = {}
        for s_key, s_vals in syn_map.items():
            if re.search(r'\b' + re.escape(s_key) + r'\b', combined_text):
                extracted_synonyms[s_key] = s_vals

        return CampaignSearchStrategy(
            job_titles=extracted_roles,
            seniority_levels=extracted_seniorities,
            departments=extracted_depts,
            industries=extracted_industries,
            locations=extracted_countries,
            keywords=extracted_kws,
            country_code=extracted_country_code,
            synonyms=extracted_synonyms,
            reasoning=f"Heuristic extraction: Dept={extracted_depts or 'Any'}, Roles={extracted_roles or 'Any'}, Country={extracted_countries or 'Any'}, Industry={extracted_industries or 'Any'}."
        )

    @staticmethod
    def derive_strategy(campaign: Campaign) -> CampaignSearchStrategy:
        """Synchronous wrapper for campaign strategy derivation with cached targeting criteria JSON."""
        heuristic_strat = CampaignIntelligenceService.derive_heuristic_strategy(campaign)

        # Merge cached targeting criteria with heuristic derivation for any missing fields
        if campaign.campaign_targeting and isinstance(campaign.campaign_targeting, dict):
            try:
                target_dict = dict(campaign.campaign_targeting)
                if not target_dict.get("locations") and heuristic_strat.locations:
                    target_dict["locations"] = heuristic_strat.locations
                    target_dict["country"] = heuristic_strat.locations
                    target_dict["country_code"] = heuristic_strat.country_code
                if not target_dict.get("departments") and heuristic_strat.departments:
                    target_dict["departments"] = heuristic_strat.departments
                    target_dict["department"] = heuristic_strat.departments
                if not target_dict.get("seniority_levels") and heuristic_strat.seniority_levels:
                    target_dict["seniority_levels"] = heuristic_strat.seniority_levels
                    target_dict["seniority"] = heuristic_strat.seniority_levels
                if not target_dict.get("industries") and heuristic_strat.industries:
                    target_dict["industries"] = heuristic_strat.industries
                    target_dict["industry_list"] = heuristic_strat.industries

                # Filter out stop words from keywords
                stopwords = {
                    'from', 'in', 'at', 'of', 'for', 'with', 'on', 'by', 'the', 'and', 'a', 'an',
                    'industry', 'industries', 'sector', 'sectors', 'department', 'departments', 'dept',
                    'role', 'roles', 'level', 'levels', 'target', 'campaign', 'search', 'searching'
                }
                if target_dict.get("keywords"):
                    target_dict["keywords"] = [k for k in target_dict["keywords"] if k.lower() not in stopwords]

                strat = CampaignSearchStrategy(**target_dict)
                campaign.campaign_targeting = strat.model_dump()
                return strat
            except Exception:
                pass

        campaign.campaign_targeting = heuristic_strat.model_dump()
        return heuristic_strat

    @staticmethod
    def extract_prompt_keywords(prompt_text: str) -> List[str]:
        """Extract non-stopword search tokens from campaign text."""
        stopwords = {
            'a', 'an', 'the', 'and', 'or', 'to', 'for', 'in', 'with', 'of', 'on', 'at', 'by', 'is', 'are',
            'we', 'want', 'create', 'campaign', 'search', 'searching', 'find', 'prospects', 'leads',
            'outreach', 'need', 'get', 'show', 'dept', 'department', 'departments', 'relevent', 'related', 'pool',
            'pools', 'profile', 'profiles', 'target', 'objective', 'description', 'list', 'master',
            'generate', 'lead', 'campaigns', 'from', 'excel', 'data', 'file', 'only', 'all', 'any',
            'which', 'have', 'i', 'my', 'me', 'please', 'make', 'sure', 'should', 'get', 'proper', 'result',
            'test', 'debug', 'draft', 'new', 'copy', 'outbound', 'inbound', 'v1', 'v2', 'demo', 'sample',
            'transforming', 'tomorrow', 'tomorrows', 'workforce', 'future', 'solution', 'solutions',
            'scaling', 'empowering', 'unlocking', 'growth', 'excellence', 'nextgen', 'driving', 'revolution',
            'strategy', 'strategies', 'strategic', 'modern', 'innovative', 'innovation', 'building',
            'accelerating', 'leading', 'maximizing', 'optimizing', 'optimization', 'enablement', 'work',
            'industry', 'industries', 'sector', 'sectors', 'role', 'roles', 'level', 'levels', 'persona',
            'personas', 'field', 'fields', 'enter', 'creating', 'mention', 'mentioned'
        }
        words = re.findall(r'\b[a-zA-Z0-9]+\b', (prompt_text or "").lower())
        return [w for w in words if w not in stopwords and len(w) > 1]







    @staticmethod
    def build_default_queries(strategy: CampaignSearchStrategy) -> List[str]:
        """Construct multiple targeted web search queries from strategy parameters."""
        loc = strategy.locations[0] if strategy.locations else strategy.country_code
        ind = strategy.industry
        role = strategy.primary_role
        queries = [
            f"{ind} companies {loc} {role}",
            f"{role} {ind} {loc}",
            f"site:linkedin.com/in {role} {ind} {loc}",
            f"top {ind} companies {loc} leadership",
            f"{role} at {ind} companies {loc}",
            f"head of {ind.split()[0]} {loc}"
        ]
        return list(dict.fromkeys(queries))
