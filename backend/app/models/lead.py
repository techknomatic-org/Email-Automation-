from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, JSON, LargeBinary, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

try:
    from pgvector.sqlalchemy import Vector
    VectorType = Vector(384)
except ImportError:
    VectorType = JSON

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    profile_url = Column(String(200), unique=True, index=True, nullable=False)
    provider = Column(String(50), default="web_search", index=True)
    provider_lead_id = Column(String(100), nullable=True, index=True)
    source_type = Column(String(50), default="web_search", index=True)
    source_url = Column(Text, nullable=True)
    source_title = Column(Text, nullable=True)
    source_snippet = Column(Text, nullable=True)
    retrieved_at = Column(DateTime, default=datetime.utcnow)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    job_title = Column(String(200), nullable=True, index=True)
    department = Column(String(100), nullable=True, index=True)
    seniority = Column(String(100), nullable=True, index=True)
    company_name = Column(String(200), nullable=True, index=True)
    company_domain = Column(String(200), nullable=True)
    industry = Column(String(100), nullable=True, index=True)
    country = Column(String(100), nullable=True, index=True)
    state = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    headcount = Column(Integer, nullable=True)
    phone = Column(String(50), nullable=True)
    linkedin_url = Column(String(300), nullable=True)
    company_info = Column(Text, nullable=True)
    skills = Column(JSON, default=list)
    pain_points = Column(JSON, default=list)
    source = Column(String(100), default="Manual Entry")
    source_file = Column(String(250), nullable=True)

    # Master Profile Schema Extensions
    company_website = Column(String(300), nullable=True)
    company_revenue = Column(String(100), nullable=True)
    company_founded_year = Column(String(50), nullable=True)
    timezone = Column(String(100), nullable=True)
    location = Column(String(200), nullable=True)
    technologies = Column(JSON, default=list)
    keywords = Column(JSON, default=list)
    profile_headline = Column(Text, nullable=True)
    profile_summary = Column(Text, nullable=True)
    products_services = Column(Text, nullable=True)
    business_model = Column(String(100), nullable=True)
    funding_stage = Column(String(100), nullable=True)
    funding_amount = Column(String(100), nullable=True)
    last_funding_date = Column(String(50), nullable=True)
    email_status = Column(String(50), default="valid")
    email_verified = Column(Boolean, default=True)
    profile_verified = Column(Boolean, default=True)
    company_verified = Column(Boolean, default=True)
    data_source = Column(String(100), default="Master Database")
    last_verified_at = Column(DateTime, default=datetime.utcnow)
    source_id = Column(String(100), nullable=True, index=True)
    import_batch_id = Column(String(100), nullable=True, index=True)

    country_code = Column(String(10), default="")
    embedding = Column(LargeBinary, nullable=True)
    profile_text = Column(Text, default="")
    embedding_status = Column(String(50), default="completed")
    profile_completeness = Column(Integer, default=85)
    source_fields = Column(JSON, default=dict)
    email = Column(String(200), nullable=True, index=True)
    disqualified = Column(Boolean, default=False)
    discovered_by_id = Column(Integer, ForeignKey("query_nodes.id", ondelete="SET NULL"), nullable=True)
    creation_date = Column(DateTime, default=datetime.utcnow)
    update_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    discovered_by_node = relationship("QueryNode", back_populates="leads")
    deals = relationship("Deal", back_populates="lead", cascade="all, delete-orphan")
    research = relationship("LeadResearch", back_populates="lead", uselist=False, cascade="all, delete-orphan")
