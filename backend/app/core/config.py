import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List

class Settings(BaseSettings):
    # ── Application ──────────────────────────────────────────────────────────
    PROJECT_NAME: str = "OpenOutreach API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    APP_ENV: str = "development"  # development | production | staging

    # ── Database ─────────────────────────────────────────────────────────────
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "openoutreach"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"
    DATABASE_URL: Optional[str] = None

    # ── AI / LLM Keys ────────────────────────────────────────────────────────
    AI_API_KEY: Optional[str] = ""
    OPENROUTER_API_KEY: Optional[str] = ""
    OPENROUTER_API_KEY_1: Optional[str] = ""
    OPENROUTER_API_KEY_2: Optional[str] = ""
    OPENROUTER_API_KEY_3: Optional[str] = ""

    # ── AI Models ─────────────────────────────────────────────────────────────
    AI_MODEL: str = "openai/gpt-4o-mini"
    OPENROUTER_MODEL_1: str = "openai/gpt-4o-mini"
    OPENROUTER_MODEL_2: str = "google/gemini-2.0-flash-lite-001"
    OPENROUTER_MODEL_3: str = "meta-llama/llama-3.3-70b-instruct:free"


    # ── Frontend / CORS ───────────────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:5173"
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://localhost:3000"

    # ── Lead Discovery ────────────────────────────────────────────────────────
    LEAD_DISCOVERY_PROVIDER: str = "excel"  # excel, web_search, apollo, hybrid, mock
    LEAD_PROVIDER: str = "excel"
    EXCEL_FILE_PATH: str = "data/input_csv/Master_Contact_List.xlsx"
    LEAD_DISCOVERY_PAGE_SIZE: int = 150
    LEAD_DISCOVERY_MAX_RESULTS: int = 500

    # ── Search Providers ──────────────────────────────────────────────────────
    WEB_SEARCH_API_KEY: Optional[str] = ""
    TAVILY_API_KEY: Optional[str] = ""
    SERPAPI_KEY: Optional[str] = ""

    # ── Apollo.io ─────────────────────────────────────────────────────────────
    APOLLO_API_KEY: Optional[str] = ""
    APOLLO_BASE_URL: str = "https://api.apollo.io/v1"
    APOLLO_ENABLED: bool = False

    # ── Google OAuth 2.0 ──────────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: Optional[str] = ""
    GOOGLE_CLIENT_SECRET: Optional[str] = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"

    # ── Test Recipients ───────────────────────────────────────────────────────
    TEST_RECIPIENT_1_EMAIL: str = "test1@example.com"
    TEST_RECIPIENT_1_NAME: str = "Test Recipient 1"
    TEST_RECIPIENT_2_EMAIL: str = "test2@example.com"
    TEST_RECIPIENT_2_NAME: str = "Test Recipient 2"
    TEST_RECIPIENT_3_EMAIL: str = "test3@example.com"
    TEST_RECIPIENT_3_NAME: str = "Test Recipient 3"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # ── Helpers ───────────────────────────────────────────────────────────────
    def get_database_url(self) -> str:
        """Build the database connection URL from individual env vars or DATABASE_URL."""
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"postgresql+psycopg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    def get_allowed_origins(self) -> List[str]:
        """Return list of allowed CORS origins from the comma-separated env var."""
        origins = [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]
        if self.FRONTEND_URL and self.FRONTEND_URL.strip() not in origins:
            origins.append(self.FRONTEND_URL.strip())
        if "*" not in origins and not self.is_production():
            origins.append("*")
        return origins

    def is_production(self) -> bool:
        return self.APP_ENV.lower() == "production"

    def get_openrouter_api_key(self) -> str:
        """Return the first available OpenRouter API key, falling back to DB config."""
        key = (
            self.OPENROUTER_API_KEY_1
            or self.OPENROUTER_API_KEY
            or self.AI_API_KEY
            or ""
        ).strip()

        if not key:
            try:
                from backend.app.core.database import SessionLocal
                from backend.app.models.site_config import SiteConfig
                db = SessionLocal()
                cfg = db.query(SiteConfig).filter(SiteConfig.id == 1).first()
                if cfg and cfg.llm_api_key:
                    key = cfg.llm_api_key.strip()
                db.close()
            except Exception:
                pass
        return key

    def get_openrouter_chain(self) -> list:
        """
        Return ordered fallback list of (api_key, model_id) tuples.
        Rotates between top 3 high-accuracy models (GPT-4o-mini, Gemini 2.5 Flash, Claude 3 Haiku)
        and all 3 API keys whenever limit/rate-limit/error occurs.
        """
        chain = []
        k1 = (self.OPENROUTER_API_KEY_1 or self.get_openrouter_api_key()).strip()
        k2 = (self.OPENROUTER_API_KEY_2 or "").strip()
        k3 = (self.OPENROUTER_API_KEY_3 or "").strip()

        m1 = self.OPENROUTER_MODEL_1 or "openai/gpt-4o-mini"
        m2 = self.OPENROUTER_MODEL_2 or "google/gemini-2.5-flash"
        m3 = self.OPENROUTER_MODEL_3 or "anthropic/claude-3-haiku"

        # Primary pairs
        if k1: chain.append((k1, m1))
        if k2: chain.append((k2, m2))
        if k3: chain.append((k3, m3))

        # Matrix rotation across all keys and models on rate-limit / quota error
        matrix = [
            (k1, m2), (k1, m3),
            (k2, m1), (k2, m3),
            (k3, m1), (k3, m2),
        ]
        for key, model in matrix:
            if key and model and (key, model) not in chain:
                chain.append((key, model))

        return chain

    def get_test_recipients(self) -> list:
        """Return list of test recipient dicts from environment variables."""
        return [
            {
                "name": self.TEST_RECIPIENT_1_NAME,
                "email": self.TEST_RECIPIENT_1_EMAIL,
                "profile_text": "CTO at TechStartup.io | Ex-Google | Building next-gen cloud infra | Series A.",
                "company": "TechStartup.io",
                "industry": "SaaS",
                "country_code": "US",
                "role": "CTO"
            },
            {
                "name": self.TEST_RECIPIENT_2_NAME,
                "email": self.TEST_RECIPIENT_2_EMAIL,
                "profile_text": "VP Engineering at DevScale | AWS Partner | Scaling DevOps teams.",
                "company": "DevScale",
                "industry": "DevOps",
                "country_code": "US",
                "role": "VP Engineering"
            },
            {
                "name": self.TEST_RECIPIENT_3_NAME,
                "email": self.TEST_RECIPIENT_3_EMAIL,
                "profile_text": "Director of IT at ScaleTech | Digital Transformation | Enterprise SaaS buyer.",
                "company": "ScaleTech",
                "industry": "Enterprise",
                "country_code": "DE",
                "role": "Director of IT"
            },
        ]

settings = Settings()
