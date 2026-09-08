from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.app.core.database import get_db
from backend.app.services.lead_providers import get_lead_provider

router = APIRouter()

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "OpenOutreach FastAPI Backend",
        "version": "1.0.0"
    }

@router.get("/health/db")
def health_db_check(db: Session = Depends(get_db)):
    try:
        result = db.execute(text("SELECT 1")).scalar()
        is_pg = "postgresql" in str(db.bind.url)
        pgvector_enabled = False
        if is_pg:
            try:
                vector_ext = db.execute(text("SELECT count(*) FROM pg_extension WHERE extname = 'vector'")).scalar()
                pgvector_enabled = bool(vector_ext > 0)
            except Exception:
                pass

        return {
            "status": "connected",
            "database": "postgresql" if is_pg else "sqlite",
            "query_result": result,
            "pgvector_enabled": pgvector_enabled
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

@router.get("/api/v1/lead-provider/health")
@router.get("/lead-provider/health")
def lead_provider_health():
    """Check Lead Provider (Apollo / Mock) connection status."""
    provider = get_lead_provider()
    return provider.health_check()
