import os
import uvicorn
import asyncio
import sys

from backend.app.core.config import load_env
load_env()
from backend.app.core.initialization import (
    assign_permissions_to_roles,
    create_admin_user,
    create_tables,
    initialize_default_roles,
    seed_formas_pagamento,
)
from backend.app.core.database import local_engine, origem_engine

# --- Função Principal de Inicialização Assíncrona ---
async def initialize_application():
    """
    Executa todas as tarefas de inicialização de banco de dados e usuários.
    """
    print("🚀 Iniciando a inicialização do banco de dados...")

    try:
        await create_tables()
        await seed_formas_pagamento()
        await initialize_default_roles()
        await create_admin_user()
        await assign_permissions_to_roles()

        print("✅ Inicialização do banco de dados concluída com sucesso!")

    except Exception as e:
        print(f"❌ Erro durante a inicialização do banco de dados: {e}")
        sys.exit(1)
    finally:
        # Descarta o pool de conexões criado no event loop da inicialização.
        # O Uvicorn usa outro event loop; sem isso, ocorrem erros como
        # "Future attached to a different loop" e "another operation is in progress".
        await local_engine.dispose()
        await origem_engine.dispose()


if __name__ == "__main__":
    is_development = (os.getenv('ENVIRONMENT') or '').lower() == "development"

    # 1. EXECUTA A TAREFA ASSÍNCRONA DE INICIALIZAÇÃO
    asyncio.run(initialize_application())

    # 2. INICIA O SERVIDOR APÓS A CONCLUSÃO DA INICIALIZAÇÃO DO DB
    print("Iniciando o servidor Uvicorn...")
    uvicorn.run(
        "backend.app.app_main:app",
        host="0.0.0.0",
        port=8000,
        reload=is_development,
        log_level=os.getenv('LOG_LEVEL', 'info').lower(),
    )
