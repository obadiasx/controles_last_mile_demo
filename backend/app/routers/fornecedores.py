from typing import List

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_local_db_session
from backend.app.models.forma_pagamento import FormaPagamento
from backend.app.repositories.fornecedores import FornecedorCRUD
from backend.app.routers.deps import get_current_user, require_update_supplier
from backend.app.models.users import User
from backend.app.schemas.fornecedores import (
    FornecedorEmailEnvioUpdate,
    FornecedorResponse,
)
from backend.app.schemas.forma_pagamento import FornecedorFormaPagamentoPadraoUpdate

# ... outros imports

router = APIRouter(tags=["Fornecedores"])


# @router.get("/ativos", response_model=List[FornecedorResponse])
# async def listar_fornecedores_ativos(
#         db: AsyncSession = Depends(get_local_db_session)
# ):
#     """
#     Retorna apenas os fornecedores ativos para escolha no aplicativo do comprador.
#     """
#     result = await db.execute(
#         select(Fornecedor).order_by(Fornecedor.fantasia)
#     )
#     return result.scalars().all()


@router.get(
    "/search",
    response_model=List[FornecedorResponse],
    summary="Busca Fornecedores por Fantasia (Autocomplete)"
)
async def search_fornecedores_autocomplete(
        q: str = Query(..., min_length=2, max_length=50),
        limit: int = Query(10, gt=0, le=50),
        db: AsyncSession = Depends(get_local_db_session)
):
    try:
        fornecedores = await FornecedorCRUD.search_autocomplete(
            db=db,
            search_term=q,
            limit=limit
        )
        return fornecedores
    except Exception:
        # Logar o erro real aqui seria ideal
        raise HTTPException(
            status_code=500,
            detail="Erro interno ao realizar a busca de fornecedores."
        )


@router.get(
    "/{fornecedor_id}",
    response_model=FornecedorResponse,
    summary="Obtém fornecedor por ID (detalhe para telas operacionais).",
)
async def obter_fornecedor_por_id(
    fornecedor_id: int,
    db: AsyncSession = Depends(get_local_db_session),
    _current_user: User = Depends(get_current_user),
):
    fornecedor = await FornecedorCRUD.get_by_id(db, fornecedor_id)
    if not fornecedor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fornecedor não encontrado.",
        )
    return fornecedor


@router.patch(
    "/{fornecedor_id}/forma-pagamento-padrao",
    response_model=FornecedorResponse,
    summary="Define a forma de pagamento padrão do fornecedor (perfil financeiro).",
)
async def definir_forma_pagamento_padrao_fornecedor(
    fornecedor_id: int,
    body: FornecedorFormaPagamentoPadraoUpdate,
    db: AsyncSession = Depends(get_local_db_session),
    _current_user: User = Depends(require_update_supplier),
):
    fornecedor = await FornecedorCRUD.get_by_id(db, fornecedor_id)
    if not fornecedor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fornecedor não encontrado.")

    if body.forma_pagamento_id is not None:
        fp = await db.get(FormaPagamento, body.forma_pagamento_id)
        if not fp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Forma de pagamento não encontrada.",
            )
        if not fp.ativo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Forma de pagamento inativa.",
            )

    fornecedor.forma_pagamento_padrao_id = body.forma_pagamento_id
    await db.commit()
    await db.refresh(fornecedor)
    updated = await FornecedorCRUD.get_by_id(db, fornecedor_id)
    return updated


@router.patch(
    "/{fornecedor_id}/email-envio",
    response_model=FornecedorResponse,
    summary="Define o e-mail de envio de pedido ao fornecedor.",
)
async def atualizar_email_envio_fornecedor(
    fornecedor_id: int,
    body: FornecedorEmailEnvioUpdate,
    db: AsyncSession = Depends(get_local_db_session),
    _current_user: User = Depends(require_update_supplier),
):
    fornecedor = await FornecedorCRUD.get_by_id(db, fornecedor_id)
    if not fornecedor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fornecedor não encontrado.")

    fornecedor.email = body.email
    await db.commit()
    await db.refresh(fornecedor)
    updated = await FornecedorCRUD.get_by_id(db, fornecedor_id)
    return updated
