import os
import sys
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure project root is in python path
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, base_dir)

from backend.app.core.database import Base
from backend.app.models.lead import Lead
from backend.app.services.lead_deduplication import LeadDeduplicationService

TEST_DB_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


def test_create_manual_lead_profile(db_session):
    """Test manual profile creation in Master Lead Database."""
    data = {
        "first_name": "Vikram",
        "last_name": "Aditya",
        "email": "vikram@enterprise.in",
        "job_title": "Finance Director",
        "company_name": "FinTech Corp",
        "company_website": "https://fintechcorp.in",
        "industry": "Banking",
        "country": "India",
        "seniority": "Director",
        "department": "Finance",
        "source": "Manual Entry"
    }

    res = LeadDeduplicationService._create_new_profile(db_session, data)
    assert res["status"] == "created"
    lead = res["lead"]

    assert lead.id is not None
    assert lead.first_name == "Vikram"
    assert lead.last_name == "Aditya"
    assert lead.source == "Manual Entry"
    assert lead.data_source == "Master Database"


def test_priority_duplicate_detection(db_session):
    """Test 5-tier priority duplicate detection hierarchy."""
    existing_lead = Lead(
        profile_url="manual://1",
        first_name="Pooja",
        last_name="Khalekar",
        email="pooja@openoutreach.io",
        job_title="Lead Architect",
        company_name="OpenOutreach AI",
        industry="SaaS",
        country="India",
        seniority="Director",
        department="Engineering",
        linkedin_url="https://linkedin.com/in/pooja-khalekar",
        source_id="EXT-1002",
        source="Manual Entry"
    )
    db_session.add(existing_lead)
    db_session.commit()

    # Tier 1: Matching Email
    dup1 = LeadDeduplicationService.check_duplicate(db_session, {"email": "POOJA@openoutreach.io"})
    assert dup1["is_duplicate"] is True
    assert dup1["match_tier"] == "email"

    # Tier 2: Matching LinkedIn URL
    dup2 = LeadDeduplicationService.check_duplicate(db_session, {"linkedin_url": "https://linkedin.com/in/pooja-khalekar"})
    assert dup2["is_duplicate"] is True
    assert dup2["match_tier"] == "linkedin_url"

    # Tier 4: Matching Source ID
    dup4 = LeadDeduplicationService.check_duplicate(db_session, {"source_id": "EXT-1002"})
    assert dup4["is_duplicate"] is True
    assert dup4["match_tier"] == "source_id"

    # Tier 5: Composite Key (first_name + last_name + company_name)
    dup5 = LeadDeduplicationService.check_duplicate(db_session, {
        "first_name": "Pooja",
        "last_name": "Khalekar",
        "company_name": "OpenOutreach AI",
        "job_title": "Lead Architect"
    })
    assert dup5["is_duplicate"] is True
    assert dup5["match_tier"] == "composite_key"


def test_duplicate_actions_skip_update_merge_add(db_session):
    """Test duplicate management resolution actions (Skip, Update, Merge, Add as New)."""
    lead = Lead(
        profile_url="manual://dup_test",
        first_name="Aarav",
        last_name="Mehta",
        email="aarav@fintech.com",
        job_title="VP Sales",
        company_name="Fintech Solutions",
        department="Sales",
        seniority="VP",
        country="India",
        industry="Finance",
        phone="",
        source="Manual Entry"
    )
    db_session.add(lead)
    db_session.commit()

    # Action 1: Skip
    res_skip = LeadDeduplicationService.execute_action(db_session, "skip", {"email": "aarav@fintech.com"}, existing_lead_id=lead.id)
    assert res_skip["status"] == "skipped"

    # Action 2: Update
    res_update = LeadDeduplicationService.execute_action(
        db_session, "update",
        {"email": "aarav@fintech.com", "phone": "+91 99999 88888", "job_title": "Senior VP of Sales"},
        existing_lead_id=lead.id
    )
    assert res_update["status"] == "updated"
    updated_lead = db_session.query(Lead).filter(Lead.id == lead.id).first()
    assert updated_lead.phone == "+91 99999 88888"
    assert updated_lead.job_title == "Senior VP of Sales"

    # Action 3: Merge (preserves existing phone, fills missing website)
    res_merge = LeadDeduplicationService.execute_action(
        db_session, "merge",
        {"email": "aarav@fintech.com", "company_website": "https://fintechsol.com", "phone": "+91 00000 00000"},
        existing_lead_id=lead.id
    )
    assert res_merge["status"] == "merged"
    merged_lead = db_session.query(Lead).filter(Lead.id == lead.id).first()
    assert merged_lead.company_website == "https://fintechsol.com"
    assert merged_lead.phone == "+91 99999 88888"  # Preserved original phone!

    # Action 4: Add as New
    res_new = LeadDeduplicationService.execute_action(
        db_session, "add_as_new",
        {"first_name": "Aarav", "last_name": "Mehta", "email": "aarav.new@fintech.com", "job_title": "VP Sales", "company_name": "Fintech Solutions", "country": "India", "seniority": "VP", "department": "Sales", "industry": "Finance"}
    )
    assert res_new["status"] == "created"
    assert res_new["lead"].id != lead.id


def test_manual_entry_included_in_campaign_search(db_session):
    """Test that manual entry profiles in Master Database are included in campaign search queries."""
    from backend.app.services.hybrid_search_engine import hybrid_search_engine
    from backend.app.services.campaign_intelligence import CampaignSearchStrategy

    manual_lead = Lead(
        profile_url="manual://operations_mgr",
        first_name="Pooja",
        last_name="Sharma",
        email="poojasharma@enterprise.com",
        job_title="Operations Manager",
        company_name="Enterprise Corp",
        department="Operations",
        seniority="Manager",
        country="India",
        industry="SaaS",
        source="Manual Entry"
    )
    db_session.add(manual_lead)
    db_session.commit()

    strategy = CampaignSearchStrategy(
        department=["Operations"],
        seniority=["Manager"],
        job_title_keywords=["Operations Manager"]
    )

    results = hybrid_search_engine.search(
        db_session,
        strategy,
        query_text="Operations Manager in India",
        csv_filename=None  # Master Lead Database search query
    )

    matched_ids = [r["lead"].id for r in results]
    assert manual_lead.id in matched_ids
