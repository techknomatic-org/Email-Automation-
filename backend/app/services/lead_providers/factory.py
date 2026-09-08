import os
from backend.app.core.config import settings
from backend.app.services.lead_providers.base import LeadProvider
from backend.app.services.lead_providers.web_search_provider import WebSearchLeadProvider
from backend.app.services.lead_providers.apollo_provider import ApolloLeadProvider
from backend.app.services.lead_providers.mock_provider import MockLeadProvider
from backend.app.services.lead_providers.excel_provider import ExcelLeadProvider


def get_lead_provider(provider_name: str = None) -> LeadProvider:
    """
    Factory function to retrieve the configured LeadProvider instance.
    Supports: "excel" (default), "web_search", "apollo", "mock".
    """
    selected = (
        provider_name
        or settings.LEAD_DISCOVERY_PROVIDER
        or settings.LEAD_PROVIDER
        or os.getenv("LEAD_DISCOVERY_PROVIDER", "excel")
    ).strip().lower()

    if selected == "excel":
        return ExcelLeadProvider()
    elif selected in ["web_search", "websearch"]:
        return WebSearchLeadProvider()
    elif selected == "apollo":
        return ApolloLeadProvider()
    elif selected == "mock":
        return MockLeadProvider()
    else:
        # Default to Excel provider as configured
        return ExcelLeadProvider()

