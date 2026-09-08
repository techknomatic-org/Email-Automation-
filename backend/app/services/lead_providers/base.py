from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class LeadProvider(ABC):
    """Abstract Base Class for B2B Lead Providers."""

    @abstractmethod
    def search_people(self, criteria: Dict[str, Any], page: int = 1, page_size: int = 25) -> Dict[str, Any]:
        """
        Search candidate people/prospects matching target criteria.
        Returns:
            Dict with 'leads': List[Dict[str, Any]], 'total': int, 'provider': str
        """
        pass

    @abstractmethod
    def enrich_person(self, details: Dict[str, Any]) -> Dict[str, Any]:
        """Enrich contact or organization information."""
        pass

    @abstractmethod
    def search_companies(self, criteria: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Search organizations matching target criteria."""
        pass

    @abstractmethod
    def health_check(self) -> Dict[str, Any]:
        """Check provider API connection health and key validity."""
        pass
