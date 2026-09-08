from __future__ import annotations
import re
from typing import Tuple, Optional, List, Dict, Any, Union, Set

class DataNormalizer:
    """
    Deterministic Data Normalization Engine.
    Maps variations of departments, job titles, seniorities, industries, and countries to standard forms.
    """

    DEPARTMENT_MAP = {
        "finance": "Finance",
        "financial": "Finance",
        "fin": "Finance",
        "accounting": "Finance",
        "accounts": "Finance",
        "treasury": "Finance",
        "taxation": "Finance",
        "audit": "Finance",
        "fp&a": "Finance",
        "fpa": "Finance",
        "hr": "HR",
        "human resources": "HR",
        "people": "HR",
        "talent": "HR",
        "recruitment": "HR",
        "staffing": "HR",
        "procurement": "Procurement",
        "purchasing": "Procurement",
        "supply chain": "Procurement",
        "sourcing": "Procurement",
        "vendor": "Procurement",
        "sales": "Sales",
        "business development": "Business Development",
        "biz dev": "Business Development",
        "bdo": "Business Development",
        "bd": "Business Development",
        "commercial": "Commercial",
        "revenue": "Revenue",
        "revops": "Revenue",
        "marketing": "Marketing",
        "growth": "Marketing",
        "demand gen": "Marketing",
        "branding": "Marketing",
        "it": "IT",
        "information technology": "IT",
        "tech": "IT",
        "technology": "IT",
        "infrastructure": "IT",
        "devops": "IT",
        "engineering": "Engineering",
        "software": "Engineering",
        "development": "Engineering",
        "cybersecurity": "Cybersecurity",
        "security": "Cybersecurity",
        "information security": "Cybersecurity",
        "ciso": "Cybersecurity",
        "legal": "Legal",
        "compliance": "Legal",
        "operations": "Operations",
        "ops": "Operations",
        "customer support": "Customer Support",
        "customer success": "Customer Support",
        "support": "Customer Support"
    }

    SENIORITY_MAP = {
        "c-level": "C-Level",
        "cxo": "C-Level",
        "ceo": "C-Level",
        "cfo": "C-Level",
        "coo": "C-Level",
        "cto": "C-Level",
        "ciso": "C-Level",
        "cmo": "C-Level",
        "chro": "C-Level",
        "president": "C-Level",
        "founder": "C-Level",
        "co-founder": "C-Level",
        "owner": "C-Level",
        "director": "Director",
        "head": "Director",
        "vp": "VP",
        "vice president": "VP",
        "avp": "VP",
        "manager": "Manager",
        "lead": "Senior",
        "senior": "Senior",
        "principal": "Senior",
        "specialist": "Specialist",
        "analyst": "Analyst",
        "officer": "Officer",
        "executive": "Executive",
        "associate": "Associate",
        "assistant": "Assistant"
    }

    COUNTRY_MAP = {
        "india": ("India", "IN"),
        "in": ("India", "IN"),
        "ind": ("India", "IN"),
        "uae": ("UAE", "UAE"),
        "united arab emirates": ("UAE", "UAE"),
        "dubai": ("UAE", "UAE"),
        "abu dhabi": ("UAE", "UAE"),
        "us": ("United States", "US"),
        "usa": ("United States", "US"),
        "united states": ("United States", "US"),
        "united states of america": ("United States", "US"),
        "america": ("United States", "US"),
        "germany": ("Germany", "DE"),
        "de": ("Germany", "DE"),
        "deutschland": ("Germany", "DE"),
        "uk": ("United Kingdom", "UK"),
        "united kingdom": ("United Kingdom", "UK"),
        "great britain": ("United Kingdom", "UK"),
        "england": ("United Kingdom", "UK"),
        "singapore": ("Singapore", "SG"),
        "sg": ("Singapore", "SG"),
        "canada": ("Canada", "CA"),
        "ca": ("Canada", "CA"),
        "australia": ("Australia", "AU"),
        "au": ("Australia", "AU")
    }

    INDUSTRY_MAP = {
        "bfsi": "BFSI",
        "banking": "BFSI",
        "financial services": "BFSI",
        "finance": "BFSI",
        "fintech": "BFSI",
        "bank": "BFSI",
        "insurance": "BFSI",
        "wealth management": "BFSI",
        "investment banking": "BFSI",
        "capital markets": "BFSI",
        "nbfc": "BFSI",
        "credit union": "BFSI",
        "healthcare": "Healthcare",
        "hospital": "Healthcare",
        "medical": "Healthcare",
        "pharma": "Healthcare",
        "pharmaceutical": "Healthcare",
        "pharmaceuticals": "Healthcare",
        "biotech": "Healthcare",
        "life sciences": "Healthcare",
        "clinic": "Healthcare",
        "logistics": "Logistics",
        "shipping": "Logistics",
        "transport": "Logistics",
        "transportation": "Logistics",
        "freight": "Logistics",
        "supply chain": "Logistics",
        "warehouse": "Logistics",
        "distribution": "Logistics",
        "cargo": "Logistics",
        "courier": "Logistics",
        "manufacturing": "Manufacturing",
        "factory": "Manufacturing",
        "industrial": "Manufacturing",
        "plastics": "Manufacturing",
        "production": "Manufacturing",
        "machinery": "Manufacturing",
        "automotive": "Automotive",
        "automobile": "Automotive",
        "vehicles": "Automotive",
        "saas": "SaaS",
        "software": "SaaS",
        "cloud": "SaaS",
        "it": "IT",
        "information technology": "IT",
        "tech": "IT",
        "technology": "IT",
        "cybersecurity": "Cybersecurity",
        "security": "Cybersecurity",
        "infosec": "Cybersecurity",
        "retail": "Retail",
        "e-commerce": "Retail",
        "ecommerce": "Retail",
        "fmcg": "Retail",
        "consumer goods": "Retail",
        "supermarket": "Retail",
        "real estate": "Real Estate",
        "property": "Real Estate",
        "construction": "Real Estate",
        "realty": "Real Estate",
        "developer": "Real Estate",
        "oil & gas": "Oil & Gas",
        "oil and gas": "Oil & Gas",
        "petroleum": "Oil & Gas",
        "energy": "Energy",
        "utilities": "Energy",
        "power": "Energy",
        "government": "Government",
        "gov": "Government",
        "public sector": "Government",
        "education": "Education",
        "academic": "Education",
        "university": "Education",
        "college": "Education",
        "edtech": "Education",
        "hospitality": "Hospitality",
        "hotel": "Hospitality",
        "resort": "Hospitality",
        "tourism": "Hospitality",
        "travel": "Hospitality",
        "telecom": "Telecom",
        "telecommunications": "Telecom",
        "media": "Media",
        "entertainment": "Media",
        "legal": "Legal",
        "law": "Legal",
        "consulting": "Consulting"
    }

    INDUSTRY_SYNONYMS = {
        "bfsi": ["bfsi", "banking", "finance", "financial", "financial services", "insurance", "fintech", "bank", "wealth management", "investment banking", "capital markets", "nbfc", "credit union"],
        "banking": ["banking", "bank", "financial services", "finance", "bfsi", "fintech", "wealth management", "investment banking", "credit union", "nbfc"],
        "finance": ["finance", "financial", "financial services", "banking", "bfsi", "fintech", "accounting", "wealth management"],
        "insurance": ["insurance", "bfsi", "financial services", "underwriting", "actuarial"],
        "healthcare": ["healthcare", "health care", "hospital", "medical", "pharma", "pharmaceutical", "clinic", "biotech", "life sciences"],
        "it": ["it", "information technology", "tech", "technology", "software", "saas", "it services", "it / msp", "msp", "cloud", "developer", "digital"],
        "saas": ["saas", "software", "cloud", "tech", "technology", "it", "platform", "b2b software"],
        "cybersecurity": ["cybersecurity", "security", "infosec", "information security", "ciso", "network security"],
        "government": ["government", "gov", "public sector", "judicial", "ministry", "dept of", "department of", "municipality", "state", "federal"],
        "education": ["education", "academic", "university", "college", "school", "institute", "faculty", "higher education", "edtech"],
        "retail": ["retail", "ecommerce", "e-commerce", "supermarket", "consumer goods", "fmcg", "store", "grocer", "merchandise", "apparel"],
        "hospitality": ["hospitality", "hotel", "resort", "tourism", "travel", "restaurant", "catering", "lodging"],
        "manufacturing": ["manufacturing", "factory", "industrial", "production", "plastics", "machinery", "fabrication", "assembly"],
        "logistics": ["logistics", "supply chain", "shipping", "transport", "transportation", "freight", "cargo", "courier", "warehouse", "distribution"],
        "real estate": ["real estate", "property", "realty", "construction", "developer", "contracting", "building", "housing"],
        "oil & gas": ["oil & gas", "oil and gas", "petroleum", "energy", "refinery", "drilling", "offshore", "hydrocarbon", "gas"],
        "telecom": ["telecom", "telecommunications", "cellular", "wireless", "broadband", "network operator"],
        "automotive": ["automotive", "automobile", "vehicles", "motors", "car manufacturer", "dealership"],
        "media": ["media", "entertainment", "broadcasting", "publishing", "advertising", "marketing agency"],
        "legal": ["legal", "law", "attorney", "law firm", "solicitor", "counsel"],
        "consulting": ["consulting", "advisory", "professional services", "management consulting"]
    }

    ABBREVIATION_MAP = {
        "pbi": ("Power BI", "Technology", "Finance"),
        "powerbi": ("Power BI", "Technology", "Finance"),
        "hr": ("Human Resources", "Department", "HR"),
        "it": ("Information Technology", "Department", "IT"),
        "cx": ("Customer Experience", "Department", "Customer Support"),
        "bdo": ("Business Development Officer", "Role", "Sales"),
        "fp&a": ("Financial Planning & Analysis", "Department", "Finance"),
        "fpa": ("Financial Planning & Analysis", "Department", "Finance"),
        "ciso": ("Chief Information Security Officer", "Role", "Cybersecurity"),
        "cfo": ("Chief Financial Officer", "Role", "Finance"),
        "cto": ("Chief Technology Officer", "Role", "IT"),
        "ceo": ("Chief Executive Officer", "Role", "Executive"),
        "coo": ("Chief Operating Officer", "Role", "Operations"),
        "chro": ("Chief HR Officer", "Role", "HR"),
        "cmo": ("Chief Marketing Officer", "Role", "Marketing"),
        "bi": ("Business Intelligence", "Technology", "Finance"),
        "aiops": ("AI Operations", "Technology", "IT"),
        "revops": ("Revenue Operations", "Role", "Sales"),
        "devops": ("Development Operations", "Role", "IT"),
        "gis": ("Geospatial Analytics", "Technology", "Analytics"),
        "bfsi": ("Banking, Financial Services & Insurance", "Industry", "Finance")
    }

    @classmethod
    def expand_industry_synonyms(cls, ind_input: Any) -> List[str]:
        """Returns all keyword/phrase synonyms for a given industry string or list of industry strings."""
        if not ind_input:
            return []
        
        items = [ind_input] if isinstance(ind_input, str) else list(ind_input)
        results = []
        for item in items:
            if not item or not isinstance(item, str):
                continue
            clean = item.strip().lower()
            if not clean:
                continue
            results.append(clean)
            
            # Check direct match in INDUSTRY_SYNONYMS
            if clean in cls.INDUSTRY_SYNONYMS:
                results.extend(cls.INDUSTRY_SYNONYMS[clean])
            
            # Check normalized form
            norm = cls.normalize_industry(clean)
            if norm and norm.lower() in cls.INDUSTRY_SYNONYMS:
                results.extend(cls.INDUSTRY_SYNONYMS[norm.lower()])
                
            # Check sub-keys
            for k, syns in cls.INDUSTRY_SYNONYMS.items():
                if k in clean or any(s in clean for s in syns):
                    results.extend(syns)
                    
        return list(dict.fromkeys([r for r in results if r]))

    @classmethod
    def parse_natural_prompt(cls, prompt_text: Optional[str]) -> Dict[str, Any]:
        """
        AI Natural-Language Prompt Interpreter.
        Parses informal, abbreviated, or multi-attribute prompts (e.g. 'operations department and bfsi industry').
        Extracts departments, roles, seniorities, industries, locations, technologies, and search keywords.
        """
        if not prompt_text or not prompt_text.strip():
            return {
                "interpreted_department": "General",
                "inferred_departments": [],
                "inferred_roles": ["Executive Manager", "Director"],
                "inferred_seniorities": ["Manager", "Director"],
                "inferred_technologies": [],
                "normalized_abbreviations": [],
                "inferred_industries": [],
                "inferred_locations": [],
                "search_keywords": ["Manager", "Director"],
                "interpretation_summary": "General B2B Outreach Target"
            }

        text_raw = prompt_text.strip()
        text_lower = text_raw.lower()

        # Handle slash-separated roles (e.g. 'managers/directors' -> 'manager director')
        text_normalized = re.sub(r'(\b\w+)/(\w+\b)', r'\1 \2', text_lower)

        normalized_abbrs = []
        detected_techs = []
        detected_depts = []
        detected_seniorities = []
        detected_roles = []
        detected_industries = []
        detected_locations = []

        # 1. Process Abbreviation Map
        tokens = re.findall(r'\b[a-z0-9&\-\.]+\b', text_normalized)
        for tok in tokens:
            if tok in cls.ABBREVIATION_MAP:
                full_name, category, dept_hint = cls.ABBREVIATION_MAP[tok]
                abbr_label = f"{tok.upper()} → {full_name}"
                if abbr_label not in normalized_abbrs:
                    normalized_abbrs.append(abbr_label)
                if category == "Technology" and full_name not in detected_techs:
                    detected_techs.append(full_name)
                if category == "Department":
                    norm_dept = cls.normalize_department(dept_hint)
                    if norm_dept and norm_dept not in detected_depts:
                        detected_depts.append(norm_dept)
                if category == "Industry":
                    norm_ind = cls.normalize_industry(tok) or full_name
                    if norm_ind and norm_ind not in detected_industries:
                        detected_industries.append(norm_ind)

        # 2. Explicit & Keyword Department Extraction
        dept_pattern_matches = re.findall(r'(\b[\w\s&/-]+?)\s+department\b', text_normalized)
        for dpm in dept_pattern_matches:
            # Split by conjunctions
            sub_segments = [s.strip() for s in re.split(r'\b(?:and|or|for|with|in|from)\b|[,;]', dpm) if s.strip()]
            for seg in (sub_segments[-1:] if sub_segments else []):
                d_norm = cls.normalize_department(seg)
                if d_norm and d_norm not in detected_depts:
                    detected_depts.append(d_norm)

        for key, val in cls.DEPARTMENT_MAP.items():
            if re.search(r'\b' + re.escape(key) + r'\b', text_normalized):
                if val not in detected_depts:
                    detected_depts.append(val)

        detected_dept = detected_depts[0] if detected_depts else None

        # 3. Explicit & Keyword Industry Extraction
        ind_patterns = [
            r'(\b[\w\s&/-]+?)\s+(?:industry|sector|space|domain)\b',
            r'(?:industry|sector|domain):\s*([^,\n\)]+)',
            r'in\s+(?:the\s+)?([\w\s&/-]+?)\s+(?:industry|sector|space|domain)\b'
        ]
        for pat in ind_patterns:
            matches = re.findall(pat, text_normalized)
            for m in matches:
                sub_segments = [s.strip() for s in re.split(r'\b(?:and|or|for|with|in|from|department|dept)\b|[,;]', m) if s.strip()]
                for seg in (sub_segments[-1:] if sub_segments else []):
                    norm_ind = cls.normalize_industry(seg)
                    if norm_ind and norm_ind not in detected_industries:
                        detected_industries.append(norm_ind)
                    elif seg and seg.lower() not in ["the", "all", "any", "our", "my"] and len(seg) > 1 and seg.title() not in detected_industries:
                        detected_industries.append(seg.title())

        for key, ind_val in cls.INDUSTRY_MAP.items():
            if re.search(r'\b' + re.escape(key) + r'\b', text_normalized):
                if ind_val not in detected_industries:
                    detected_industries.append(ind_val)

        # 4. Country / Location Extraction
        for key, (cname, ccode) in cls.COUNTRY_MAP.items():
            if len(key) <= 2:
                matched = re.search(r'\b' + re.escape(key) + r'\b', text_normalized) is not None
            else:
                matched = key in text_normalized
            if matched and cname not in detected_locations:
                detected_locations.append(cname)

        # 5. Detect Seniorities
        for key, sen_val in cls.SENIORITY_MAP.items():
            if re.search(r'\b' + re.escape(key) + r's?\b', text_normalized):
                if sen_val not in detected_seniorities:
                    detected_seniorities.append(sen_val)

        if not detected_seniorities:
            if any(k in text_normalized for k in ["manager", "managers", "mgmt", "management"]):
                detected_seniorities.append("Manager")
            if any(k in text_normalized for k in ["director", "directors", "head", "lead"]):
                detected_seniorities.append("Director")
            if any(k in text_normalized for k in ["c-level", "chief", "cxo", "cfo", "cto", "ceo", "coo", "vp"]):
                detected_seniorities.append("C-Level")

        if not detected_seniorities:
            detected_seniorities = ["Manager", "Director"]

        # 6. Generate Target Candidate Roles
        dept_title = detected_dept if detected_dept and detected_dept != "General" else ""
        if detected_techs:
            tech_primary = detected_techs[0]
            for sen in detected_seniorities:
                detected_roles.append(f"{tech_primary} {sen}")
                if dept_title:
                    detected_roles.append(f"{dept_title} {sen} ({tech_primary})")
            detected_roles.append(f"{tech_primary} Lead")

        for sen in detected_seniorities:
            if dept_title == "Finance":
                for r in [f"Finance {sen}", f"Financial {sen}", "Financial Controller", "Head of Finance", f"FP&A {sen}"]:
                    if r not in detected_roles: detected_roles.append(r)
            elif dept_title == "HR":
                for r in [f"HR {sen}", f"Human Resources {sen}", "Head of Talent", f"Talent Acquisition {sen}"]:
                    if r not in detected_roles: detected_roles.append(r)
            elif dept_title == "Cybersecurity":
                for r in [f"Cybersecurity {sen}", f"Security {sen}", "CISO", f"Information Security {sen}"]:
                    if r not in detected_roles: detected_roles.append(r)
            elif dept_title == "Sales":
                for r in [f"Sales {sen}", f"Business Development {sen}", "BDO", "Head of Commercial"]:
                    if r not in detected_roles: detected_roles.append(r)
            elif dept_title == "IT":
                for r in [f"IT {sen}", f"Information Technology {sen}", f"DevOps {sen}", f"Infrastructure {sen}"]:
                    if r not in detected_roles: detected_roles.append(r)
            elif dept_title == "Operations":
                for r in [f"Operations {sen}", f"Director of Operations" if sen == "Director" else f"Operations {sen}", "Head of Operations", "COO"]:
                    if r not in detected_roles: detected_roles.append(r)
            elif dept_title:
                r = f"{dept_title} {sen}"
                if r not in detected_roles: detected_roles.append(r)
            else:
                r = f"{sen}"
                if r not in detected_roles: detected_roles.append(r)

        # 7. Generate Search Keywords (STRICTLY filter out grammar/meta stopwords like 'industry', 'department')
        meta_stopwords = {
            "find", "target", "outreach", "for", "the", "and", "in", "at", "with", "all", "management",
            "managers", "directors", "industry", "industries", "sector", "sectors", "department", "departments",
            "dept", "role", "roles", "level", "levels", "persona", "personas", "campaign", "search", "searching",
            "leads", "prospects", "only", "please", "sure", "make", "enter", "create", "creating", "from", "field"
        }
        keywords = []
        if detected_techs:
            keywords.extend(detected_techs)
        if detected_dept and detected_dept != "General":
            keywords.append(dept_title)
        for s in detected_seniorities:
            if s not in keywords: keywords.append(s)
        for tok in tokens:
            if len(tok) > 2 and tok.lower() not in meta_stopwords and tok.lower() not in [i.lower() for i in detected_industries]:
                clean_kw = tok.capitalize()
                if clean_kw not in keywords:
                    keywords.append(clean_kw)

        # 8. Summary
        summary_parts = []
        if detected_depts:
            summary_parts.append(f"Departments: {', '.join(detected_depts)}")
        if detected_industries:
            summary_parts.append(f"Industries: {', '.join(detected_industries)}")
        if detected_seniorities:
            summary_parts.append(f"Seniorities: {', '.join(detected_seniorities)}")
        if detected_locations:
            summary_parts.append(f"Locations: {', '.join(detected_locations)}")
        if detected_techs:
            summary_parts.append(f"Technologies: {', '.join(detected_techs)}")
        if normalized_abbrs:
            summary_parts.append(f"Normalized Abbreviations: {', '.join(normalized_abbrs)}")

        return {
            "interpreted_department": detected_dept or "General",
            "inferred_departments": detected_depts,
            "inferred_roles": detected_roles[:6],
            "inferred_seniorities": detected_seniorities,
            "inferred_technologies": detected_techs,
            "normalized_abbreviations": normalized_abbrs,
            "inferred_industries": detected_industries,
            "inferred_locations": detected_locations,
            "search_keywords": keywords[:8],
            "interpretation_summary": " · ".join(summary_parts) if summary_parts else f"Targeting {text_raw}"
        }

    @classmethod
    def normalize_department(cls, text: Optional[str]) -> Optional[str]:
        if not text:
            return None
        clean = text.strip().lower()
        if clean in cls.DEPARTMENT_MAP:
            return cls.DEPARTMENT_MAP[clean]
        for key, val in cls.DEPARTMENT_MAP.items():
            if key in clean:
                return val
        return text.strip().title()

    @classmethod
    def normalize_job_title_and_seniority(cls, title: Optional[str], dept_hint: Optional[str] = None) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """Returns (normalized_title, normalized_seniority, normalized_department)."""
        if not title:
            return (None, None, cls.normalize_department(dept_hint))

        clean_title = title.strip()
        lower_title = clean_title.lower()

        # Extract Seniority
        detected_seniority = None
        for key, val in cls.SENIORITY_MAP.items():
            if key in lower_title:
                detected_seniority = val
                break
        if not detected_seniority:
            detected_seniority = "Manager" if "manager" in lower_title else "Executive"

        # Extract Department
        detected_dept = cls.normalize_department(dept_hint)
        if not detected_dept or detected_dept == "General":
            detected_dept = cls.normalize_department(lower_title)

        return (clean_title, detected_seniority, detected_dept)

    @classmethod
    def normalize_country(cls, country_str: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
        """Returns (country_name, country_code)."""
        if not country_str:
            return (None, "")
        clean = country_str.strip().lower()
        if clean in cls.COUNTRY_MAP:
            return cls.COUNTRY_MAP[clean]
        for key, (cname, ccode) in cls.COUNTRY_MAP.items():
            if key in clean:
                return (cname, ccode)
        return (country_str.strip().title(), country_str.strip().upper()[:2])

    @classmethod
    def normalize_industry(cls, ind_str: Optional[str]) -> Optional[str]:
        if not ind_str:
            return None
        clean = ind_str.strip().lower()
        if clean in cls.INDUSTRY_MAP:
            return cls.INDUSTRY_MAP[clean]
        for key, val in cls.INDUSTRY_MAP.items():
            if key in clean:
                return val
        return ind_str.strip().title()

normalizer = DataNormalizer()
