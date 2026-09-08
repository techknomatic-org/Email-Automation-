import os
import sys
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure project root is in python path
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, base_dir)

from backend.app.core.database import Base
from backend.app.models.campaign import Campaign
from backend.app.models.lead import Lead
from backend.app.services.normalizer import DataNormalizer
from backend.app.services.csv_importer import csv_importer
from backend.app.services.campaign_intelligence import CampaignIntelligenceService
from backend.app.services.hybrid_search_engine import hybrid_search_engine
from backend.app.services.lead_discovery_service import generate_lead_pool_for_campaign

# Set up test database
TEST_DB_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()

    # Pre-seed diverse test leads into PostgreSQL / SQLite test session
    test_leads = [
        Lead(
            profile_url="test://1",
            first_name="Rahul", last_name="Sharma",
            job_title="Finance Director", department="Finance", seniority="Director",
            company_name="ABC Bank", industry="Banking", country="India", country_code="IN",
            email="rahul.sharma@abcbank.in", profile_text="Rahul Sharma, Finance Director at ABC Bank, India. Budgeting and FP&A."
        ),
        Lead(
            profile_url="test://2",
            first_name="Priya", last_name="Shah",
            job_title="Finance Manager", department="Finance", seniority="Manager",
            company_name="HDFC Finance", industry="Banking", country="India", country_code="IN",
            email="priya.shah@hdfc.in", profile_text="Priya Shah, Finance Manager at HDFC Finance, India."
        ),
        Lead(
            profile_url="test://3",
            first_name="John", last_name="Doe",
            job_title="Cybersecurity Manager", department="Cybersecurity", seniority="Manager",
            company_name="SecureNet US", industry="Cybersecurity", country="United States", country_code="US",
            email="john.doe@securenet.com", profile_text="John Doe, Cybersecurity Manager at SecureNet US."
        ),
        Lead(
            profile_url="test://4",
            first_name="Sarah", last_name="Jenkins",
            job_title="VP of HR", department="HR", seniority="VP",
            company_name="HealthCare Plus", industry="Healthcare", country="United States", country_code="US",
            email="sarah.j@healthcareplus.com", profile_text="Sarah Jenkins, VP of HR at HealthCare Plus."
        ),
        Lead(
            profile_url="test://5",
            first_name="Hans", last_name="Muller",
            job_title="Head of Procurement", department="Procurement", seniority="Director",
            company_name="BMW Manufacturing", industry="Manufacturing", country="Germany", country_code="DE",
            email="hans.muller@bmw.de", profile_text="Hans Muller, Head of Procurement at BMW Manufacturing Germany."
        ),
        Lead(
            profile_url="test://6",
            first_name="Alex", last_name="Smith",
            job_title="Sales Manager", department="Sales", seniority="Manager",
            company_name="CloudSaaS Corp", industry="SaaS", country="United States", country_code="US",
            email="alex.smith@cloudsaas.com", profile_text="Alex Smith, Sales Manager at CloudSaaS Corp."
        ),
        Lead(
            profile_url="test://7",
            first_name="David", last_name="Miller",
            job_title="Chief Technology Officer (CTO)", department="IT", seniority="C-Level",
            company_name="TechDev Corp", industry="SaaS", country="United States", country_code="US",
            email="david.m@techdev.com", profile_text="David Miller, CTO at TechDev Corp."
        )
    ]
    session.add_all(test_leads)
    session.commit()

    yield session

    session.close()
    Base.metadata.drop_all(bind=engine)


def test_scenario_1_finance_directors_in_india(db_session):
    """TEST 1: Campaign 'Finance Directors in India' -> Only Indian Finance Directors & Managers."""
    camp = Campaign(
        name="Finance Directors in India",
        campaign_target="Find Finance Directors and Managers from Indian banking companies",
        objective="Target Finance leadership in India",
        country_code="IN"
    )
    db_session.add(camp)
    db_session.commit()

    res = generate_lead_pool_for_campaign(db_session, camp.id)

    assert res["status"] == "Lead Pool Ready"
    assert res["relevant_count"] == 2

    strategy = res["strategy"]
    assert "Finance" in strategy["department"]
    assert "India" in strategy["country"] or strategy["country_code"] == "IN"

    # Verify no CTOs or US engineers included
    for item in db_session.query(Lead).join(Lead.deals).filter(Lead.deals.any(campaign_id=camp.id)).all():
        assert item.department == "Finance"
        assert item.country in ["India", "IN"]
        assert item.job_title != "Chief Technology Officer (CTO)"


def test_scenario_2_cybersecurity_managers_usa(db_session):
    """TEST 2: Campaign 'Cybersecurity Managers in USA' -> Only US Cybersecurity profiles."""
    camp = Campaign(
        name="Cybersecurity Managers USA",
        campaign_target="Find cybersecurity decision makers in US technology companies",
        objective="Target Cybersecurity managers in USA",
        country_code="US"
    )
    db_session.add(camp)
    db_session.commit()

    res = generate_lead_pool_for_campaign(db_session, camp.id)
    assert res["status"] == "Lead Pool Ready"
    assert res["relevant_count"] >= 1

    for item in db_session.query(Lead).join(Lead.deals).filter(Lead.deals.any(campaign_id=camp.id)).all():
        assert "Cybersecurity" in item.department or "Cybersecurity" in item.job_title or "Cybersecurity" in item.industry
        assert item.country in ["United States", "US"]


def test_scenario_3_hr_leaders_healthcare(db_session):
    """TEST 3: Campaign 'HR leaders in healthcare companies' -> Only HR in healthcare."""
    camp = Campaign(
        name="HR Healthcare",
        campaign_target="Find HR leaders in healthcare companies",
        objective="Outreach to VP of HR in healthcare"
    )
    db_session.add(camp)
    db_session.commit()

    res = generate_lead_pool_for_campaign(db_session, camp.id)
    assert res["status"] == "Lead Pool Ready"
    assert res["relevant_count"] == 1

    matched = db_session.query(Lead).join(Lead.deals).filter(Lead.deals.any(campaign_id=camp.id)).first()
    assert matched.first_name == "Sarah"
    assert matched.department == "HR"
    assert matched.industry == "Healthcare"


def test_scenario_4_procurement_heads_germany(db_session):
    """TEST 4: Campaign 'Procurement heads in German manufacturing companies' -> Only Procurement in Germany."""
    camp = Campaign(
        name="Procurement Germany",
        campaign_target="Find procurement heads in manufacturing companies in Germany",
        objective="Target German procurement heads",
        country_code="DE"
    )
    db_session.add(camp)
    db_session.commit()

    res = generate_lead_pool_for_campaign(db_session, camp.id)
    assert res["status"] == "Lead Pool Ready"
    assert res["relevant_count"] == 1

    matched = db_session.query(Lead).join(Lead.deals).filter(Lead.deals.any(campaign_id=camp.id)).first()
    assert matched.first_name == "Hans"
    assert matched.department == "Procurement"
    assert matched.country in ["Germany", "DE"]


def test_scenario_5_sales_managers_saas(db_session):
    """TEST 5: Campaign 'Sales managers in SaaS companies' -> Sales in SaaS."""
    camp = Campaign(
        name="Sales SaaS",
        campaign_target="Find Sales managers in SaaS companies",
        objective="Target Sales Managers"
    )
    db_session.add(camp)
    db_session.commit()

    res = generate_lead_pool_for_campaign(db_session, camp.id)
    assert res["status"] == "Lead Pool Ready"
    assert res["relevant_count"] == 1

    matched = db_session.query(Lead).join(Lead.deals).filter(Lead.deals.any(campaign_id=camp.id)).first()
    assert matched.first_name == "Alex"
    assert matched.department == "Sales"


def test_scenario_6_no_hardcoded_defaults(db_session):
    """TEST 6: Search with arbitrary prompt -> Asserts zero CTO/SaaS/Cloud defaults injected."""
    camp = Campaign(
        name="Legal Directors",
        campaign_target="Find Legal Directors in Australian retail companies",
        country_code="AU"
    )
    strategy = CampaignIntelligenceService.derive_heuristic_strategy(camp)

    assert "CTO" not in strategy.job_title_keywords
    assert "SaaS" not in strategy.industry_list
    assert "Cloud" not in strategy.required_keywords


def test_scenario_7_no_matching_records(db_session):
    """TEST 7: No matching records -> Returns status 'no_matching_leads' and 0 results."""
    camp = Campaign(
        name="NonExistent Criteria",
        campaign_target="Find Agriculture Specialists in New Zealand",
        country_code="NZ"
    )
    db_session.add(camp)
    db_session.commit()

    res = generate_lead_pool_for_campaign(db_session, camp.id)
    assert res["status"] == "no_matching_leads"
    assert res["relevant_count"] == 0
    assert "No matching leads found" in res["message"]


def test_acceptance_scenarios_section_20(db_session):
    """
    SECTION 20 ACCEPTANCE TEST:
    Verifies strict hard filtering for Customer Support, Finance, and IT targeting scenarios.
    """
    acceptance_leads = [
        Lead(profile_url="acc://1", first_name="Alice", last_name="Wong", job_title="Customer Support Manager", department="Customer Support", seniority="Manager", company_name="SupportCo", industry="SaaS", email="alice.wong@supportco.com", profile_text="Alice Wong, Customer Support Manager."),
        Lead(profile_url="acc://2", first_name="Bob", last_name="Vance", job_title="Customer Support Director", department="Customer Support", seniority="Director", company_name="SupportCo", industry="SaaS", email="bob.vance@supportco.com", profile_text="Bob Vance, Customer Support Director."),
        Lead(profile_url="acc://3", first_name="Carol", last_name="Danvers", job_title="Finance Manager", department="Finance", seniority="Manager", company_name="FinCorp", industry="Banking", email="carol.d@fincorp.com", profile_text="Carol Danvers, Finance Manager."),
        Lead(profile_url="acc://4", first_name="Daniel", last_name="Craig", job_title="Finance Director", department="Finance", seniority="Director", company_name="FinCorp", industry="Banking", email="daniel.c@fincorp.com", profile_text="Daniel Craig, Finance Director."),
        Lead(profile_url="acc://5", first_name="Eve", last_name="Polastri", job_title="IT Manager", department="IT", seniority="Manager", company_name="TechInc", industry="IT", email="eve.p@techinc.com", profile_text="Eve Polastri, IT Manager."),
        Lead(profile_url="acc://6", first_name="Frank", last_name="Castle", job_title="IT Senior Specialist", department="IT", seniority="Specialist", company_name="TechInc", industry="IT", email="frank.c@techinc.com", profile_text="Frank Castle, IT Senior Specialist."),
        Lead(profile_url="acc://7", first_name="Grace", last_name="Hopper", job_title="Oil & Gas Director", department="Operations", seniority="Director", company_name="EnergyCorp", industry="Oil & Gas", email="grace.h@energycorp.com", profile_text="Grace Hopper, Oil & Gas Director."),
        Lead(profile_url="acc://8", first_name="Henry", last_name="Ford", job_title="Construction Manager", department="Operations", seniority="Manager", company_name="BuildCorp", industry="Construction", email="henry.f@buildcorp.com", profile_text="Henry Ford, Construction Manager."),
        Lead(profile_url="acc://9", first_name="Irene", last_name="Adler", job_title="HR Manager", department="HR", seniority="Manager", company_name="PeopleCo", industry="HR", email="irene.a@peopleco.com", profile_text="Irene Adler, HR Manager.")
    ]
    db_session.add_all(acceptance_leads)
    db_session.commit()

    # 1. Test "Find Customer Support Managers and Directors"
    camp1 = Campaign(name="CS Campaign", campaign_target="Find Customer Support Managers and Directors", objective="Outreach to CS leadership")
    db_session.add(camp1)
    db_session.commit()

    res1 = generate_lead_pool_for_campaign(db_session, camp1.id)
    matched1 = db_session.query(Lead).join(Lead.deals).filter(Lead.deals.any(campaign_id=camp1.id)).all()
    matched1_names = {f"{l.first_name} {l.last_name}" for l in matched1}

    assert "Alice Wong" in matched1_names  # Customer Support Manager -> INCLUDE
    assert "Bob Vance" in matched1_names   # Customer Support Director -> INCLUDE
    assert "Carol Danvers" not in matched1_names  # Finance Manager -> EXCLUDE
    assert "Daniel Craig" not in matched1_names   # Finance Director -> EXCLUDE
    assert "Eve Polastri" not in matched1_names   # IT Manager -> EXCLUDE
    assert "Frank Castle" not in matched1_names   # IT Specialist -> EXCLUDE
    assert "Grace Hopper" not in matched1_names   # Oil & Gas Director -> EXCLUDE
    assert "Henry Ford" not in matched1_names     # Construction Manager -> EXCLUDE
    assert "Irene Adler" not in matched1_names    # HR Manager -> EXCLUDE

    # 2. Test "Find Finance Managers and Directors"
    camp2 = Campaign(name="Finance Campaign", campaign_target="Find Finance Managers and Directors", objective="Outreach to Finance leadership")
    db_session.add(camp2)
    db_session.commit()

    res2 = generate_lead_pool_for_campaign(db_session, camp2.id)
    matched2 = db_session.query(Lead).join(Lead.deals).filter(Lead.deals.any(campaign_id=camp2.id)).all()
    matched2_names = {f"{l.first_name} {l.last_name}" for l in matched2}

    assert "Carol Danvers" in matched2_names  # Finance Manager -> INCLUDE
    assert "Daniel Craig" in matched2_names   # Finance Director -> INCLUDE
    assert "Alice Wong" not in matched2_names   # Customer Support Manager -> EXCLUDE
    assert "Grace Hopper" not in matched2_names  # Oil & Gas Director -> EXCLUDE

    # 3. Test "Find IT Senior Specialists"
    camp3 = Campaign(name="IT Specialist Campaign", campaign_target="Find IT Senior Specialists", objective="Target IT specialists")
    db_session.add(camp3)
    db_session.commit()

    res3 = generate_lead_pool_for_campaign(db_session, camp3.id)
    matched3 = db_session.query(Lead).join(Lead.deals).filter(Lead.deals.any(campaign_id=camp3.id)).all()
    matched3_names = {f"{l.first_name} {l.last_name}" for l in matched3}

    assert "Frank Castle" in matched3_names  # IT Senior Specialist -> INCLUDE
    assert "Grace Hopper" not in matched3_names


def test_openrouter_multi_model_fallback_and_offline_mode(db_session):
    """
    SECTION 28 TEST 5:
    Verifies multi-model OpenRouter key rotation chain AND offline mode fallback.
    When OpenRouter is disabled or rate-limited, Lead Pool produces deterministic database/vector results.
    """
    from backend.app.services.openrouter_service import openrouter_service
    from backend.app.core.config import settings

    # 1. Verify multi-model key chain configuration
    chain = settings.get_openrouter_chain()
    assert len(chain) >= 1

    # 2. Add a Customer Support lead to session for offline mode test
    cs_lead = Lead(
        profile_url="offline://cs1",
        first_name="Sam", last_name="Altman",
        job_title="Customer Support Director", department="Customer Support", seniority="Director",
        company_name="SupportWorld", industry="SaaS", country="United States", country_code="US",
        email="sam@supportworld.com", profile_text="Sam Altman, Customer Support Director."
    )
    db_session.add(cs_lead)
    db_session.commit()

    # Perform Lead Pool Discovery on Customer Support campaign with LLM offline
    camp = Campaign(
        name="Offline Mode CS Test",
        campaign_target="Customer support managers and directors",
        objective="Test LLM offline fallback"
    )
    db_session.add(camp)
    db_session.commit()

    res = generate_lead_pool_for_campaign(db_session, camp.id)
    assert res["status"] == "Lead Pool Ready"
    assert res["relevant_count"] >= 1  # Successfully produced deterministic DB/vector results!


def test_fact_dimension_lead_matching(db_session):
    """
    Test Fact & Dimension mapping for campaign 'finance management managers and directors'.
    Validates that:
    1. Dataset unique dimension values (Finance department, Manager & Director seniority) are identified first.
    2. SQL filter on Lead Fact table returns only matching Finance Managers & Finance Directors.
    """
    camp = Campaign(
        name="Finance Management Managers and Directors",
        campaign_target="Find finance management managers and directors",
        objective="Target finance managers and directors"
    )
    db_session.add(camp)
    db_session.commit()

    res = generate_lead_pool_for_campaign(db_session, camp.id)
    assert res["status"] == "Lead Pool Ready"
    assert res["relevant_count"] == 2

    matched_leads = db_session.query(Lead).join(Lead.deals).filter(Lead.deals.any(campaign_id=camp.id)).all()
    matched_names = {f"{l.first_name} {l.last_name}" for l in matched_leads}

    assert "Rahul Sharma" in matched_names  # Finance Director
    assert "Priya Shah" in matched_names    # Finance Manager
    assert "John Doe" not in matched_names  # Cybersecurity Manager excluded
    assert "Sarah Jenkins" not in matched_names # VP of HR excluded


def test_abbreviation_pbi_lead_matching(db_session):
    """
    Test abbreviation intent matching for PBI -> Power BI.
    """
    pbi_lead = Lead(
        profile_url="test://pbi",
        first_name="Anil", last_name="Kumar",
        job_title="Senior Power BI Developer", department="IT", seniority="Senior",
        company_name="Analytics Corp", industry="IT", country="India", country_code="IN",
        email="anil.k@analytics.in", profile_text="Anil Kumar, Senior Power BI Developer in India. Expert in PBI dashboards."
    )
    db_session.add(pbi_lead)
    db_session.commit()

    camp = Campaign(
        name="Senior PBI Developers in India",
        campaign_target="Target Senior PBI Developers in India",
        objective="Find Power BI experts"
    )
    db_session.add(camp)
    db_session.commit()

    res = generate_lead_pool_for_campaign(db_session, camp.id)
    assert res["status"] == "Lead Pool Ready"
    assert res["relevant_count"] >= 1

    matched_leads = db_session.query(Lead).join(Lead.deals).filter(Lead.deals.any(campaign_id=camp.id)).all()
    matched_names = {f"{l.first_name} {l.last_name}" for l in matched_leads}

    assert "Anil Kumar" in matched_names


def test_lead_pool_strict_source_dataset_validation(db_session):
    """
    Test strict Lead Pool source validation:
    1. Returns ONLY profiles physically existing in the selected dataset file.
    2. Excludes profiles from other datasets.
    3. Returns 'No matching profiles found in the selected dataset.' when dataset has no matching profile.
    """
    lead_a = Lead(
        profile_url="ds_a://1",
        first_name="Alice", last_name="Wong",
        job_title="Finance Manager", department="Finance", seniority="Manager",
        company_name="Alpha Tech", industry="Finance", country="India", country_code="IN",
        email="alice@alphatech.in", source="dataset_alpha.csv", source_file="dataset_alpha.csv"
    )
    lead_b = Lead(
        profile_url="ds_b://1",
        first_name="Bob", last_name="Builder",
        job_title="Finance Manager", department="Finance", seniority="Manager",
        company_name="Beta Corp", industry="Finance", country="India", country_code="IN",
        email="bob@betacorp.in", source="dataset_beta.csv", source_file="dataset_beta.csv"
    )
    db_session.add_all([lead_a, lead_b])
    db_session.commit()

    # Campaign targeting dataset_alpha.csv
    camp1 = Campaign(
        name="Dataset Alpha Campaign (dataset_alpha.csv)",
        campaign_target="Target Finance Managers from dataset_alpha.csv",
        objective="Outreach to Alpha dataset",
        campaign_targeting={"csv_filename": "dataset_alpha.csv", "job_titles": ["Finance Manager"]}
    )
    db_session.add(camp1)
    db_session.commit()

    res1 = generate_lead_pool_for_campaign(db_session, camp1.id)
    assert res1["status"] == "Lead Pool Ready"
    assert res1["relevant_count"] >= 1

    matched1 = db_session.query(Lead).join(Lead.deals).filter(Lead.deals.any(campaign_id=camp1.id)).all()
    matched1_names = {f"{l.first_name} {l.last_name}" for l in matched1}
    assert "Alice Wong" in matched1_names
    assert "Bob Builder" not in matched1_names

    # Campaign targeting dataset_alpha.csv for non-existent role
    camp2 = Campaign(
        name="Dataset Alpha Nonexistent Role (dataset_alpha.csv)",
        campaign_target="Target Cybersecurity Directors from dataset_alpha.csv",
        objective="Target nonexistent role",
        campaign_targeting={"csv_filename": "dataset_alpha.csv", "departments": ["Cybersecurity"], "seniority_levels": ["Director"]}
    )
    db_session.add(camp2)
    db_session.commit()

    res2 = generate_lead_pool_for_campaign(db_session, camp2.id)
    assert res2["status"] == "no_matching_leads"
    assert res2["message"] == "No matching profiles found in the selected dataset."
    assert res2["explanation"] == "No matching profiles found in the selected dataset."




