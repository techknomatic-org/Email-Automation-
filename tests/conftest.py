# tests/conftest.py
import os
from unittest.mock import patch

import numpy as np
import pytest

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "openoutreach.settings")
try:
    import django
    django.setup()
except Exception:
    pass


@pytest.fixture(autouse=True)
def _ensure_crm_data(request):
    """
    Ensure CRM bootstrap data exists before Django tests.
    """
    if "db" in getattr(request, "fixturenames", []) or "django_db" in getattr(request, "keywords", {}):
        try:
            from openoutreach.core.management.setup_crm import setup_crm
            setup_crm()
        except Exception:
            pass
    yield


@pytest.fixture(autouse=True)
def _mock_embeddings(request):
    """Stub fastembed so tests don't need the ONNX model."""
    if "no_embed_mock" in request.keywords:
        yield
    else:
        try:
            with patch("openoutreach.core.ml.embeddings.embed_text", return_value=np.ones(384)):
                yield
        except Exception:
            yield


@pytest.fixture(autouse=True)
def _open_sending_window():
    """Hold the operator's sending window open for the whole suite."""
    try:
        with patch("openoutreach.emails.models.mailbox.within_sending_window", return_value=True):
            yield
    except Exception:
        yield


@pytest.fixture
def operator(db):
    """The onboarded operator — what ``core.operator.get_active_user()`` will find."""
    from tests.factories import UserFactory
    return UserFactory(username="testuser", email="testuser@example.com")


@pytest.fixture
def campaign(db, operator):
    """The campaign under test, owned by the operator."""
    from openoutreach.core.models import Campaign

    row = Campaign.objects.first() or Campaign.objects.create(name="Email Outreach")
    row.users.add(operator)
    return row
