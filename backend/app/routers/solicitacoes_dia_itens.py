import uuid
from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_local_db_session
from backend.app.models.users import User
from backend.app.routers.deps import (
    get_current_user,
    require_update_daily_buy,
    require_delete_daily_buy,
    require_ceagesp_access,
    require_list_solicitacao_itens_or_ceagesp,
    require_cancelar_compra,
)
from backend.app.schemas.solicitacoes_dia_itens import (
    ItemSolicitacaoCreate,
    ItemSolicitacaoUpdate,
    ItemSolicitacaoResponse,
    RegistroCompraBaixa
)
from backend.app.services.solicitacoes_dia_itens import SolicitacaoItemService as service

router = APIRouter(prefix="", tags=["Itens da Solicitação"])


@router.post("/", response_model=ItemSolicitacaoResponse, status_code=status.HTTP_201_CREATED)
async def incluir_item(
        item_in: ItemSolicitacaoCreate,
        db: AsyncSession = Depends(get_local_db_session),
        _current_user: User = Depends(require_update_daily_buy)
):
    return await service.incluir_item(db, item_in)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def excluir_item(
        item_id: uuid.UUID,
        db: AsyncSession = Depends(get_local_db_session),
        _current_user: User = Depends(require_delete_daily_buy)
):
    return await service.excluir_item(db, item_id)


@router.post(
    "/{item_id}/cancelar-compra",
    response_model=ItemSolicitacaoResponse,
    summary="Cancela o registro de compra do item (volta a pendente).",
)
async def cancelar_compra(
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_local_db_session),
    current_user: User = Depends(require_cancelar_compra),
):
    """
    Comprador: só compras do **dia atual** na **própria** missão.
    Financeiro/administrador: qualquer data. Bloqueado se o lote SIDI já estiver integrado.
    """
    return await service.cancelar_compra(db, item_id, current_user)


@router.patch("/{item_id}/baixa", response_model=ItemSolicitacaoResponse)
async def registrar_baixa_ceagesp(
        item_id: uuid.UUID,
        dados: RegistroCompraBaixa,
        db: AsyncSession = Depends(get_local_db_session),
        _ceagesp: User = Depends(require_ceagesp_access),
        current_user: User = Depends(get_current_user),
):
    return await service.registrar_baixa(db, item_id, dados, current_user)


@router.patch("/{item_id}", response_model=ItemSolicitacaoResponse)
async def atualizar_item(
        item_id: uuid.UUID,
        item_up: ItemSolicitacaoUpdate,
        db: AsyncSession = Depends(get_local_db_session),
        current_user: User = Depends(require_update_daily_buy)
):
    return await service.atualizar_item(db, item_id, item_up, current_user)


@router.get("/solicitacao/{solicitacao_id}", response_model=List[ItemSolicitacaoResponse])
async def listar_itens_solicitacao(
    solicitacao_id: uuid.UUID,
    db: AsyncSession = Depends(get_local_db_session),
    _current_user: User = Depends(require_list_solicitacao_itens_or_ceagesp)
):
    """
    Lista todos os itens vinculados a uma 'Missão do Dia' específica.
    """
    return await service.listar_por_solicitacao(db, solicitacao_id)
