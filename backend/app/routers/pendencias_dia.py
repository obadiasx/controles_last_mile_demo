import uuid
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.core.database import get_local_db_session
from backend.app.domain.conferencia_fase import STATUS_EXCLUIDOS_FILA_PADRAO
from backend.app.models.conferencia import ConferenciaItem
from backend.app.models.solicitacoes_dia import SolicitacaoDia
from backend.app.models.solicitacoes_dia_itens import SolicitacaoDiaItem
from backend.app.models.users import User
from backend.app.routers.deps import require_read_daily_buy
from backend.app.schemas.pendencias_dia import (
    NaoRepetirPendenciaRequest,
    PendenciaCompraItem,
    PendenciaRecebimentoItem,
    PendenciasDiaResponse,
    ReagendarPendenciaRequest,
)

router = APIRouter(prefix="", tags=["Pendências do dia"])


def _concat_observacao(atual: str | None, extra: str) -> str:
    base = (atual or "").strip()
    return f"{base} | {extra}" if base else extra


@router.get("/", response_model=PendenciasDiaResponse)
async def listar_pendencias_do_dia(
    data: date = Query(..., description="Data de fechamento. Formato: YYYY-MM-DD"),
    _current_user: User = Depends(require_read_daily_buy),
    db: AsyncSession = Depends(get_local_db_session),
):
    stmt_compra = (
        select(SolicitacaoDiaItem)
        .join(SolicitacaoDia, SolicitacaoDia.id == SolicitacaoDiaItem.solicitacao_id)
        .where(
            SolicitacaoDia.data == data,
            SolicitacaoDiaItem.comprado.is_(False),
        )
        .options(
            selectinload(SolicitacaoDiaItem.produto),
            selectinload(SolicitacaoDiaItem.solicitacao).selectinload(SolicitacaoDia.comprador),
        )
        .order_by(SolicitacaoDiaItem.id.asc())
    )
    compra_rows = (await db.execute(stmt_compra)).scalars().all()

    pendencias_compra = [
        PendenciaCompraItem(
            item_id=row.id,
            solicitacao_id=row.solicitacao_id,
            data_solicitacao=row.solicitacao.data,
            comprador_id=row.solicitacao.comprador_id,
            comprador_nome=(
                row.solicitacao.comprador.username
                if row.solicitacao and row.solicitacao.comprador
                else "Sem comprador"
            ),
            produto_codigo=row.produto_codigo,
            produto_descricao=(
                row.produto.descricao if row.produto else f"Produto {row.produto_codigo}"
            ),
            quantidade=float(row.quantidade),
            unidade=row.unidade,
            observacao=row.observacao,
        )
        for row in compra_rows
    ]

    # Janela do dia [data 00:00, data+1 00:00). Incluir criação OU última atualização:
    # linhas sincronizadas antes e marcadas depois (ex.: PendenteDecisaoFinanceiro)
    # só tinham data_criacao antiga e ficavam fora do painel.
    dia_inicio = datetime.combine(data, datetime.min.time())
    dia_fim = datetime.combine(data + timedelta(days=1), datetime.min.time())
    stmt_recebimento = (
        select(ConferenciaItem)
        .where(
            ConferenciaItem.cancelado.is_(False),
            ~ConferenciaItem.status_conferencia.in_(list(STATUS_EXCLUIDOS_FILA_PADRAO)),
            or_(
                and_(
                    ConferenciaItem.data_criacao >= dia_inicio,
                    ConferenciaItem.data_criacao < dia_fim,
                ),
                and_(
                    ConferenciaItem.data_atualizacao >= dia_inicio,
                    ConferenciaItem.data_atualizacao < dia_fim,
                ),
            ),
        )
        .order_by(ConferenciaItem.fornecedor.asc(), ConferenciaItem.produto.asc())
    )
    recebimento_rows = (await db.execute(stmt_recebimento)).scalars().all()

    pendencias_recebimento = [
        PendenciaRecebimentoItem(
            pedido_id=row.pedido_id,
            item=row.item,
            fornecedor=row.fornecedor,
            produto=row.produto,
            quantidade_esperada=float(row.quantidade_esperada),
            quantidade_fisica=float(row.quantidade_fisica),
            status_conferencia=row.status_conferencia,
            cancelado=row.cancelado,
            observacoes=row.observacoes,
        )
        for row in recebimento_rows
    ]

    return PendenciasDiaResponse(
        data=data,
        total_pendencias_compra=len(pendencias_compra),
        total_pendencias_recebimento=len(pendencias_recebimento),
        pendencias_compra=pendencias_compra,
        pendencias_recebimento=pendencias_recebimento,
    )


@router.post("/{item_id}/reagendar", response_model=PendenciaCompraItem)
async def reagendar_pendencia_compra(
    item_id: uuid.UUID,
    payload: ReagendarPendenciaRequest,
    _current_user: User = Depends(require_read_daily_buy),
    db: AsyncSession = Depends(get_local_db_session),
):
    stmt_item = (
        select(SolicitacaoDiaItem)
        .where(SolicitacaoDiaItem.id == item_id)
        .options(
            selectinload(SolicitacaoDiaItem.produto),
            selectinload(SolicitacaoDiaItem.solicitacao).selectinload(SolicitacaoDia.comprador),
        )
    )
    item = (await db.execute(stmt_item)).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item pendente não encontrado.")
    if item.comprado:
        raise HTTPException(status_code=400, detail="Item já comprado não pode ser reagendado.")

    origem = item.solicitacao
    if not origem:
        raise HTTPException(status_code=404, detail="Solicitação de origem não encontrada.")

    stmt_dest = select(SolicitacaoDia).where(
        SolicitacaoDia.data == payload.nova_data,
        SolicitacaoDia.comprador_id == origem.comprador_id,
    )
    destino = (await db.execute(stmt_dest)).scalar_one_or_none()
    if not destino:
        destino = SolicitacaoDia(data=payload.nova_data, comprador_id=origem.comprador_id)
        db.add(destino)
        await db.flush()

    item.solicitacao_id = destino.id
    item.observacao = _concat_observacao(
        item.observacao,
        (
            f"Pendência reagendada de {origem.data.strftime('%d/%m/%Y')} "
            f"para {payload.nova_data.strftime('%d/%m/%Y')}."
        ),
    )
    await db.commit()
    await db.refresh(item)
    await db.refresh(destino)

    comprador_nome = "Sem comprador"
    if origem.comprador:
        comprador_nome = origem.comprador.username

    return PendenciaCompraItem(
        item_id=item.id,
        solicitacao_id=item.solicitacao_id,
        data_solicitacao=destino.data,
        comprador_id=destino.comprador_id,
        comprador_nome=comprador_nome,
        produto_codigo=item.produto_codigo,
        produto_descricao=(
            item.produto.descricao if item.produto else f"Produto {item.produto_codigo}"
        ),
        quantidade=float(item.quantidade),
        unidade=item.unidade,
        observacao=item.observacao,
    )


@router.post("/{item_id}/nao-repetir", response_model=PendenciaCompraItem)
async def marcar_pendencia_nao_repetir(
    item_id: uuid.UUID,
    payload: NaoRepetirPendenciaRequest,
    _current_user: User = Depends(require_read_daily_buy),
    db: AsyncSession = Depends(get_local_db_session),
):
    stmt = (
        select(SolicitacaoDiaItem)
        .where(SolicitacaoDiaItem.id == item_id)
        .options(
            selectinload(SolicitacaoDiaItem.produto),
            selectinload(SolicitacaoDiaItem.solicitacao).selectinload(SolicitacaoDia.comprador),
        )
    )
    item = (await db.execute(stmt)).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item pendente não encontrado.")
    if item.comprado:
        raise HTTPException(status_code=400, detail="Item já comprado não pode ser marcado.")

    detalhe = "Pendência marcada como não repetir."
    if payload.motivo:
        detalhe = f"{detalhe} Motivo: {payload.motivo.strip()}"
    item.observacao = _concat_observacao(item.observacao, detalhe)

    await db.commit()
    await db.refresh(item)

    return PendenciaCompraItem(
        item_id=item.id,
        solicitacao_id=item.solicitacao_id,
        data_solicitacao=item.solicitacao.data,
        comprador_id=item.solicitacao.comprador_id,
        comprador_nome=(
            item.solicitacao.comprador.username
            if item.solicitacao and item.solicitacao.comprador
            else "Sem comprador"
        ),
        produto_codigo=item.produto_codigo,
        produto_descricao=(
            item.produto.descricao if item.produto else f"Produto {item.produto_codigo}"
        ),
        quantidade=float(item.quantidade),
        unidade=item.unidade,
        observacao=item.observacao,
    )


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancelar_pendencia_compra(
    item_id: uuid.UUID,
    _current_user: User = Depends(require_read_daily_buy),
    db: AsyncSession = Depends(get_local_db_session),
):
    item = await db.get(SolicitacaoDiaItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item pendente não encontrado.")
    if item.comprado:
        raise HTTPException(status_code=400, detail="Item comprado não pode ser cancelado aqui.")

    await db.delete(item)
    await db.commit()
