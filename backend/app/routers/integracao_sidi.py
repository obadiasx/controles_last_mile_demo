"""
Endpoints GET/PATCH para consumo pelo SIDI (docs/integracao_sidi_get_patch_api.md).
Proteção opcional: variável de ambiente SIDI_INTEGRACAO_API_KEY + header X-Sidi-Integration-Key.
"""
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_local_db_session
from backend.app.schemas.integracao_sidi import (
    IntegracaoSidiGetMeta,
    IntegracaoSidiGetResponse,
    IntegracaoSidiItemOut,
    IntegracaoSidiPatchConfirmacaoIn,
    IntegracaoSidiPatchResponse,
    IntegracaoSidiPedidoOut,
)
from backend.app.services.integracao_sidi_pedido_app import IntegracaoSidiPedidoAppService

router = APIRouter(prefix="/v1/integracao/sidi", tags=["Integração SIDI"])


async def require_sidi_integracao(
    x_sidi_integration_key: str | None = Header(None, alias="X-Sidi-Integration-Key"),
):
    expected = (os.getenv("SIDI_INTEGRACAO_API_KEY") or "").strip()
    if not expected:
        return
    if not x_sidi_integration_key or x_sidi_integration_key != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Chave de integração inválida ou ausente (header X-Sidi-Integration-Key).",
        )


@router.get("/pedidos-pendentes", response_model=IntegracaoSidiGetResponse)
async def get_pedidos_pendentes(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_local_db_session),
    _auth=Depends(require_sidi_integracao),
):
    rows = await IntegracaoSidiPedidoAppService.listar_pendentes_para_get(db, limit=limit)
    pedidos_out: list[IntegracaoSidiPedidoOut] = []
    for p in rows:
        itens_sorted = sorted(p.itens, key=lambda x: x.item_seq)
        itens_out = [
            IntegracaoSidiItemOut(
                item_uuid=i.id,
                item_seq=i.item_seq,
                produto_id=i.produto_id,
                qtde=float(i.qtde),
                preco=float(i.preco),
                un=i.un,
                peso=float(i.peso) if i.peso is not None else None,
                totkg=float(i.totkg) if i.totkg is not None else None,
                obs=((i.obs or "")[:40] or None),
                dtmovim=i.dtmovim,
            )
            for i in itens_sorted
        ]
        pedidos_out.append(
            IntegracaoSidiPedidoOut(
                pedido_uuid=p.id,
                data_compra=p.data_compra,
                fornecedor_id=p.fornecedor_id,
                fornecedor_fantasia=p.fornecedor_fantasia,
                comprador_codigo_sidi=p.comprador_codigo_sidi,
                valor_total=float(p.valor_total),
                itens_total=p.itens_total,
                kg_total=float(p.kg_total),
                un_total=float(p.un_total),
                hora_pedido=p.hora_pedido,
                itens=itens_out,
            )
        )

    return IntegracaoSidiGetResponse(
        meta=IntegracaoSidiGetMeta(
            gerado_em=datetime.now(timezone.utc),
            proximo_cursor=None,
        ),
        pedidos=pedidos_out,
    )


@router.patch("/confirmacoes", response_model=IntegracaoSidiPatchResponse)
async def patch_confirmacoes(
    body: IntegracaoSidiPatchConfirmacaoIn,
    db: AsyncSession = Depends(get_local_db_session),
    _auth=Depends(require_sidi_integracao),
):
    tuplas = [(x.item_uuid, x.sidi_item) for x in body.itens_confirmados]
    try:
        ok, idempotente = await IntegracaoSidiPedidoAppService.aplicar_patch_confirmacao(
            db,
            pedido_uuid=body.pedido_uuid,
            sucesso=body.sucesso,
            sidi_numped=body.sidi_numped,
            itens_confirmados=tuplas,
            codigo_erro=body.codigo_erro,
            mensagem=body.mensagem,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="pedido_uuid não encontrado.",
        )

    await db.commit()
    return IntegracaoSidiPatchResponse(
        ok=True,
        pedido_uuid=body.pedido_uuid,
        idempotente=idempotente,
    )
