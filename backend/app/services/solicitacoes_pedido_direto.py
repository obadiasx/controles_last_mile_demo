"""Fluxo pedido direto ao fornecedor: e-mail + baixa automática (fila SIDI / conferência)."""

from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.fornecedores import Fornecedor
from backend.app.models.solicitacoes_dia import SolicitacaoDia
from backend.app.models.solicitacoes_dia_itens import SolicitacaoDiaItem
from backend.app.models.users import User
from backend.app.schemas.solicitacoes_dia_itens import RegistroCompraBaixa
from backend.app.services.solicitacoes_dia_itens import SolicitacaoItemService
from backend.app.services.solicitacoes_email_fornecedor import (
    enviar_pedido_fornecedor_por_email_com_itens_carregados,
    listar_itens_pendentes_para_envio_email,
)


async def concluir_pedido_direto_fornecedor(
    *,
    db: AsyncSession,
    solicitacao_id: uuid.UUID,
    fornecedor_id: int,
    observacao: str | None,
    current_user: User,
) -> dict:
    """
    1) Envia e-mail ao fornecedor com os itens pendentes filtrados.
    2) Registra baixa (compra) em cada item, integrando à fila CEAGESP/SIDI.
    Exige que todos os itens pendentes do recorte tenham fornecedor e forma de pagamento.
    """
    solicitacao = await db.get(SolicitacaoDia, solicitacao_id)
    if not solicitacao:
        raise HTTPException(status_code=404, detail="Solicitação do dia não encontrada.")

    fornecedor = await db.get(Fornecedor, fornecedor_id)
    if not fornecedor:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado.")

    itens = await listar_itens_pendentes_para_envio_email(
        db, solicitacao_id=solicitacao_id, fornecedor_id=fornecedor_id
    )
    if not itens:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não há itens pendentes para este fornecedor.",
        )

    for it in itens:
        if it.fornecedor_id is None or it.fornecedor_id != fornecedor_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Pedido direto: todos os itens pendentes devem estar vinculados ao fornecedor "
                    "selecionado antes da conclusão."
                ),
            )
        if it.forma_pagamento_ref_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Item sem forma de pagamento. Inclua novamente após escolher o fornecedor "
                    "ou cadastre forma padrão no fornecedor."
                ),
            )
        if it.valor_unitario is None or float(it.valor_unitario) <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Item sem preço unitário estimado. Inclua novamente informando o preço na linha."
                ),
            )

    email_enviado = True
    aviso_email: str | None = None
    try:
        await enviar_pedido_fornecedor_por_email_com_itens_carregados(
            db=db,
            solicitacao=solicitacao,
            fornecedor=fornecedor,
            itens=itens,
            observacao=observacao,
            current_user=current_user,
        )
    except HTTPException as exc:
        email_enviado = False
        aviso_email = str(exc.detail)
    except Exception as exc:
        email_enviado = False
        aviso_email = f"Falha no envio de e-mail: {exc}"

    for it in itens:
        vu = float(it.valor_unitario)
        dados = RegistroCompraBaixa(
            fornecedor_id=fornecedor_id,
            quantidade_adquirida=float(it.quantidade),
            unidade_comprada=it.unidade,
            valor_unitario=vu,
            forma_pagamento_id=it.forma_pagamento_ref_id,
            observacao=None,
        )
        await SolicitacaoItemService.registrar_baixa(db, it.id, dados, current_user)

    mensagem = (
        "Pedido enviado por e-mail e registrado para conferência / integração."
        if email_enviado
        else "Pedido registrado para conferência / integração, mas houve falha no envio do e-mail."
    )

    return {
        "solicitacao_id": solicitacao_id,
        "fornecedor_id": fornecedor.id,
        "fornecedor_nome": fornecedor.fantasia,
        "total_itens": len(itens),
        "enviado_por": current_user.username,
        "mensagem": mensagem,
        "email_enviado": email_enviado,
        "aviso_email": aviso_email,
    }
