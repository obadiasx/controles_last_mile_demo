from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_local_db_session
from backend.app.models.forma_pagamento import FormaPagamento
from backend.app.models.users import User
from backend.app.routers import deps as router_deps
from backend.app.schemas.forma_pagamento import FormaPagamentoResponse

router = APIRouter()


@router.get(
    "/",
    response_model=List[FormaPagamentoResponse],
    summary="Lista formas de pagamento ativas (catálogo interno).",
)
async def listar_formas_pagamento(
    db: AsyncSession = Depends(get_local_db_session),
    _user: User = Depends(router_deps.get_current_user),
):
    stmt = (
        select(FormaPagamento)
        .where(FormaPagamento.ativo.is_(True))
        .order_by(FormaPagamento.tipo, FormaPagamento.dias_prazo, FormaPagamento.descricao)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())
