"""Endpoints de saúde (Sprint 9 — monitoramento básico)."""
from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient

import backend.app.app_main as app_main
from backend.app.app_main import app


def test_health_liveness():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "app" in body
    assert "version" in body


class _FakeConn:
    async def execute(self, *_args, **_kwargs):
        return None


class _FakeConnectCM:
    async def __aenter__(self):
        return _FakeConn()

    async def __aexit__(self, *_args):
        return None


class _FakeEngineOk:
    def connect(self):
        return _FakeConnectCM()


def test_health_readiness_ok(monkeypatch):
    monkeypatch.setattr(app_main, "local_engine", _FakeEngineOk())
    client = TestClient(app)
    response = client.get("/health/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready", "database": "ok"}


def test_health_readiness_degraded(monkeypatch):
    bad_cm = MagicMock()
    bad_cm.__aenter__ = AsyncMock(side_effect=RuntimeError("db down"))
    bad_cm.__aexit__ = AsyncMock(return_value=None)

    class _FakeEngineBad:
        def connect(self):
            return bad_cm

    monkeypatch.setattr(app_main, "local_engine", _FakeEngineBad())
    client = TestClient(app)
    response = client.get("/health/ready")
    assert response.status_code == 503
    assert response.json()["status"] == "not_ready"
