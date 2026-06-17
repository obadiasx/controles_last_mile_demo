"""Smoke: aplicação FastAPI carrega com variáveis de ambiente de teste."""
from fastapi.testclient import TestClient

from backend.app.app_main import app


def test_openapi_json_disponivel():
    client = TestClient(app)
    response = client.get("/openapi.json")
    assert response.status_code == 200
    data = response.json()
    assert "openapi" in data
    assert data.get("info", {}).get("title")


def test_app_titulo_configurado():
    assert app.title is not None
