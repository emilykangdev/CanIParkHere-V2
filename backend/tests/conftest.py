"""
Shared pytest fixtures.

These tests run fully offline: no real OpenAI/AWS/Firebase clients are ever
constructed and no network calls are made.

Note on the HTTP client: this repo pins fastapi==0.104.1 / starlette==0.27.0
(matching production), but firebase-admin==7.1.0 hard-pins
httpx[http2]==0.28.1 (also what production actually runs). starlette 0.27's
`starlette.testclient.TestClient` is incompatible with httpx>=0.28 (it still
passes a removed `app=` kwarg straight into `httpx.Client.__init__`), so
`fastapi.testclient.TestClient` cannot be used here without either drifting
the test env's httpx version away from what production installs, or bumping
fastapi/starlette (out of scope for this audit). Instead, tests drive the
app directly via `httpx.AsyncClient` + `httpx.ASGITransport`, which is the
same underlying mechanism TestClient itself uses, just without the broken
compatibility shim. `pytest-asyncio` (asyncio_mode=auto, see pytest.ini)
runs the resulting async test functions.

The `client` fixture never enters an app "lifespan" context, so
main.py's lifespan (which calls `core.dependencies.get_service_container()`
and would construct real OpenAI/AWS/Firebase service objects from whatever
is in the environment or backend/.env) never runs. Route tests instead
override the `get_parking_service` dependency with a mock, and Athena-query
tests call `geo.spatial_query_api` functions directly with a mocked boto3
Athena client.
"""

import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

# `python -m pytest` run from backend/ already puts backend/ on sys.path, but
# make this robust to being invoked from elsewhere too.
BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from main import app  # noqa: E402
from core.dependencies import get_parking_service  # noqa: E402


@pytest.fixture
def mock_parking_service():
    """A ParkingService stand-in with all public async methods mocked."""
    service = MagicMock(name="ParkingService")
    service.analyze_parking_image = AsyncMock()
    service.search_parking = AsyncMock()
    service.check_location = AsyncMock()
    service.answer_followup = AsyncMock()
    return service


@pytest.fixture
async def client(mock_parking_service):
    """Async HTTP client hitting the app in-process, with get_parking_service
    overridden by a mock. See module docstring for why this isn't
    fastapi.testclient.TestClient.
    """
    app.dependency_overrides[get_parking_service] = lambda: mock_parking_service
    transport = httpx.ASGITransport(app=app)
    try:
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as ac:
            yield ac
    finally:
        app.dependency_overrides.pop(get_parking_service, None)
