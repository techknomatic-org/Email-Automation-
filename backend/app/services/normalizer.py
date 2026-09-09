from __future__ import annotations
import re
import difflib
from typing import Tuple, Optional, List, Dict, Any, Union, Set

class DataNormalizer:
    """
    Deterministic Data Normalization & Semantic Intent Engine.
    Maps variations, abbreviations, short forms, and typos of departments, job titles,
    seniorities, industries, locations, and countries to standard forms.
    """

    DEPARTMENT_MAP = {
        # Finance
        "finance": "Finance",
        "financial": "Finance",
        "fin": "Finance",
        "finacial": "Finance",
        "finace": "Finance",
        "accounting": "Finance",
        "accounts": "Finance",
        "accoutning": "Finance",
        "acounting": "Finance",
        "treasury": "Finance",
        "taxation": "Finance",
        "audit": "Finance",
        "fp&a": "Finance",
        "fpa": "Finance",
        
        # HR / People
        "hr": "HR",
        "human resources": "HR",
        "human resource": "HR",
        "people": "HR",
        "talent": "HR",
        "recruitment": "HR",
        "staffing": "HR",
        "personnel": "HR",
        
        # Procurement / SCM
        "procurement": "Procurement",
        "purchasing": "Procurement",
        "supply chain": "Procurement",
        "sourcing": "Procurement",
        "vendor": "Procurement",
        "scm": "Procurement",
        
        # Sales / Business Development
        "sales": "Sales",
        "business development": "Business Development",
        "biz dev": "Business Development",
        "bizdev": "Business Development",
        "bdo": "Business Development",
        "bd": "Business Development",
        "commercial": "Commercial",
        "revenue": "Revenue",
        "revops": "Revenue",
        "account executive": "Sales",
        "ae": "Sales",
        "sdr": "Sales",
        "bdr": "Sales",
        
        # Marketing
        "marketing": "Marketing",
        "mktg": "Marketing",
        "mrkt": "Marketing",
        "markting": "Marketing",
        "growth": "Marketing",
        "demand gen": "Marketing",
        "demand generation": "Marketing",
        "branding": "Marketing",
        
        # IT / Tech
        "it": "IT",
        "information technology": "IT",
        "tech": "IT",
        "technology": "IT",
        "technolgy": "IT",
        "techology": "IT",
        "infrastructure": "IT",
        "devops": "IT",
        "sysadmin": "IT",
        
        # Engineering / Software
        "engineering": "Engineering",
        "engineer": "Engineering",
        "eng": "Engineering",
        "engr": "Engineering",
        "software": "Engineering",
        "softwere": "Engineering",
        "sofware": "Engineering",
        "development": "Engineering",
        "developer": "Engineering",
        "dev": "Engineering",
        "r&d": "Engineering",
        
        # Cybersecurity
        "cybersecurity": "Cybersecurity",
        "cyber security": "Cybersecurity",
        "security": "Cybersecurity",
        "securty": "Cybersecurity",
        "information security": "Cybersecurity",
        "infosec": "Cybersecurity",
        "ciso": "Cybersecurity",
        
        # Legal & Compliance
        "legal": "Legal",
        "compliance": "Legal",
        "law": "Legal",
        
        # Operations
        "operations": "Operations",
        "operation": "Operations",
        "ops": "Operations",
        "oprations": "Operations",
        "operaton": "Operations",
        "opps": "Operations",
        
        # Customer Support / Success
        "customer support": "Customer Support",
        "customer service": "Customer Support",
        "customer success": "Customer Support",
        "support": "Customer Support",
        "suport": "Customer Support",
        "cs": "Customer Support",
        "cx": "Customer Support",
        "client success": "Customer Support"
    }

    SENIORITY_MAP = {
        # C-Level / Executives
        "c-level": "C-Level",
        "cxo": "C-Level",
        "csuite": "C-Level",
        "c-suite": "C-Level",
        "ceo": "C-Level",
        "cfo": "C-Level",
        "coo": "C-Level",
        "cto": "C-Level",
        "ciso": "C-Level",
        "cmo": "C-Level",
        "chro": "C-Level",
        "cio": "C-Level",
        "cdo": "C-Level",
        "cro": "C-Level",
        "chief": "C-Level",
        "president": "C-Level",
        "founder": "C-Level",
        "co-founder": "C-Level",
        "owner": "C-Level",
        
        # VP
        "vp": "VP",
        "vice president": "VP",
        "avp": "VP",
        "svp": "VP",
        "evp": "VP",
        
        # Director / Head
        "director": "Director",
        "directer": "Director",
        "directr": "Director",
        "dir": "Director",
        "head": "Director",
        
        # Manager
        "manager": "Manager",
        "manger": "Manager",
        "managr": "Manager",
        "mgr": "Manager",
        "mngr": "Manager",
        "management": "Manager",
        
        # Senior / Lead
        "lead": "Senior",
        "senior": "Senior",
        "sen": "Senior",
        "sr": "Senior",
        "snr": "Senior",
        "principal": "Senior",
        "staff": "Senior",
        
        # Specialists & Officers
        "specialist": "Specialist",
        "analyst": "Analyst",
        "officer": "Officer",
        "executive": "Executive",
        "exec": "Executive",
        "associate": "Associate",
        "assistant": "Assistant"
    }

    COUNTRY_MAP = {
        # Japan & East Asia Hubs
        "japan": ("Japan", "JP"),
        "japn": ("Japan", "JP"),
        "jp": ("Japan", "JP"),
        "jpn": ("Japan", "JP"),
        "tokyo": ("Japan", "JP"),
        "osaka": ("Japan", "JP"),
        "kyoto": ("Japan", "JP"),
        "yokohama": ("Japan", "JP"),
        "nagoya": ("Japan", "JP"),
        "korea": ("South Korea", "KR"),
        "south korea": ("South Korea", "KR"),
        "seoul": ("South Korea", "KR"),
        "kr": ("South Korea", "KR"),
        "china": ("China", "CN"),
        "beijing": ("China", "CN"),
        "shanghai": ("China", "CN"),
        "shenzhen": ("China", "CN"),
        "cn": ("China", "CN"),
        "hong kong": ("Hong Kong", "HK"),
        "hk": ("Hong Kong", "HK"),
        "taiwan": ("Taiwan", "TW"),
        "taipei": ("Taiwan", "TW"),
        "tw": ("Taiwan", "TW"),
        
        # Saudi Arabia & GCC / Middle East
        "saudi arabia": ("Saudi Arabia", "SA"),
        "saudi": ("Saudi Arabia", "SA"),
        "ksa": ("Saudi Arabia", "SA"),
        "riyadh": ("Saudi Arabia", "SA"),
        "jeddah": ("Saudi Arabia", "SA"),
        "qatar": ("Qatar", "QA"),
        "doha": ("Qatar", "QA"),
        "kuwait": ("Kuwait", "KW"),
        "bahrain": ("Bahrain", "BH"),
        "oman": ("Oman", "OM"),
        "muscat": ("Oman", "OM"),

        # France & Europe Hubs
        "france": ("France", "FR"),
        "paris": ("France", "FR"),
        "fr": ("France", "FR"),
        "italy": ("Italy", "IT"),
        "rome": ("Italy", "IT"),
        "milan": ("Italy", "IT"),
        "spain": ("Spain", "ES"),
        "madrid": ("Spain", "ES"),
        "barcelona": ("Spain", "ES"),
        "es": ("Spain", "ES"),
        "netherlands": ("Netherlands", "NL"),
        "amsterdam": ("Netherlands", "NL"),
        "holland": ("Netherlands", "NL"),
        "nl": ("Netherlands", "NL"),
        "switzerland": ("Switzerland", "CH"),
        "zurich": ("Switzerland", "CH"),
        "geneva": ("Switzerland", "CH"),
        "ch": ("Switzerland", "CH"),
        "sweden": ("Sweden", "SE"),
        "stockholm": ("Sweden", "SE"),
        "norway": ("Norway", "NO"),
        "oslo": ("Norway", "NO"),
        "denmark": ("Denmark", "DK"),
        "copenhagen": ("Denmark", "DK"),
        "finland": ("Finland", "FI"),
        "helsinki": ("Finland", "FI"),
        "poland": ("Poland", "PL"),
        "warsaw": ("Poland", "PL"),
        "belgium": ("Belgium", "BE"),
        "brussels": ("Belgium", "BE"),
        "austria": ("Austria", "AT"),
        "vienna": ("Austria", "AT"),
        "ireland": ("Ireland", "IE"),
        "dublin": ("Ireland", "IE"),

        # Southeast Asia Hubs
        "malaysia": ("Malaysia", "MY"),
        "kuala lumpur": ("Malaysia", "MY"),
        "my": ("Malaysia", "MY"),
        "indonesia": ("Indonesia", "ID"),
        "jakarta": ("Indonesia", "ID"),
        "id": ("Indonesia", "ID"),
        "philippines": ("Philippines", "PH"),
        "manila": ("Philippines", "PH"),
        "ph": ("Philippines", "PH"),
        "thailand": ("Thailand", "TH"),
        "bangkok": ("Thailand", "TH"),
        "th": ("Thailand", "TH"),
        "vietnam": ("Vietnam", "VN"),
        "hanoi": ("Vietnam", "VN"),

        # Americas & Others
        "brazil": ("Brazil", "BR"),
        "sao paulo": ("Brazil", "BR"),
        "mexico": ("Mexico", "MX"),
        "mexico city": ("Mexico", "MX"),
        "south africa": ("South Africa", "ZA"),
        "israel": ("Israel", "IL"),
        "tel aviv": ("Israel", "IL"),
        "new zealand": ("New Zealand", "NZ"),
        "auckland": ("New Zealand", "NZ"),

        # India & Indian Tech Hubs
        "india": ("India", "IN"),
        "in": ("India", "IN"),
        "ind": ("India", "IN"),
        "indai": ("India", "IN"),
        "idia": ("India", "IN"),
        "mumbai": ("India", "IN"),
        "delhi": ("India", "IN"),
        "bangalore": ("India", "IN"),
        "bengaluru": ("India", "IN"),
        "hyderabad": ("India", "IN"),
        "pune": ("India", "IN"),
        "chennai": ("India", "IN"),
        "gurgaon": ("India", "IN"),
        "noida": ("India", "IN"),
        
        # UAE & Middle East Hubs
        "uae": ("UAE", "UAE"),
        "united arab emirates": ("UAE", "UAE"),
        "dubai": ("UAE", "UAE"),
        "dubay": ("UAE", "UAE"),
        "abu dhabi": ("UAE", "UAE"),
        "abudhabi": ("UAE", "UAE"),
        "sharjah": ("UAE", "UAE"),
        "emirates": ("UAE", "UAE"),
        "emirats": ("UAE", "UAE"),
        
        # United States & US Hubs
        "us": ("United States", "US"),
        "usa": ("United States", "US"),
        "united states": ("United States", "US"),
        "united states of america": ("United States", "US"),
        "america": ("United States", "US"),
        "amrica": ("United States", "US"),
        "ny": ("United States", "US"),
        "nyc": ("United States", "US"),
        "new york": ("United States", "US"),
        "california": ("United States", "US"),
        "ca": ("United States", "US"),
        "san francisco": ("United States", "US"),
        "sf": ("United States", "US"),
        "los angeles": ("United States", "US"),
        "la": ("United States", "US"),
        "texas": ("United States", "US"),
        "tx": ("United States", "US"),
        "austin": ("United States", "US"),
        "chicago": ("United States", "US"),
        "seattle": ("United States", "US"),
        "florida": ("United States", "US"),
        "boston": ("United States", "US"),
        
        # Germany & Europe
        "germany": ("Germany", "DE"),
        "germny": ("Germany", "DE"),
        "de": ("Germany", "DE"),
        "deutschland": ("Germany", "DE"),
        "berlin": ("Germany", "DE"),
        "munich": ("Germany", "DE"),
        "frankfurt": ("Germany", "DE"),
        
        # United Kingdom
        "uk": ("United Kingdom", "UK"),
        "united kingdom": ("United Kingdom", "UK"),
        "great britain": ("United Kingdom", "UK"),
        "england": ("United Kingdom", "UK"),
        "london": ("United Kingdom", "UK"),
        "gb": ("United Kingdom", "UK"),
        
        # Singapore
        "singapore": ("Singapore", "SG"),
        "singapor": ("Singapore", "SG"),
        "sg": ("Singapore", "SG"),
        
        # Canada
        "canada": ("Canada", "CA"),
        "toronto": ("Canada", "CA"),
        "vancouver": ("Canada", "CA"),
        "montreal": ("Canada", "CA"),
        
        # Australia
        "australia": ("Australia", "AU"),
        "au": ("Australia", "AU"),
        "aus": ("Australia", "AU"),
        "sydney": ("Australia", "AU"),
        "melbourne": ("Australia", "AU")
    }

    INDUSTRY_MAP = {
        # BFSI
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
        
        # Healthcare & Life Sciences
        "healthcare": "Healthcare",
        "healtcare": "Healthcare",
        "helthcare": "Healthcare",
        "health care": "Healthcare",
        "hospital": "Healthcare",
        "medical": "Healthcare",
        "pharma": "Healthcare",
        "pharmaceutical": "Healthcare",
        "pharmaceuticals": "Healthcare",
        "pharmaceutcal": "Healthcare",
        "biotech": "Healthcare",
        "life sciences": "Healthcare",
        "clinic": "Healthcare",
        "medtech": "Healthcare",
        "healthtech": "Healthcare",
        
        # Logistics & Supply Chain
        "logistics": "Logistics",
        "logisics": "Logistics",
        "logistcs": "Logistics",
        "shipping": "Logistics",
        "transport": "Logistics",
        "transportation": "Logistics",
        "transpot": "Logistics",
        "freight": "Logistics",
        "supply chain": "Logistics",
        "warehouse": "Logistics",
        "distribution": "Logistics",
        "cargo": "Logistics",
        "courier": "Logistics",
        
        # Manufacturing
        "manufacturing": "Manufacturing",
        "manufacuring": "Manufacturing",
        "manufaturing": "Manufacturing",
        "factory": "Manufacturing",
        "industrial": "Manufacturing",
        "plastics": "Manufacturing",
        "production": "Manufacturing",
        "machinery": "Manufacturing",
        
        # Automotive
        "automotive": "Automotive",
        "automobile": "Automotive",
        "auto": "Automotive",
        "vehicles": "Automotive",
        
        # SaaS & Tech
        "saas": "SaaS",
        "software": "SaaS",
        "sofware": "SaaS",
        "softwere": "SaaS",
        "cloud": "SaaS",
        "it": "IT",
        "information technology": "IT",
        "tech": "IT",
        "technology": "IT",
        "technolgy": "IT",
        "techology": "IT",
        "msp": "IT",
        
        # Cybersecurity
        "cybersecurity": "Cybersecurity",
        "cyber security": "Cybersecurity",
        "security": "Cybersecurity",
        "infosec": "Cybersecurity",
        
        # Retail & E-Commerce
        "retail": "Retail",
        "retial": "Retail",
        "reteil": "Retail",
        "e-commerce": "Retail",
        "ecommerce": "Retail",
        "ecom": "Retail",
        "fmcg": "Retail",
        "consumer goods": "Retail",
        "supermarket": "Retail",
        
        # Real Estate
        "real estate": "Real Estate",
        "realestate": "Real Estate",
        "property": "Real Estate",
        "proptech": "Real Estate",
        "construction": "Real Estate",
        "realty": "Real Estate",
        "property developer": "Real Estate",
        "real estate developer": "Real Estate",
        
        # Oil & Gas / Energy
        "oil & gas": "Oil & Gas",
        "oil and gas": "Oil & Gas",
        "petroleum": "Oil & Gas",
        "energy": "Energy",
        "utilities": "Energy",
        "power generation": "Energy",
        "power sector": "Energy",
        
        # Government
        "government": "Government",
        "gov": "Government",
        "govt": "Government",
        "public sector": "Government",
        
        # Education
        "education": "Education",
        "educaton": "Education",
        "academic": "Education",
        "university": "Education",
        "college": "Education",
        "edtech": "Education",
        
        # Hospitality
        "hospitality": "Hospitality",
        "hotel": "Hospitality",
        "resort": "Hospitality",
        "tourism": "Hospitality",
        "travel": "Hospitality",
        
        # Telecom & Media
        "telecom": "Telecom",
        "telecommunications": "Telecom",
        "media": "Media",
        "entertainment": "Media",
        
        # Professional Services
        "legal": "Legal",
        "law": "Legal",
        "consulting": "Consulting"
    }

    INDUSTRY_SYNONYMS = {
        "bfsi": ["bfsi", "banking", "finance", "financial", "financial services", "insurance", "fintech", "bank", "wealth management", "investment banking", "capital markets", "nbfc", "credit union"],
        "banking": ["banking", "bank", "financial services", "finance", "bfsi", "fintech", "wealth management", "investment banking", "credit union", "nbfc"],
        "finance": ["finance", "financial", "financial services", "banking", "bfsi", "fintech", "accounting", "wealth management"],
        "insurance": ["insurance", "bfsi", "financial services", "underwriting", "actuarial"],
        "healthcare": ["healthcare", "health care", "hospital", "medical", "pharma", "pharmaceutical", "clinic", "biotech", "life sciences", "medtech", "healthtech"],
        "it": ["it", "information technology", "tech", "technology", "software", "saas", "it services", "it / msp", "msp", "cloud", "developer", "digital"],
        "saas": ["saas", "software", "cloud", "tech", "technology", "it", "platform", "b2b software"],
        "cybersecurity": ["cybersecurity", "security", "infosec", "information security", "ciso", "network security"],
        "government": ["government", "gov", "govt", "public sector", "judicial", "ministry", "dept of", "department of", "municipality", "state", "federal"],
        "education": ["education", "academic", "university", "college", "school", "institute", "faculty", "higher education", "edtech"],
        "retail": ["retail", "ecommerce", "e-commerce", "ecom", "supermarket", "consumer goods", "fmcg", "store", "grocer", "merchandise", "apparel"],
        "hospitality": ["hospitality", "hotel", "resort", "tourism", "travel", "restaurant", "catering", "lodging"],
        "manufacturing": ["manufacturing", "factory", "industrial", "production", "plastics", "machinery", "fabrication", "assembly"],
        "logistics": ["logistics", "supply chain", "shipping", "transport", "transportation", "freight", "cargo", "courier", "warehouse", "distribution", "scm"],
        "real estate": ["real estate", "property", "realty", "construction", "developer", "contracting", "building", "housing", "proptech"],
        "oil & gas": ["oil & gas", "oil and gas", "petroleum", "energy", "refinery", "drilling", "offshore", "hydrocarbon", "gas"],
        "telecom": ["telecom", "telecommunications", "cellular", "wireless", "broadband", "network operator"],
        "automotive": ["automotive", "automobile", "auto", "vehicles", "motors", "car manufacturer", "dealership"],
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
        "cs": ("Customer Support", "Department", "Customer Support"),
        "bdo": ("Business Development Officer", "Role", "Sales"),
        "bd": ("Business Development", "Department", "Business Development"),
        "bizdev": ("Business Development", "Department", "Business Development"),
        "ae": ("Account Executive", "Role", "Sales"),
        "sdr": ("Sales Development Representative", "Role", "Sales"),
        "bdr": ("Business Development Representative", "Role", "Sales"),
        "mgr": ("Manager", "Seniority", "Manager"),
        "mngr": ("Manager", "Seniority", "Manager"),
        "dir": ("Director", "Seniority", "Director"),
        "sr": ("Senior", "Seniority", "Senior"),
        "snr": ("Senior", "Seniority", "Senior"),
        "vp": ("Vice President", "Seniority", "VP"),
        "avp": ("Assistant Vice President", "Seniority", "VP"),
        "svp": ("Senior Vice President", "Seniority", "VP"),
        "evp": ("Executive Vice President", "Seniority", "VP"),
        "eng": ("Engineering", "Department", "Engineering"),
        "engr": ("Engineer", "Role", "Engineering"),
        "dev": ("Developer", "Role", "Engineering"),
        "mktg": ("Marketing", "Department", "Marketing"),
        "mrkt": ("Marketing", "Department", "Marketing"),
        "ops": ("Operations", "Department", "Operations"),
        "fin": ("Finance", "Department", "Finance"),
        "fp&a": ("Financial Planning & Analysis", "Department", "Finance"),
        "fpa": ("Financial Planning & Analysis", "Department", "Finance"),
        "ciso": ("Chief Information Security Officer", "Role", "Cybersecurity"),
        "cfo": ("Chief Financial Officer", "Role", "Finance"),
        "cto": ("Chief Technology Officer", "Role", "IT"),
        "ceo": ("Chief Executive Officer", "Role", "Executive"),
        "coo": ("Chief Operating Officer", "Role", "Operations"),
        "chro": ("Chief HR Officer", "Role", "HR"),
        "cmo": ("Chief Marketing Officer", "Role", "Marketing"),
        "cio": ("Chief Information Officer", "Role", "IT"),
        "cro": ("Chief Revenue Officer", "Role", "Revenue"),
        "bi": ("Business Intelligence", "Technology", "Finance"),
        "aiops": ("AI Operations", "Technology", "IT"),
        "revops": ("Revenue Operations", "Role", "Sales"),
        "devops": ("Development Operations", "Role", "IT"),
        "gis": ("Geospatial Analytics", "Technology", "Analytics"),
        "bfsi": ("Banking, Financial Services & Insurance", "Industry", "Finance"),
        "fmcg": ("Fast-Moving Consumer Goods", "Industry", "Retail"),
        "scm": ("Supply Chain Management", "Department", "Procurement")
    }

    COMMON_STOPWORDS = {
        "find", "send", "from", "with", "that", "this", "lead", "leads", "pool", "pools",
        "test", "name", "help", "make", "sure", "need", "have", "team", "user", "users",
        "role", "roles", "dept", "cost", "work", "show", "plan", "view", "open", "reach",
        "good", "well", "best", "some", "more", "most", "also", "into", "over", "such",
        "power", "free", "full", "data", "file", "list", "card", "step", "page", "done",
        "expert", "experts", "focus", "other", "about", "their", "there", "these", "those"
    }

    @classmethod
    def fuzzy_resolve(cls, token: str, lookup_dict: Dict[str, Any], cutoff: float = 0.84) -> Optional[Any]:
        """Resolves exact or typo/misspelled terms against standard vocabulary using difflib."""
        if not token or len(token) < 2:
            return None
        clean = token.strip().lower()
        if clean in lookup_dict:
            return lookup_dict[clean]
        
        # Disallow fuzzy matching on common english stopwords or short tokens < 4 characters
        if len(clean) < 4 or clean in cls.COMMON_STOPWORDS:
            return None
        
        # Only check candidate keys of length >= 4 and similar length
        candidate_keys = [k for k in lookup_dict.keys() if len(k) >= 4 and abs(len(k) - len(clean)) <= 2]
        matches = difflib.get_close_matches(clean, candidate_keys, n=1, cutoff=cutoff)
        if matches:
            return lookup_dict[matches[0]]
        return None

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
            
            # 1. Direct dictionary match
            if clean in cls.INDUSTRY_SYNONYMS:
                results.extend(cls.INDUSTRY_SYNONYMS[clean])
            
            # 2. Normalized industry match
            norm = cls.normalize_industry(clean)
            if norm:
                norm_lower = norm.lower()
                results.append(norm_lower)
                if norm_lower in cls.INDUSTRY_SYNONYMS:
                    results.extend(cls.INDUSTRY_SYNONYMS[norm_lower])
                
            # 3. Exact word boundary match on keys (avoid substring collisions like 'state' in 'real estate')
            for k, syns in cls.INDUSTRY_SYNONYMS.items():
                if re.search(r'\b' + re.escape(k) + r'\b', clean):
                    results.extend(syns)
                    
        return list(dict.fromkeys([r for r in results if r]))

    @classmethod
    def parse_natural_prompt(cls, prompt_text: Optional[str]) -> Dict[str, Any]:
        """
        AI Natural-Language Prompt Interpreter.
        Parses informal, abbreviated, multi-attribute, or typo-filled prompts:
        (e.g., 'looking for customer support mangers in UAE in bfsi indusry', 'target CEOs in US and UK', 'procurement and scm heads').
        Extracts departments, roles, seniorities, industries, locations/countries, technologies, and search keywords.
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

        # Handle slash/hyphen separated tokens (e.g. 'managers/directors' -> 'managers directors')
        text_normalized = re.sub(r'(\b\w+)/(\w+\b)', r'\1 \2', text_lower)
        text_normalized = re.sub(r'[\(\)\[\]\{\},;:"]', ' ', text_normalized)

        normalized_abbrs = []
        detected_techs = []
        detected_depts = []
        detected_seniorities = []
        detected_roles = []
        detected_industries = []
        detected_locations = []

        tokens = re.findall(r'\b[a-z0-9&\-\.]+\b', text_normalized)

        # 0. Check Multi-word Phrases First
        if "biz dev" in text_normalized or "bizdev" in text_normalized or "business development" in text_normalized:
            if "Business Development" not in detected_depts:
                detected_depts.append("Business Development")
            if "BIZ DEV → Business Development" not in normalized_abbrs:
                normalized_abbrs.append("BIZ DEV → Business Development")

        if "power bi" in text_normalized or "powerbi" in text_normalized:
            if "Power BI" not in detected_techs:
                detected_techs.append("Power BI")
            if "Finance" not in detected_depts:
                detected_depts.append("Finance")

        if "customer support" in text_normalized or "customer service" in text_normalized or "customer success" in text_normalized or "customer experience" in text_normalized:
            if "Customer Support" not in detected_depts:
                detected_depts.append("Customer Support")

        # 1. Process Abbreviation Map with Spell-Correction Tolerance
        for tok in tokens:
            # Avoid 'dev' colliding when part of 'biz dev'
            if tok == "dev" and ("biz dev" in text_normalized or "bizdev" in text_normalized):
                continue

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
                if category == "Seniority":
                    norm_sen = cls.SENIORITY_MAP.get(tok) or full_name
                    if norm_sen and norm_sen not in detected_seniorities:
                        detected_seniorities.append(norm_sen)
                if category == "Role":
                    if full_name not in detected_roles:
                        detected_roles.append(full_name)
                    norm_dept = cls.normalize_department(dept_hint)
                    if norm_dept and norm_dept not in detected_depts:
                        detected_depts.append(norm_dept)
                if category == "Industry":
                    norm_ind = cls.normalize_industry(tok) or full_name
                    if norm_ind and norm_ind not in detected_industries:
                        detected_industries.append(norm_ind)

        # 2. Location / Country / City Extraction (with Typo Tolerance)
        # Check phrase matches first (e.g., 'united states', 'united arab emirates', 'abu dhabi', 'san francisco', 'saudi arabia', 'hong kong', 'new york')
        for key, (cname, ccode) in cls.COUNTRY_MAP.items():
            if " " in key and key in text_normalized:
                if cname not in detected_locations:
                    detected_locations.append(cname)

        # Check location prefix patterns (e.g. 'from Japan', 'in India', 'in UAE', 'in US', 'based in Tokyo')
        loc_prefix_pattern = r'\b(?:in|at|from|to|located in|location|country|region|geography|based in)\s+([a-z\s]+)'
        prefix_matches = re.findall(loc_prefix_pattern, text_normalized)
        for pm in prefix_matches:
            pm_tokens = pm.strip().split()[:3]
            for ptok in pm_tokens:
                if len(ptok) <= 2 and ptok in ("in", "to", "at", "on", "as", "by", "of", "or", "an", "is", "it", "my", "we", "he", "so", "do", "no", "if", "be", "from", "for"):
                    continue
                if ptok in cls.COUNTRY_MAP:
                    cname, _ = cls.COUNTRY_MAP[ptok]
                    if cname not in detected_locations:
                        detected_locations.append(cname)
                else:
                    loc_res = cls.fuzzy_resolve(ptok, cls.COUNTRY_MAP, cutoff=0.82)
                    if loc_res:
                        cname, _ = loc_res
                        if cname not in detected_locations:
                            detected_locations.append(cname)

        for tok in tokens:
            if len(tok) <= 2:
                # Disallow common 2-letter english stopwords from triggering country matches
                if tok in ("in", "to", "at", "on", "as", "by", "of", "or", "an", "is", "it", "my", "we", "he", "so", "do", "no", "if", "be", "from", "for"):
                    continue
                if tok in cls.COUNTRY_MAP:
                    cname, _ = cls.COUNTRY_MAP[tok]
                    if cname not in detected_locations:
                        detected_locations.append(cname)
            else:
                if tok in cls.COUNTRY_MAP:
                    cname, _ = cls.COUNTRY_MAP[tok]
                    if cname not in detected_locations:
                        detected_locations.append(cname)
                else:
                    loc_res = cls.fuzzy_resolve(tok, cls.COUNTRY_MAP, cutoff=0.82)
                    if loc_res:
                        cname, _ = loc_res
                        if cname not in detected_locations:
                            detected_locations.append(cname)

        # Check explicit uppercase country code tokens in raw text (e.g. "IN", "US", "UK", "DE", "AE")
        raw_upper_tokens = re.findall(r'\b[A-Z]{2}\b', text_raw)
        for u_tok in raw_upper_tokens:
            u_lower = u_tok.lower()
            if u_lower in cls.COUNTRY_MAP:
                cname, _ = cls.COUNTRY_MAP[u_lower]
                if cname not in detected_locations:
                    detected_locations.append(cname)

        # 3. Department Extraction (with Typo Tolerance)
        # Check explicit patterns e.g. '<name> department' or '<name> dept'
        dept_pattern_matches = re.findall(r'(\b[\w\s&/-]+?)\s+(?:department|dept|division|team)\b', text_normalized)
        for dpm in dept_pattern_matches:
            sub_segments = [s.strip() for s in re.split(r'\b(?:and|or|for|with|in|from|to)\b|[,;]', dpm) if s.strip()]
            for seg in (sub_segments[-1:] if sub_segments else []):
                d_norm = cls.normalize_department(seg)
                if d_norm and d_norm not in detected_depts:
                    detected_depts.append(d_norm)

        for tok in tokens:
            if tok == "dev" and ("biz dev" in text_normalized or "bizdev" in text_normalized):
                continue
            dept_res = cls.fuzzy_resolve(tok, cls.DEPARTMENT_MAP, cutoff=0.82)
            if dept_res and dept_res not in detected_depts:
                detected_depts.append(dept_res)

        # Check multi-word department keys
        for key, val in cls.DEPARTMENT_MAP.items():
            if " " in key and key in text_normalized and val not in detected_depts:
                detected_depts.append(val)

        detected_dept = detected_depts[0] if detected_depts else None

        # 4. Industry Extraction (with Typo Tolerance)
        ind_patterns = [
            r'(\b[\w\s&/-]+?)\s+(?:industry|sector|space|domain|vertical)\b',
            r'(?:industry|sector|domain|vertical):\s*([^,\n\)]+)',
            r'in\s+(?:the\s+)?([\w\s&/-]+?)\s+(?:industry|sector|space|domain)\b'
        ]
        for pat in ind_patterns:
            matches = re.findall(pat, text_normalized)
            for m in matches:
                sub_segments = [s.strip() for s in re.split(r'\b(?:and|or|for|with|in|from|department|dept|team)\b|[,;]', m) if s.strip()]
                for raw_seg in (sub_segments[-1:] if sub_segments else []):
                    seg = re.sub(r'^(?:having|have|the|a|an|with|of|to|is|are|our|your|targeting|target|want|need|looking for|in|for|from|as)\s+', '', raw_seg.strip(), flags=re.IGNORECASE).strip()
                    seg = re.sub(r'^(?:the|a|an)\s+', '', seg, flags=re.IGNORECASE).strip()
                    if not seg:
                        continue
                    norm_ind = cls.normalize_industry(seg)
                    if norm_ind and norm_ind not in detected_industries:
                        detected_industries.append(norm_ind)
                    elif seg and seg.lower() not in ["the", "all", "any", "our", "my", "this", "having", "with", "want", "need"] and len(seg) > 2 and seg.title() not in detected_industries:
                        detected_industries.append(seg.title())

        for tok in tokens:
            ind_res = cls.fuzzy_resolve(tok, cls.INDUSTRY_MAP, cutoff=0.82)
            if ind_res and ind_res not in detected_industries:
                detected_industries.append(ind_res)

        for key, ind_val in cls.INDUSTRY_MAP.items():
            if " " in key and key in text_normalized and ind_val not in detected_industries:
                detected_industries.append(ind_val)

        # 5. Seniority Extraction (with Typo Tolerance)
        for tok in tokens:
            sen_res = cls.fuzzy_resolve(tok, cls.SENIORITY_MAP, cutoff=0.82)
            if sen_res and sen_res not in detected_seniorities:
                detected_seniorities.append(sen_res)

        # Check multi-word seniorities
        for key, sen_val in cls.SENIORITY_MAP.items():
            if " " in key and key in text_normalized and sen_val not in detected_seniorities:
                detected_seniorities.append(sen_val)

        if not detected_seniorities:
            detected_seniorities = ["Manager", "Director"]

        # 6. Target Persona / Candidate Roles Generation
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
                for r in [f"Sales {sen}", f"Business Development {sen}", "BDO", "Head of Commercial", f"Account Executive"]:
                    if r not in detected_roles: detected_roles.append(r)
            elif dept_title == "IT":
                for r in [f"IT {sen}", f"Information Technology {sen}", f"DevOps {sen}", f"Infrastructure {sen}"]:
                    if r not in detected_roles: detected_roles.append(r)
            elif dept_title == "Operations":
                for r in [f"Operations {sen}", "Director of Operations" if sen == "Director" else f"Operations {sen}", "Head of Operations", "COO"]:
                    if r not in detected_roles: detected_roles.append(r)
            elif dept_title == "Customer Support":
                for r in [f"Customer Support {sen}", f"Customer Service {sen}", f"Support {sen}", f"Customer Success {sen}"]:
                    if r not in detected_roles: detected_roles.append(r)
            elif dept_title:
                r = f"{dept_title} {sen}"
                if r not in detected_roles: detected_roles.append(r)
            else:
                r = f"{sen}"
                if r not in detected_roles: detected_roles.append(r)

        # 7. Generate Search Keywords (Filtering out generic stopwords)
        meta_stopwords = {
            "find", "target", "outreach", "for", "the", "and", "in", "at", "with", "all", "management",
            "managers", "directors", "industry", "industries", "sector", "sectors", "department", "departments",
            "dept", "role", "roles", "level", "levels", "persona", "personas", "campaign", "search", "searching",
            "leads", "prospects", "only", "please", "sure", "make", "enter", "create", "creating", "from", "field",
            "looking", "connect", "reach", "who", "whom", "targetted", "targeted", "having", "have", "want", "need",
            "directr", "manger", "softwere", "enginer", "oprations"
        }
        keywords = []
        if detected_techs:
            keywords.extend(detected_techs)
        if dept_title:
            keywords.append(dept_title)
        for s in detected_seniorities:
            if s not in keywords: keywords.append(s)
        for tok in tokens:
            if len(tok) > 2 and tok.lower() not in meta_stopwords and tok.lower() not in [i.lower() for i in detected_industries]:
                clean_kw = tok.capitalize()
                if clean_kw not in keywords:
                    keywords.append(clean_kw)

        # 8. Summary Generation
        summary_parts = []
        if detected_roles:
            summary_parts.append(f"Target Roles: {', '.join(detected_roles[:3])}")
        if detected_depts:
            summary_parts.append(f"Departments: {', '.join(detected_depts)}")
        if detected_industries:
            summary_parts.append(f"Industries: {', '.join(detected_industries)}")
        if detected_locations:
            summary_parts.append(f"Locations: {', '.join(detected_locations)}")
        if detected_techs:
            summary_parts.append(f"Technologies: {', '.join(detected_techs)}")
        if normalized_abbrs:
            summary_parts.append(f"Normalized: {', '.join(normalized_abbrs)}")

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
        res = cls.fuzzy_resolve(clean, cls.DEPARTMENT_MAP, cutoff=0.80)
        if res:
            return res
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
        for word in lower_title.split():
            sen_match = cls.fuzzy_resolve(word, cls.SENIORITY_MAP, cutoff=0.82)
            if sen_match:
                detected_seniority = sen_match
                break
        if not detected_seniority:
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
        res = cls.fuzzy_resolve(clean, cls.COUNTRY_MAP, cutoff=0.82)
        if res:
            return res
        for key, (cname, ccode) in cls.COUNTRY_MAP.items():
            if key in clean:
                return (cname, ccode)
        return (country_str.strip().title(), country_str.strip().upper()[:2])

    @classmethod
    def normalize_industry(cls, ind_str: Optional[str]) -> Optional[str]:
        if not ind_str:
            return None
        clean = ind_str.strip().lower()
        res = cls.fuzzy_resolve(clean, cls.INDUSTRY_MAP, cutoff=0.80)
        if res:
            return res
        for key, val in cls.INDUSTRY_MAP.items():
            if key in clean:
                return val
        return ind_str.strip().title()

normalizer = DataNormalizer()
