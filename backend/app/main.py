from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.core.config import settings
from backend.app.core.database import init_db
from backend.app.core.logging_config import setup_logging, logger

from backend.app.api.health import router as health_router
from backend.app.api.site_config import router as config_router
from backend.app.api.campaigns import router as campaigns_router
from backend.app.api.leads import router as leads_router
from backend.app.api.deals import router as deals_router
from backend.app.api.mailboxes import router as mailboxes_router
from backend.app.api.knowledge import router as knowledge_router
from backend.app.api.sequences import router as sequences_router
from backend.app.api.ai_copilot import router as copilot_router
from backend.app.api.pipeline import router as pipeline_router
from backend.app.api.webhooks import router as webhooks_router
from backend.app.api.auth import router as auth_router
from backend.app.api.csv_upload import router as csv_router
from backend.app.api.attachments import router as attachments_router

setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle manager."""
    # ── Startup ──────────────────────────────────────────────────────────────
    logger.info(f"Starting OpenOutreach [{settings.APP_ENV.upper()}]...")
    init_db()
    from backend.app.core.database import seed_default_user
    seed_default_user()

    try:
        from backend.app.core.database import SessionLocal
        from backend.app.services.demo_seeder import seed_all_demo_data
        db = SessionLocal()
        seed_all_demo_data(db)
        db.close()
    except Exception as e:
        logger.warning(f"Demo data seeding skipped: {e}")

    from backend.app.services.campaign_runner import campaign_runner
    campaign_runner.start()
    logger.info("Persistent Campaign Automation & Timer Engine started in background.")

    yield  # Application is running

    # ── Shutdown ──────────────────────────────────────────────────────────────
    logger.info("Shutting down OpenOutreach...")
    campaign_runner.stop()
    logger.info("Campaign runner stopped.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── Exception Logging Middleware ──────────────────────────────────────────────
@app.middleware("http")
async def log_exceptions_middleware(request: Request, call_next):
    try:
        response = await call_next(request)
        if response.status_code >= 500:
            logger.error(
                f"HTTP {response.status_code} on {request.method} {request.url.path}"
            )
        return response
    except (HTTPException, StarletteHTTPException):
        raise
    except Exception as exc:
        logger.error(
            f"Unhandled exception on {request.method} {request.url.path}: {exc}",
            exc_info=True
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error"}
        )

# ── CORS ─────────────────────────────────────────────────────────────────────
# Production: restrict to known origins via ALLOWED_ORIGINS env variable.
# Development: also allows localhost variants for hot-reload dev servers.
allowed_origins = settings.get_allowed_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health_router)
app.include_router(config_router, prefix=settings.API_V1_STR)
app.include_router(campaigns_router, prefix=settings.API_V1_STR)
app.include_router(leads_router, prefix=settings.API_V1_STR)
app.include_router(deals_router, prefix=settings.API_V1_STR)
app.include_router(mailboxes_router, prefix=settings.API_V1_STR)
app.include_router(knowledge_router, prefix=settings.API_V1_STR)
app.include_router(sequences_router, prefix=settings.API_V1_STR)
app.include_router(copilot_router, prefix=settings.API_V1_STR)
app.include_router(pipeline_router, prefix=settings.API_V1_STR)
app.include_router(webhooks_router, prefix=settings.API_V1_STR)
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(csv_router, prefix=settings.API_V1_STR)
app.include_router(attachments_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "OpenOutreach Campaign Intelligence Platform",
        "version": settings.VERSION,
        "environment": settings.APP_ENV,
        "docs": "/docs",
        "health": "/health",
    }
