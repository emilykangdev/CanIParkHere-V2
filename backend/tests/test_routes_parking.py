"""
Route-level exception-handling tests for routes/parking.py.

Verifies the fix for the "swallowed status codes / leaked internals" issue:
  - Custom app exceptions (InvalidImageError, ServiceUnavailableError,
    ParkingAnalysisError) raised inside a handler's try block must pass
    through with their own status code, not get re-wrapped into a 422
    ParkingAnalysisError.
  - Truly unexpected exceptions must still surface as a 422
    ParkingAnalysisError, but the raw exception text must never appear in
    the response body sent to the client.

All service calls are mocked via the `client`/`mock_parking_service`
fixtures in conftest.py -- no real OpenAI/AWS/Firebase calls happen.
Tests are async because `client` is an httpx.AsyncClient (see conftest.py
for why fastapi.testclient.TestClient can't be used here); asyncio_mode=auto
in pytest.ini means no per-test @pytest.mark.asyncio is needed.
"""

from core.exceptions import ServiceUnavailableError, ParkingAnalysisError

SECRET = "db_password=hunter2;internal_host=10.0.0.7"


def _png_bytes(size: int) -> bytes:
    return b"\x89PNG\r\n\x1a\n" + b"0" * max(0, size - 8)


class TestCheckParkingImage:
    async def test_non_image_content_type_returns_400(self, client, mock_parking_service):
        resp = await client.post(
            "/api/check-parking-image",
            files={"file": ("test.txt", b"not an image", "text/plain")},
        )
        assert resp.status_code == 400
        assert resp.json()["detail"] == "File must be an image"
        mock_parking_service.analyze_parking_image.assert_not_called()

    async def test_oversized_image_returns_400_invalid_image_error(self, client, mock_parking_service):
        oversized = _png_bytes(10 * 1024 * 1024 + 1)
        resp = await client.post(
            "/api/check-parking-image",
            files={"file": ("big.png", oversized, "image/png")},
        )
        assert resp.status_code == 400
        assert resp.json()["detail"] == "Image file too large (max 10MB)"
        assert resp.json()["error_type"] == "invalid_image"
        mock_parking_service.analyze_parking_image.assert_not_called()

    async def test_empty_image_returns_400_invalid_image_error(self, client, mock_parking_service):
        resp = await client.post(
            "/api/check-parking-image",
            files={"file": ("empty.png", b"", "image/png")},
        )
        assert resp.status_code == 400
        assert resp.json()["detail"] == "Empty image file"
        mock_parking_service.analyze_parking_image.assert_not_called()

    async def test_service_unavailable_error_passes_through_as_503(self, client, mock_parking_service):
        mock_parking_service.analyze_parking_image.side_effect = ServiceUnavailableError("openai")
        resp = await client.post(
            "/api/check-parking-image",
            files={"file": ("test.png", _png_bytes(100), "image/png")},
        )
        assert resp.status_code == 503
        assert resp.json()["error_type"] == "service_unavailable"

    async def test_generic_exception_returns_422_without_leaking_internals(self, client, mock_parking_service):
        mock_parking_service.analyze_parking_image.side_effect = RuntimeError(SECRET)
        resp = await client.post(
            "/api/check-parking-image",
            files={"file": ("test.png", _png_bytes(100), "image/png")},
        )
        assert resp.status_code == 422
        body = resp.json()
        assert SECRET not in body["detail"]
        assert body["detail"] == "Failed to analyze image"


class TestSearchParking:
    valid_payload = {"latitude": 47.6062, "longitude": -122.3321, "radius_meters": 200}

    async def test_parking_analysis_error_passes_through_unwrapped(self, client, mock_parking_service):
        mock_parking_service.search_parking.side_effect = ParkingAnalysisError("no data for this region")
        resp = await client.post("/api/search-parking", json=self.valid_payload)
        assert resp.status_code == 422
        assert resp.json()["detail"] == "no data for this region"

    async def test_generic_exception_returns_422_without_leaking_internals(self, client, mock_parking_service):
        mock_parking_service.search_parking.side_effect = RuntimeError(SECRET)
        resp = await client.post("/api/search-parking", json=self.valid_payload)
        assert resp.status_code == 422
        body = resp.json()
        assert SECRET not in body["detail"]
        assert body["detail"] == "Failed to search parking"

    async def test_invalid_latitude_returns_422_validation_error(self, client):
        resp = await client.post("/api/search-parking", json={"latitude": 999, "longitude": -122.3321})
        assert resp.status_code == 422


class TestCheckParkingLocation:
    valid_payload = {"latitude": 47.6062, "longitude": -122.3321}

    async def test_generic_exception_returns_422_without_leaking_internals(self, client, mock_parking_service):
        mock_parking_service.check_location.side_effect = RuntimeError(SECRET)
        resp = await client.post("/api/check-parking-location", json=self.valid_payload)
        assert resp.status_code == 422
        body = resp.json()
        assert SECRET not in body["detail"]
        assert body["detail"] == "Failed to check location"


class TestFollowup:
    valid_payload = {"session_id": "abc-123", "question": "Can I park here after 6pm?"}

    async def test_generic_exception_returns_422_without_leaking_internals(self, client, mock_parking_service):
        mock_parking_service.answer_followup.side_effect = RuntimeError(SECRET)
        resp = await client.post("/api/followup", json=self.valid_payload)
        assert resp.status_code == 422
        body = resp.json()
        assert SECRET not in body["detail"]
        assert body["detail"] == "Failed to answer follow-up"

    async def test_question_too_long_returns_422_validation_error(self, client):
        resp = await client.post(
            "/api/followup",
            json={"session_id": "abc-123", "question": "x" * 501},
        )
        assert resp.status_code == 422
