from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.site_config import SiteConfig
from backend.app.schemas.site_config import SiteConfigResponse, SiteConfigUpdate

router = APIRouter(prefix="/config", tags=["Site Config"])

@router.get("", response_model=SiteConfigResponse)
def get_site_config(db: Session = Depends(get_db)):
    config = db.query(SiteConfig).filter(SiteConfig.id == 1).first()
    if not config:
        config = SiteConfig(id=1)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

@router.put("", response_model=SiteConfigResponse)
def update_site_config(payload: SiteConfigUpdate, db: Session = Depends(get_db)):
    from backend.app.core.config import settings
    config = db.query(SiteConfig).filter(SiteConfig.id == 1).first()
    if not config:
        config = SiteConfig(id=1)
        db.add(config)
    
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(config, key, value)
    
    db.commit()
    db.refresh(config)

    # Sync runtime settings
    if config.llm_api_key:
        settings.AI_API_KEY = config.llm_api_key
    if config.ai_model:
        settings.AI_MODEL = config.ai_model
    if hasattr(config, "lead_discovery_provider") and config.lead_discovery_provider:
        settings.LEAD_DISCOVERY_PROVIDER = config.lead_discovery_provider
        settings.LEAD_PROVIDER = config.lead_discovery_provider
    if hasattr(config, "web_search_api_key") and config.web_search_api_key:
        settings.WEB_SEARCH_API_KEY = config.web_search_api_key
    if hasattr(config, "apollo_api_key") and config.apollo_api_key:
        settings.APOLLO_API_KEY = config.apollo_api_key

    return config
