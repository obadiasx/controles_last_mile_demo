import smtplib
from typing import List, Sequence

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.models.fornecedores import Fornecedor
from backend.app.models.notificacao_sidi import SidiNotificacaoSmtpConfig
from backend.app.models.solicitacoes_dia import SolicitacaoDia
from backend.app.models.solicitacoes_dia_itens import SolicitacaoDiaItem
from backend.app.models.users import User
from backend.app.services.conferencia_notificacao_sidi import (
    enviar_email_contingencia_sidi,
)


def renderizar_template_pedido_fornecedor(
    *,
    solicitacao: SolicitacaoDia,
    fornecedor: Fornecedor,
    itens: Sequence[SolicitacaoDiaItem],
    solicitante: User,
    observacao: str | None,
) -> str:
    linhas = [
        "Solicitacao de compra (financeiro)",
        "",
        f"Solicitacao: {solicitacao.id}",
        f"Data da solicitacao: {solicitacao.data}",
        f"Fornecedor: {fornecedor.fantasia}",
        f"Solicitante: {solicitante.name_full}",
        "",
        "Itens solicitados:",
    ]
    for idx, item in enumerate(itens, start=1):
        descricao = (item.produto.descricao if item.produto else "").strip() or f"Produto {item.produto_codigo}"
        linhas.append(
            f"{idx}. {descricao} | qtd: {float(item.quantidade):g} {item.unidade}"
        )

    if (solicitacao.observacoes or "").strip():
        linhas.extend(["", f"Observacoes da solicitacao: {solicitacao.observacoes}"])
    if (observacao or "").strip():
        linhas.extend(["", f"Observacao adicional (financeiro): {observacao.strip()}"])

    linhas.extend(["", "Mensagem gerada automaticamente pelo ERP Sabor da Terra."])
    return "\n".join(linhas)


async def listar_itens_pendentes_para_envio_email(
    db: AsyncSession,
    *,
    solicitacao_id,
    fornecedor_id: int,
) -> List[SolicitacaoDiaItem]:
    """
    Itens pendentes a incluir no e-mail ao fornecedor.

    Se existir qualquer pendente já vinculado a fornecedor, filtra por `fornecedor_id`
    (pedido direto com vários fornecedores na mesma missão).

    Se todos os pendentes estiverem sem fornecedor (fluxo legado), retorna todos os pendentes.
    """
    stmt = (
        select(SolicitacaoDiaItem)
        .where(
            SolicitacaoDiaItem.solicitacao_id == solicitacao_id,
            SolicitacaoDiaItem.comprado.is_(False),
        )
        .options(selectinload(SolicitacaoDiaItem.produto))
        .order_by(SolicitacaoDiaItem.id.asc())
    )
    res = await db.execute(stmt)
    all_pending = list(res.scalars().all())
    if not all_pending:
        return []
    if any(i.fornecedor_id is not None for i in all_pending):
        return [i for i in all_pending if i.fornecedor_id == fornecedor_id]
    return all_pending


async def enviar_pedido_fornecedor_por_email_com_itens_carregados(
    *,
    db: AsyncSession,
    solicitacao: SolicitacaoDia,
    fornecedor: Fornecedor,
    itens: Sequence[SolicitacaoDiaItem],
    observacao: str | None,
    current_user: User,
) -> dict:
    if not itens:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não há itens para envio ao fornecedor.",
        )
    fornecedor_email = (fornecedor.email or "").strip()
    if not fornecedor_email:
        raise HTTPException(
            status_code=400,
            detail="Fornecedor sem e-mail cadastrado. Atualize o cadastro antes do envio.",
        )

    smtp_cfg = await db.get(SidiNotificacaoSmtpConfig, 1)
    if not smtp_cfg or not smtp_cfg.ativo:
        raise HTTPException(
            status_code=400,
            detail="SMTP não configurado/ativo. Configure no painel de administração.",
        )

    assunto = (
        f"[ERP Sabor da Terra] Pedido de compra - {fornecedor.fantasia} - {solicitacao.data}"
    )
    corpo = renderizar_template_pedido_fornecedor(
        solicitacao=solicitacao,
        fornecedor=fornecedor,
        itens=itens,
        solicitante=current_user,
        observacao=observacao,
    )

    try:
        enviar_email_contingencia_sidi(
            smtp_host=smtp_cfg.host,
            smtp_port=smtp_cfg.port,
            smtp_username=smtp_cfg.username,
            smtp_password=smtp_cfg.password,
            smtp_use_tls=smtp_cfg.use_tls,
            remetente=smtp_cfg.remetente_email,
            destinatarios=[fornecedor_email],
            assunto=assunto,
            corpo=corpo,
        )
    except (smtplib.SMTPException, OSError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Falha ao conectar/enviar e-mail no servidor SMTP configurado. "
                "Verifique host, porta, TLS/SSL e credenciais no painel SMTP."
            ),
        ) from exc

    return {
        "solicitacao_id": solicitacao.id,
        "fornecedor_id": fornecedor.id,
        "fornecedor_nome": fornecedor.fantasia,
        "fornecedor_email": fornecedor_email,
        "total_itens": len(itens),
        "enviado_por": current_user.username,
        "mensagem": "Pedido enviado por e-mail ao fornecedor com sucesso.",
    }


async def enviar_pedido_fornecedor_por_email(
    *,
    db: AsyncSession,
    solicitacao_id,
    fornecedor_id: int,
    observacao: str | None,
    current_user: User,
) -> dict:
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
            detail="Não há itens pendentes para envio ao fornecedor.",
        )

    return await enviar_pedido_fornecedor_por_email_com_itens_carregados(
        db=db,
        solicitacao=solicitacao,
        fornecedor=fornecedor,
        itens=itens,
        observacao=observacao,
        current_user=current_user,
    )
