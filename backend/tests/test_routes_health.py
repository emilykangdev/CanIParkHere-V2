"""
Tests for the liveness endpoint.

/api/live is what Fly's http check probes (see fly.toml). It must return 200
with no dependency probes — these tests would catch someone wiring service
status back into it.
"""


class TestLiveness:
    async def test_live_returns_200_ok(self, client):
        resp = await client.get("/api/live")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}

    async def test_live_does_not_touch_service_container(self, client, monkeypatch):
        """Liveness must not construct or query services."""
        import core.dependencies as deps

        def _boom():
            raise AssertionError("/api/live must not touch the service container")

        monkeypatch.setattr(deps, "get_service_container", _boom)
        resp = await client.get("/api/live")
        assert resp.status_code == 200
