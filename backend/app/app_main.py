import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from backend.app.core.database import local_engine
from backend.app.core.exceptions import AccessControlException
from backend.app.routers.api_router import api_router

app = FastAPI(
    title=os.getenv('APP_NAME'),
    version=os.getenv('APP_VERSION'),
    description=os.getenv('APP_DESCRIPTION'),
    debug=os.getenv('DEBUG').lower() == 'true',
    root_path="/api",
)


@app.exception_handler(AccessControlException)
async def access_control_exception_handler(_request: Request, exc: AccessControlException):
    """
    Handler global para todas as exceções personalizadas que herdam de AccessControlException.
    Ele usa o status_code e a mensagem que já estão definidos na exceção.
    """
    content = {
        "detail": exc.message
    }

    # Adiciona detalhes extras se existirem
    if exc.details:
        content["details"] = exc.details

    return JSONResponse(
        status_code=exc.status_code,  # Pega o status_code (e.g., 404) da exceção
        content=content,
    )


# Middleware
app.add_middleware(
    CORSMiddleware,  # type: ignore
    allow_origins=os.getenv('CORS_ORIGINS'),
    allow_credentials=os.getenv('CORS_ALLOW_CREDENTIALS'),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Observabilidade"])
def health_liveness():
    """Verificação leve (liveness): processo ativo, sem dependência de banco."""
    return {
        "status": "ok",
        "app": os.getenv("APP_NAME"),
        "version": os.getenv("APP_VERSION"),
    }


@app.get("/health/ready", tags=["Observabilidade"])
async def health_readiness():
    """Readiness: verifica conexão com o banco local (PostgreSQL)."""
    try:
        async with local_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "database": "unavailable"},
        )
    return {"status": "ready", "database": "ok"}


# Rotas
app.include_router(api_router)
