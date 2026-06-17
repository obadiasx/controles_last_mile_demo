from fastapi import APIRouter

from . import sync
from .auth import router as auth_router
from .users import router as users_router
from .conferencias import router as conference_router
from .unidades import router as unidades_router
from .produtos import router as produtos_router
from .solicitacoes_dia import router as solicitacoes_router
from .fornecedores import router as fornecedores_router
from .formas_pagamento import router as formas_pagamento_router
from .solicitacoes_dia_itens import router as itens_router
from .integracao_sidi import router as integracao_sidi_router
from .pendencias_dia import router as pendencias_dia_router

api_router = APIRouter()

# Rotas de usuários
api_router.include_router(auth_router, prefix="/auth", tags=["Autenticação JWT"])
api_router.include_router(users_router, prefix="/users", tags=["Usuários"])

# Rotas de Infra/Sync
api_router.include_router(sync.router)

# Rotas de Negócio/Operação
api_router.include_router(produtos_router, prefix="/produtos", tags=["Produtos"])
api_router.include_router(unidades_router, prefix="/unidades", tags=["Unidades"])
api_router.include_router(fornecedores_router, prefix="/fornecedores", tags=["Fornecedores"])
api_router.include_router(formas_pagamento_router, prefix="/formas-pagamento", tags=["Formas de pagamento"])
api_router.include_router(solicitacoes_router, prefix="/solicitacoes", tags=["Solicitações do Dia"])
api_router.include_router(itens_router, prefix="/solicitacoes-itens", tags=["Itens da Solicitação"])
api_router.include_router(pendencias_dia_router, prefix="/pendencias-dia", tags=["Pendências do dia"])
api_router.include_router(conference_router, prefix="/conferencia", tags=["Conferência de mercadorias"])
api_router.include_router(integracao_sidi_router, tags=["Integração SIDI"])
