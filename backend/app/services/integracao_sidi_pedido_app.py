"""
Lógica de fila local para integração SIDI (banco do app apenas).
"""
from __future__ import annotations

import os
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional, Tuple
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.models.integracao_sidi import (
    IntegracaoSidiPedido,
    IntegracaoSidiPedidoItem,
    IntegracaoSidiPedidoStatus,
)
from backend.app.models.users import User
from backend.app.models.fornecedores import Fornecedor

TZ_SP = ZoneInfo("America/Sao_Paulo")


def comprador_codigo_sidi_para_exportacao(comprador: User) -> str:
    """
    Valor exposto no GET como `comprador_codigo_sidi`.
    Override opcional: SIDI_COMPRADOR_CODIGO_PADRAO (ex.: rótulo fixo esperado pelo SIDI).
    """
    override = (os.getenv("SIDI_COMPRADOR_CODIGO_PADRAO") or "").strip()
    if override:
        return override[:40]
    base = (comprador.username or comprador.name_full or "COMPRADOR").strip()
    return base[:40]


class IntegracaoSidiPedidoAppService:
    @staticmethod
    async def buscar_pedido_pendente(
        db: AsyncSession,
        *,
        data_compra: date,
        fornecedor_id: int,
        comprador_id: uuid.UUID,
    ) -> Optional[IntegracaoSidiPedido]:
        stmt = (
            select(IntegracaoSidiPedido)
            .where(
                IntegracaoSidiPedido.data_compra == data_compra,
                IntegracaoSidiPedido.fornecedor_id == fornecedor_id,
                IntegracaoSidiPedido.comprador_id == comprador_id,
                IntegracaoSidiPedido.status == IntegracaoSidiPedidoStatus.PENDENTE,
            )
            .options(selectinload(IntegracaoSidiPedido.itens))
            .limit(1)
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def registrar_item_compra_ceagesp(
        db: AsyncSession,
        *,
        data_compra: date,
        comprador: User,
        fornecedor: Fornecedor,
        solicitacao_dia_item_id: uuid.UUID,
        produto_id: int,
        qtde: Decimal,
        preco: Decimal,
        un: str,
        peso: Decimal,
        totkg: Decimal,
        obs: str,
        dtmovim: date,
        valor_linha: Decimal,
    ) -> Tuple[IntegracaoSidiPedido, IntegracaoSidiPedidoItem]:
        """
        Anexa linha ao pedido pendente do dia/fornecedor/comprador ou cria novo cabeçalho.
        """
        pedido = await IntegracaoSidiPedidoAppService.buscar_pedido_pendente(
            db,
            data_compra=data_compra,
            fornecedor_id=fornecedor.id,
            comprador_id=comprador.id,
        )
        agora_hora = datetime.now(TZ_SP).time()

        if not pedido:
            pedido = IntegracaoSidiPedido(
                data_compra=data_compra,
                comprador_id=comprador.id,
                comprador_codigo_sidi=comprador_codigo_sidi_para_exportacao(comprador),
                fornecedor_id=fornecedor.id,
                fornecedor_fantasia=(fornecedor.fantasia or "")[:30],
                valor_total=Decimal("0"),
                itens_total=0,
                kg_total=Decimal("0"),
                un_total=Decimal("0"),
                hora_pedido=agora_hora,
                status=IntegracaoSidiPedidoStatus.PENDENTE,
            )
            db.add(pedido)
            await db.flush()
            prox_seq = 1
        else:
            stmt = select(IntegracaoSidiPedidoItem.item_seq).where(
                IntegracaoSidiPedidoItem.pedido_id == pedido.id
            )
            res = await db.execute(stmt)
            seqs = [int(r[0]) for r in res.fetchall()]
            prox_seq = max(seqs, default=0) + 1

        linha = IntegracaoSidiPedidoItem(
            pedido_id=pedido.id,
            solicitacao_dia_item_id=solicitacao_dia_item_id,
            item_seq=prox_seq,
            produto_id=produto_id,
            qtde=qtde,
            preco=preco,
            un=(un or "")[:6],
            peso=peso,
            totkg=totkg,
            obs=(obs or "")[:80] or None,
            dtmovim=dtmovim,
        )
        db.add(linha)

        pedido.valor_total = Decimal(str(pedido.valor_total or 0)) + valor_linha
        pedido.itens_total = int(pedido.itens_total or 0) + 1
        pedido.kg_total = Decimal(str(pedido.kg_total or 0)) + totkg
        pedido.un_total = Decimal(str(pedido.un_total or 0)) + qtde
        pedido.hora_pedido = agora_hora

        await db.flush()
        return pedido, linha

    @staticmethod
    async def listar_pendentes_para_get(
        db: AsyncSession, *, limit: int = 50
    ) -> List[IntegracaoSidiPedido]:
        stmt = (
            select(IntegracaoSidiPedido)
            .where(IntegracaoSidiPedido.status == IntegracaoSidiPedidoStatus.PENDENTE)
            .options(selectinload(IntegracaoSidiPedido.itens))
            .order_by(IntegracaoSidiPedido.created_at.asc())
            .limit(limit)
        )
        res = await db.execute(stmt)
        return list(res.scalars().unique().all())

    @staticmethod
    async def aplicar_patch_confirmacao(
        db: AsyncSession,
        *,
        pedido_uuid: uuid.UUID,
        sucesso: bool,
        sidi_numped: Optional[int],
        itens_confirmados: List[Tuple[uuid.UUID, int]],
        codigo_erro: Optional[str],
        mensagem: Optional[str],
    ) -> Tuple[bool, bool]:
        """
        Retorna (ok, idempotente).
        """
        stmt = (
            select(IntegracaoSidiPedido)
            .where(IntegracaoSidiPedido.id == pedido_uuid)
            .options(selectinload(IntegracaoSidiPedido.itens))
        )
        res = await db.execute(stmt)
        pedido = res.scalar_one_or_none()
        if not pedido:
            return False, False

        # Já integrado no SIDI: PATCH repetido (idempotência do contrato).
        if pedido.status == IntegracaoSidiPedidoStatus.INTEGRADO:
            return True, True

        if sucesso:
            if pedido.status not in (
                IntegracaoSidiPedidoStatus.PENDENTE,
                IntegracaoSidiPedidoStatus.ERRO,
            ):
                raise ValueError(
                    "Pedido não está em estado que permita confirmação de sucesso "
                    f"(status atual: {pedido.status})."
                )
            if sidi_numped is None:
                raise ValueError("sidi_numped é obrigatório quando sucesso=true.")
            mapa = {iid: sid for iid, sid in itens_confirmados}
            ids_esperados = {it.id for it in pedido.itens}
            if set(mapa.keys()) != ids_esperados:
                raise ValueError(
                    "itens_confirmados deve incluir exatamente um registro por item do pedido."
                )
            pedido.status = IntegracaoSidiPedidoStatus.INTEGRADO
            pedido.sidi_numped = sidi_numped
            pedido.ultimo_erro = None
            pedido.ultimo_codigo_erro = None
            for it in pedido.itens:
                it.sidi_item = mapa[it.id]
        else:
            pedido.status = IntegracaoSidiPedidoStatus.ERRO
            pedido.ultimo_codigo_erro = (codigo_erro or "")[:40] or None
            pedido.ultimo_erro = mensagem

        await db.flush()
        return True, False
