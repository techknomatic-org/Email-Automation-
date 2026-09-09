import os
# pyrefly: ignore [missing-import]
from sqlalchemy import create_engine, text
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.core.config import settings

def is_postgres_listening(host: str = "127.0.0.1", port: int = 5432, timeout: float = 0.2) -> bool:
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(timeout)
        s.connect((host, port))
        s.close()
        return True
    except Exception:
        return False

def create_db_engine():
    """Smart engine creator: fast socket check for PostgreSQL on port 5432, falls back immediately to SQLite."""
    db_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "openoutreach.db")
    sqlite_url = f"sqlite:///{db_file}"

    pg_url = settings.get_database_url()
    if "postgresql" in pg_url:
        if not is_postgres_listening():
            print(f"[!] PostgreSQL service not listening on port 5432. Operating on local DB: {db_file}")
            return create_engine(sqlite_url, connect_args={"check_same_thread": False}, pool_pre_ping=True)

        if "connect_timeout" not in pg_url:
            sep = "&" if "?" in pg_url else "?"
            pg_url_with_timeout = f"{pg_url}{sep}connect_timeout=2"
        else:
            pg_url_with_timeout = pg_url

        try:
            eng = create_engine(pg_url_with_timeout, pool_pre_ping=True, echo=False)
            with eng.connect() as conn:
                conn.execute(text("SELECT 1;"))
            print("[+] Connected to PostgreSQL Database successfully.")
            return eng
        except Exception as pg_err:
            print(f"[!] PostgreSQL connection failed ({pg_err}). Operating on local DB: {db_file}")
            return create_engine(sqlite_url, connect_args={"check_same_thread": False}, pool_pre_ping=True)
    else:
        return create_engine(sqlite_url, connect_args={"check_same_thread": False}, pool_pre_ping=True)

engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    # Import all models so metadata knows all tables
    import backend.app.models.site_config
    import backend.app.models.user
    import backend.app.models.campaign
    import backend.app.models.lead
    import backend.app.models.deal
    import backend.app.models.mailbox
    import backend.app.models.knowledge
    import backend.app.models.sequence
    import backend.app.models.lead_intelligence
    import backend.app.models.email_event

    # Create all database tables if they do not exist
    Base.metadata.create_all(bind=engine)

    if "postgresql" in str(engine.url):
        with engine.connect() as conn:
            try:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                conn.commit()
            except Exception:
                pass

        columns = [
            ("provider", "VARCHAR(50) DEFAULT 'smtp'"),
            ("auth_type", "VARCHAR(50) DEFAULT 'smtp_credentials'"),
            ("refresh_token", "TEXT"),
            ("access_token", "TEXT"),
            ("token_expiry", "TIMESTAMP")
        ]
        for col_name, col_def in columns:
            try:
                with engine.connect() as conn:
                    conn.execute(text(f"ALTER TABLE mailboxes ADD COLUMN IF NOT EXISTS {col_name} {col_def};"))
                    conn.commit()
            except Exception:
                pass

    site_config_columns = [
        ("lead_discovery_provider", "VARCHAR(100) DEFAULT 'web_search'"),
        ("web_search_api_key", "VARCHAR(500) DEFAULT ''"),
        ("apollo_api_key", "VARCHAR(500) DEFAULT ''")
    ]
    for col_name, col_def in site_config_columns:
        try:
            with engine.connect() as conn:
                if "sqlite" in str(engine.url):
                    conn.execute(text(f"ALTER TABLE site_config ADD COLUMN {col_name} {col_def};"))
                else:
                    conn.execute(text(f"ALTER TABLE site_config ADD COLUMN IF NOT EXISTS {col_name} {col_def};"))
                conn.commit()
        except Exception:
            pass

    campaign_columns = [
        ("sequence_interval_minutes", "INTEGER DEFAULT 10"),
        ("sequence_interval_seconds", "INTEGER DEFAULT 600"),
        ("sequence_interval_unit", "VARCHAR(20) DEFAULT 'min'"),
        ("industry", "VARCHAR(500) DEFAULT ''")
    ]
    for col_name, col_def in campaign_columns:
        try:
            with engine.connect() as conn:
                if "sqlite" in str(engine.url):
                    conn.execute(text(f"ALTER TABLE campaigns ADD COLUMN {col_name} {col_def};"))
                else:
                    conn.execute(text(f"ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS {col_name} {col_def};"))
                conn.commit()
        except Exception:
            pass

    lead_columns = [
        ("provider", "VARCHAR(50) DEFAULT 'web_search'"),
        ("provider_lead_id", "VARCHAR(100)"),
        ("source_type", "VARCHAR(50) DEFAULT 'web_search'"),
        ("source_url", "TEXT"),
        ("source_title", "TEXT"),
        ("source_snippet", "TEXT"),
        ("retrieved_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
        ("first_name", "VARCHAR(100)"),
        ("last_name", "VARCHAR(100)"),
        ("job_title", "VARCHAR(200)"),
        ("department", "VARCHAR(100)"),
        ("seniority", "VARCHAR(100)"),
        ("company_name", "VARCHAR(200)"),
        ("company_domain", "VARCHAR(200)"),
        ("industry", "VARCHAR(100)"),
        ("country", "VARCHAR(100)"),
        ("state", "VARCHAR(100)"),
        ("city", "VARCHAR(100)"),
        ("headcount", "INTEGER"),
        ("phone", "VARCHAR(50)"),
        ("linkedin_url", "VARCHAR(300)"),
        ("company_info", "TEXT"),
        ("skills", "TEXT DEFAULT '[]'"),
        ("pain_points", "TEXT DEFAULT '[]'"),
        ("source", "VARCHAR(100) DEFAULT 'upload'"),
        ("source_file", "VARCHAR(250)"),
        ("embedding_status", "VARCHAR(50) DEFAULT 'completed'"),
        ("profile_completeness", "INTEGER DEFAULT 85"),
        ("company_website", "VARCHAR(255)"),
        ("company_revenue", "VARCHAR(100)"),
        ("company_founded_year", "VARCHAR(50)"),
        ("timezone", "VARCHAR(100)"),
        ("location", "VARCHAR(255)"),
        ("technologies", "TEXT"),
        ("keywords", "TEXT"),
        ("profile_headline", "TEXT"),
        ("profile_summary", "TEXT"),
        ("products_services", "TEXT"),
        ("business_model", "VARCHAR(100)"),
        ("funding_stage", "VARCHAR(100)"),
        ("funding_amount", "VARCHAR(100)"),
        ("last_funding_date", "VARCHAR(100)"),
        ("email_status", "VARCHAR(50)"),
        ("email_verified", "BOOLEAN DEFAULT 0"),
        ("profile_verified", "BOOLEAN DEFAULT 0"),
        ("company_verified", "BOOLEAN DEFAULT 0"),
        ("data_source", "VARCHAR(100)"),
        ("last_verified_at", "DATETIME"),
        ("source_id", "VARCHAR(100)"),
        ("import_batch_id", "VARCHAR(100)")
    ]
    for col_name, col_def in lead_columns:
        try:
            with engine.connect() as conn:
                if "sqlite" in str(engine.url):
                    conn.execute(text(f"ALTER TABLE leads ADD COLUMN {col_name} {col_def};"))
                else:
                    conn.execute(text(f"ALTER TABLE leads ADD COLUMN IF NOT EXISTS {col_name} {col_def};"))
                conn.commit()
        except Exception:
            pass

    try:
        with engine.connect() as conn:
            if "sqlite" in str(engine.url):
                conn.execute(text("ALTER TABLE campaigns ADD COLUMN campaign_targeting TEXT DEFAULT '{}';"))
            else:
                conn.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS campaign_targeting JSONB DEFAULT '{}';"))
            conn.commit()
    except Exception:
        pass

    sequence_columns = [
        ("created_at", "DATETIME"),
        ("updated_at", "DATETIME")
    ]
    for col_name, col_def in sequence_columns:
        try:
            with engine.connect() as conn:
                if "sqlite" in str(engine.url):
                    conn.execute(text(f"ALTER TABLE sequences ADD COLUMN {col_name} {col_def};"))
                else:
                    conn.execute(text(f"ALTER TABLE sequences ADD COLUMN IF NOT EXISTS {col_name} {col_def};"))
                conn.commit()
        except Exception:
            pass

    sequence_step_columns = [
        ("step_name", "VARCHAR(100) DEFAULT 'Follow-up Step'"),
        ("action_type", "VARCHAR(50) DEFAULT 'send_followup'"),
        ("delay_value", "INTEGER DEFAULT 10"),
        ("delay_unit", "VARCHAR(20) DEFAULT 'min'"),
        ("delay_seconds", "INTEGER DEFAULT 600"),
        ("condition_type", "VARCHAR(50) DEFAULT 'did_receiver_reply'"),
        ("if_replied_action", "VARCHAR(50) DEFAULT 'sales_handoff'"),
        ("if_no_reply_action", "VARCHAR(50) DEFAULT 'send_followup'"),
        ("custom_instructions", "TEXT DEFAULT ''"),
        ("is_enabled", "BOOLEAN DEFAULT 1"),
        ("updated_at", "DATETIME")
    ]
    for col_name, col_def in sequence_step_columns:
        try:
            with engine.connect() as conn:
                if "sqlite" in str(engine.url):
                    conn.execute(text(f"ALTER TABLE sequence_steps ADD COLUMN {col_name} {col_def};"))
                else:
                    conn.execute(text(f"ALTER TABLE sequence_steps ADD COLUMN IF NOT EXISTS {col_name} {col_def};"))
                conn.commit()
        except Exception:
            pass

    deal_columns = [
        ("current_step_number", "INTEGER DEFAULT 1"),
        ("sequence_state", "VARCHAR(50) DEFAULT 'NOT_STARTED'"),
        ("timer_started_at", "DATETIME"),
        ("timer_expires_at", "DATETIME"),
        ("last_reply_at", "DATETIME"),
        ("last_message_id", "VARCHAR(200)"),
        ("follow_up_count", "INTEGER DEFAULT 0")
    ]
    for col_name, col_def in deal_columns:
        try:
            with engine.connect() as conn:
                if "sqlite" in str(engine.url):
                    conn.execute(text(f"ALTER TABLE deals ADD COLUMN {col_name} {col_def};"))
                else:
                    conn.execute(text(f"ALTER TABLE deals ADD COLUMN IF NOT EXISTS {col_name} {col_def};"))
                conn.commit()
        except Exception:
            pass

    backfill_lead_fields()

    seed_initial_leads()
    seed_default_user()

def backfill_lead_fields():
    """Populate explicit Lead SQL columns from source_fields JSON if unpopulated."""
    try:
        from backend.app.models.lead import Lead
        db = SessionLocal()
        unfilled = db.query(Lead).filter(Lead.job_title.is_(None)).all()
        if unfilled:
            for lead in unfilled:
                sf = lead.source_fields or {}
                if sf:
                    lead.first_name = lead.first_name or sf.get("first_name") or (sf.get("name", "").split()[0] if sf.get("name") else None)
                    lead.last_name = lead.last_name or sf.get("last_name") or (sf.get("name", "").split()[-1] if sf.get("name") and len(sf.get("name").split()) > 1 else None)
                    lead.job_title = lead.job_title or sf.get("job_title") or sf.get("title")
                    lead.department = lead.department or sf.get("department")
                    lead.seniority = lead.seniority or sf.get("seniority")
                    lead.company_name = lead.company_name or sf.get("company_name") or sf.get("company")
                    lead.company_domain = lead.company_domain or sf.get("company_domain") or sf.get("company_website")
                    lead.industry = lead.industry or sf.get("industry")
                    lead.country = lead.country or sf.get("country") or sf.get("location") or lead.country_code
                    lead.source = lead.source or sf.get("source") or "upload"
            db.commit()
        db.close()
    except Exception as e:
        print(f"Lead backfill warning: {e}")

def seed_default_user():
    try:
        from backend.app.models.user import User
        from backend.app.core.security import hash_password
        db = SessionLocal()
        admin_email = "admin@openoutreach.ai"
        user = db.query(User).filter(User.email == admin_email).first()
        if not user:
            user = User(
                email=admin_email,
                full_name="Alex Morgan",
                hashed_password=hash_password("Admin123!"),
                role="Director of Growth",
                is_active=True
            )
            db.add(user)
            db.commit()
            print(f"[DB INIT] Seeded default demo user: {admin_email}")
        db.close()
    except Exception as e:
        print(f"Default user seeding warning: {e}")

def seed_initial_leads():
    try:
        from backend.app.models.lead import Lead
        from backend.app.services.csv_importer import csv_importer
        db = SessionLocal()
        count = db.query(Lead).count()
        if count == 0:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            sample_csv = os.path.join(base_dir, "data", "input_csv", "sample_b2b_prospects.csv")
            if os.path.exists(sample_csv):
                csv_importer.import_file(db, sample_csv, source_name="sample_b2b_prospects.csv")
        db.close()
    except Exception as e:
        print(f"Initial lead seeding warning: {e}")


