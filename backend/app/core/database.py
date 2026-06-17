from dotenv import load_dotenv
load_dotenv()
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
import logging
from typing import AsyncGenerator

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

logger = logging.getLogger(__name__)

DATABASE_URL = \
    f"postgresql+asyncpg://" \
    f"{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@" \
    f"{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/" \
    f"{os.getenv('DB_NAME')}"

# Cria mecanismo assíncrono para a conexão local
local_engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,  # Verifica conexão antes de usar (evita "another operation in progress")
    pool_recycle=300,    # Recicla conexões a cada 5 min (evita conexões obsoletas com DB remoto)
)

# Session Maker para o DB Local
async_local_session_maker = async_sessionmaker(
    local_engine,
    class_=AsyncSession,
    expire_on_commit=False
)


# Base class for all models
class Base(DeclarativeBase):
    pass
    # metadata = MetaData(
    #     schema="public",
    #     naming_convention={
    #         "ix": "ix_%(column_0_label)s",
    #         "uq": "uq_%(table_name)s_%(column_0_name)s",
    #         "ck": "ck_%(table_name)s_%(constraint_name)s",
    #         "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    #         "pk": "pk_%(table_name)s"
    #     }
    # )


# --- Configuração do Banco de Dados de ORIGEM (ITENSC) ---

# URL do banco de dados de Origem
ORIGEM_DATABASE_URL = \
    f"postgresql+asyncpg://" \
    f"{os.getenv('DB_ORIGEM_USER')}:{os.getenv('DB_ORIGEM_PASSWORD')}@" \
    f"{os.getenv('DB_ORIGEM_HOST')}:{os.getenv('DB_ORIGEM_PORT')}/" \
    f"{os.getenv('DB_ORIGEM_NAME')}"

# Engine do Banco de Dados de Origem
origem_engine = create_async_engine(
    ORIGEM_DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_recycle=300,
)

# Session Maker para o DB de Origem
async_origem_session_maker = async_sessionmaker(
    bind=origem_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# --- Dependência FastAPI para o DB Local ---
async def get_local_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependência para obter uma sessão de DB local."""
    async with async_local_session_maker() as session:
        yield session


# --- Dependência FastAPI para o DB de Origem ---

async def get_origem_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependência para obter uma sessão de DB de ORIGEM."""
    async with async_origem_session_maker() as session:
        yield session


async def check_db_connection():
    """
    Verifica se a conexão com o banco de dados está ativa.
    Útil para health checks na inicialização.
    """
    context = '[banco ainda não contectado]'
    try:
        context = 'local'
        async with local_engine.connect() as connection:
            # Tenta executar uma consulta simples
            await connection.execute(text("SELECT 1"))
        logger.info("Conexão com o banco de dados local bem-sucedida.")
        context = 'origem'
        async with origem_engine.connect() as connection:
            # Tenta executar uma consulta simples
            await connection.execute(text("SELECT 1"))
        logger.info("Conexão com o banco de dados origem bem-sucedida.")
        return True
    except Exception as e:
        logger.error(f"Falha na conexão com o banco de dados {context}: {e}")
        return False
    
    
