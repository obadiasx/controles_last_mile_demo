"""
Variáveis de ambiente mínimas antes de importar `backend.app.app_main`.
"""
import os

os.environ.setdefault("DEBUG", "false")
os.environ.setdefault("APP_NAME", "Distribuidora de Alimentos (testes)")
os.environ.setdefault("APP_VERSION", "0")
os.environ.setdefault("APP_DESCRIPTION", "")
os.environ.setdefault("CORS_ORIGINS", "*")
os.environ.setdefault("CORS_ALLOW_CREDENTIALS", "true")
