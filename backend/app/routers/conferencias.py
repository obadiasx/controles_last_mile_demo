from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_local_db_session
from backend.app.core.security import get_current_user_id
from backend.app.models.users import User
from backend.app.repositories.conferencia import ConferenciaCRUD
from backend.app.routers.deps import (
    require_sync_and_update,
    require_list_conference_items,
    require_view_conference_details,
    require_list_divergences,
    require_finance_decision,
    require_list_all_users,
)
from backend.app.domain.conferencia_fase import FaseConferenciaPedido
from backend.app.schemas.conferencia import (
    ConferenciaItem,
    ConferenciaPedidoResumo,
    ConferenciaFinanceiroAcaoLinha,
    ConferenciaFinanceiroFilaItem,
    ConferenciaFinanceiroLiberacaoGlobalRequest,
    ConferenciaFinanceiroLiberacaoGlobalResponse,
    ConferenciaFinanceiroPedidoResumo,
    ConferenciaItemCreate,
    ConferenciaItemUpdate,
    SincronizacaoRequest,
    SincronizacaoResposta,
    Divergencia,
    SidiNotificacaoSmtpConfigBase,
    SidiNotificacaoSmtpConfigOut,
    SidiNotificacaoDestinatarioCreate,
    SidiNotificacaoDestinatarioOut,
    SidiNotificacaoPendenteOut,
    SidiNotificacaoDestinatarioUpdate,
    SidiNotificacaoResultado,
    SidiEnvioManualRegistroCreate,
    SidiEnvioManualRegistroOut,
)

router = APIRouter()

db_local_dependency = Depends(get_local_db_session)
auth_dependency = Depends(get_current_user_id)


def _agregado_padrao() -> dict:
    return {
        "fase_conferencia": FaseConferenciaPedido.AGUARDANDO_RECEBIMENTO,
        "pedido_concluido": False,
        "tem_pendencia_financeira": False,
        "quantidade_itens_pendentes_conferencia": 0,
        "quantidade_itens_pendencia_financeira": 0,
    }


async def _conferencia_item_resposta(
    db,
    row,
    agregados: dict[int, dict] | None = None,
) -> ConferenciaItem:
    pid = int(row.pedido_id)
    if agregados is None:
        agregados = await ConferenciaCRUD.agregados_por_pedidos(db, [pid])
    a = agregados.get(pid, _agregado_padrao())
    base = ConferenciaItem.model_validate(row)
    return base.model_copy(
        update={
            "origem_compra": ConferenciaCRUD.origem_compra_do_item(row),
            "pedido_concluido": a["pedido_concluido"],
            "fase_conferencia": a["fase_conferencia"],
            "tem_pendencia_financeira": a["tem_pendencia_financeira"],
            "quantidade_itens_pendentes_conferencia": a[
                "quantidade_itens_pendentes_conferencia"
            ],
            "quantidade_itens_pendencia_financeira": a[
                "quantidade_itens_pendencia_financeira"
            ],
        }
    )


@router.post(
    "/sincronizar",
    response_model=SincronizacaoResposta,
    summary="Atualiza a fila de conferência a partir dos pedidos do app.",
)
async def sincronizar_pedidos(
    body_params: SincronizacaoRequest,
    _current_user_id: str = auth_dependency,
    db_local: AsyncSession = db_local_dependency,
):
    """
    Sincroniza a tabela local `conferencia_itens` com base nos pedidos de compra
    consolidados no banco do app.
    """
    try:
        dias = body_params.dias_retroativos
        detalhes = await ConferenciaCRUD.sync_from_origem(
            db_local,
            dias,
        )
        mensagem_resumo = detalhes.pop("mensagem_resumo", "")
        return SincronizacaoResposta(
            message="Sincronização concluída.",
            mensagem_resumo=mensagem_resumo,
            detalhes=detalhes,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro durante a sincronização: {str(e)}",
        ) from e


@router.get(
    "/pedidos",
    response_model=List[ConferenciaItem],
    summary="Listagem de itens para conferência (fila padrão: linhas ainda em aberto).",
)
async def list_pedidos_conferencia(
    _current_user: User = Depends(require_list_conference_items),
    db: AsyncSession = db_local_dependency,
    skip: int = 0,
    limit: int = 500,
    status_filtro: Optional[str] = None,
    fornecedor_filtro: Optional[str] = None,
    produto_filtro: Optional[str] = None,
    incluir_cancelados: bool = Query(
        False,
        description="Se true, inclui itens marcados como cancelados (ausentes na última sincronização).",
    ),
):
    items = await ConferenciaCRUD.get_items(
        db,
        skip=skip,
        limit=limit,
        status=status_filtro,
        fornecedor=fornecedor_filtro,
        produto=produto_filtro,
        incluir_cancelados=incluir_cancelados,
    )
    pids = list({int(it.pedido_id) for it in items})
    agregados = await ConferenciaCRUD.agregados_por_pedidos(db, pids)

    resposta: list[ConferenciaItem] = []
    for it in items:
        resposta.append(await _conferencia_item_resposta(db, it, agregados))
    return resposta


@router.get(
    "/financeiro/pedidos",
    response_model=List[ConferenciaFinanceiroFilaItem],
    summary="Fila do financeiro (pedidos aguardando decisão financeira).",
)
async def list_fila_financeira(
    _current_user: User = Depends(require_finance_decision),
    db: AsyncSession = db_local_dependency,
    skip: int = 0,
    limit: int = 100,
    fornecedor_filtro: Optional[str] = None,
):
    return await ConferenciaCRUD.listar_fila_financeira(
        db, skip=skip, limit=limit, fornecedor=fornecedor_filtro
    )


@router.get(
    "/financeiro/pedidos/{pedido_id}",
    response_model=ConferenciaFinanceiroPedidoResumo,
    summary="Detalhe financeiro do pedido com prévia de inclusões/exclusões SIDI.",
)
async def get_pedido_financeiro(
    pedido_id: int,
    _current_user: User = Depends(require_finance_decision),
    db: AsyncSession = db_local_dependency,
):
    resumo = await ConferenciaCRUD.resumo_financeiro_pedido(db, pedido_id)
    if not resumo:
        raise HTTPException(status_code=404, detail="Pedido de conferência não encontrado.")
    agregado = resumo.get("agregado", _agregado_padrao())
    itens = resumo["itens"]
    itens_saida = [await _conferencia_item_resposta(db, it) for it in itens]
    return ConferenciaFinanceiroPedidoResumo(
        pedido_id=pedido_id,
        fase_conferencia=agregado.get("fase_conferencia", FaseConferenciaPedido.AGUARDANDO_RECEBIMENTO),
        pedido_concluido=agregado.get("pedido_concluido", False),
        tem_pendencia_financeira=agregado.get("tem_pendencia_financeira", False),
        quantidade_itens_pendentes_conferencia=agregado.get(
            "quantidade_itens_pendentes_conferencia", 0
        ),
        quantidade_itens_pendencia_financeira=agregado.get(
            "quantidade_itens_pendencia_financeira", 0
        ),
        itens=itens_saida,
        itens_incluidos_sidi=resumo["itens_incluidos"],
        itens_excluidos_sidi=resumo["itens_excluidos"],
        total_itens_incluidos_sidi=resumo["total_incluidos"],
        total_itens_excluidos_sidi=resumo["total_excluidos"],
    )


@router.patch(
    "/financeiro/pedidos/{pedido_id}/{item}/acao",
    response_model=ConferenciaItem,
    summary="Ação financeira por linha (liberar SIDI, manter fora ou manter pendência).",
)
async def acao_financeira_linha(
    pedido_id: int,
    item: int,
    body: ConferenciaFinanceiroAcaoLinha,
    _current_user: User = Depends(require_finance_decision),
    db: AsyncSession = db_local_dependency,
):
    try:
        updated = await ConferenciaCRUD.aplicar_acao_financeira_linha(
            db, pedido_id, item, body.acao, body.observacoes
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    if not updated:
        raise HTTPException(status_code=404, detail="Item de Conferência não encontrado.")
    return await _conferencia_item_resposta(db, updated)


@router.post(
    "/financeiro/pedidos/{pedido_id}/liberacao-global",
    response_model=ConferenciaFinanceiroLiberacaoGlobalResponse,
    summary="Prévia e confirmação da liberação global do pedido para integração SIDI.",
)
async def liberacao_global_financeiro(
    pedido_id: int,
    body: ConferenciaFinanceiroLiberacaoGlobalRequest,
    _current_user: User = Depends(require_finance_decision),
    db: AsyncSession = db_local_dependency,
):
    preview = await ConferenciaCRUD.preview_liberacao_global_sidi(db, pedido_id)
    if not preview:
        raise HTTPException(status_code=404, detail="Pedido de conferência não encontrado.")

    if body.confirmar and not body.ciente_exclusoes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="É obrigatório confirmar ciência das exclusões antes da liberação global.",
        )

    mensagem = "Prévia da liberação global gerada."
    if body.confirmar:
        preview = await ConferenciaCRUD.aplicar_liberacao_global_sidi(db, pedido_id)
        mensagem = "Liberação global aplicada com sucesso."
        cfg_smtp = await ConferenciaCRUD.get_smtp_config(db)
        ja_enviado_auto = await ConferenciaCRUD.contingencia_auto_ja_enviou_email(
            db, pedido_id
        )
        if (
            cfg_smtp
            and cfg_smtp.modo_contingencia_email_automatico
            and ja_enviado_auto
        ):
            enviado = True
            msg_email = (
                "E-mail de contingência SIDI já havia sido enviado neste ciclo do pedido "
                "(modo contingência por e-mail ativo)."
            )
        else:
            enviado, msg_email = await ConferenciaCRUD.notificar_pedido_pronto_sidi(
                db, pedido_id
            )
        mensagem = (
            f"{mensagem} {msg_email}"
            if enviado
            else f"{mensagem} Aviso: {msg_email}"
        )

    return ConferenciaFinanceiroLiberacaoGlobalResponse(
        pedido_id=pedido_id,
        itens_incluidos_sidi=preview["itens_incluidos"],
        itens_excluidos_sidi=preview["itens_excluidos"],
        total_itens_incluidos_sidi=preview["total_incluidos"],
        total_itens_excluidos_sidi=preview["total_excluidos"],
        linhas_excluidas=preview["linhas_excluidas"],
        confirmacao_obrigatoria=True,
        mensagem=mensagem,
    )


@router.get(
    "/admin/notificacao-sidi/smtp",
    response_model=SidiNotificacaoSmtpConfigOut,
    summary="Consulta configuração SMTP da contingência SIDI.",
)
async def get_smtp_notificacao_sidi(
    _current_user: User = Depends(require_list_all_users),
    db: AsyncSession = db_local_dependency,
):
    cfg = await ConferenciaCRUD.get_smtp_config(db)
    if not cfg:
        raise HTTPException(status_code=404, detail="SMTP de contingência ainda não configurado.")
    return cfg


@router.put(
    "/admin/notificacao-sidi/smtp",
    response_model=SidiNotificacaoSmtpConfigOut,
    summary="Cria/atualiza configuração SMTP da contingência SIDI.",
)
async def upsert_smtp_notificacao_sidi(
    body: SidiNotificacaoSmtpConfigBase,
    _current_user: User = Depends(require_list_all_users),
    db: AsyncSession = db_local_dependency,
):
    return await ConferenciaCRUD.upsert_smtp_config(db, body.model_dump())


@router.get(
    "/admin/notificacao-sidi/destinatarios",
    response_model=List[SidiNotificacaoDestinatarioOut],
    summary="Lista destinatários da contingência SIDI.",
)
async def list_destinatarios_notificacao_sidi(
    _current_user: User = Depends(require_list_all_users),
    db: AsyncSession = db_local_dependency,
):
    return await ConferenciaCRUD.list_destinatarios_sidi(db)


@router.post(
    "/admin/notificacao-sidi/destinatarios",
    response_model=SidiNotificacaoDestinatarioOut,
    summary="Adiciona destinatário da contingência SIDI.",
)
async def create_destinatario_notificacao_sidi(
    body: SidiNotificacaoDestinatarioCreate,
    _current_user: User = Depends(require_list_all_users),
    db: AsyncSession = db_local_dependency,
):
    return await ConferenciaCRUD.create_destinatario_sidi(db, body.model_dump())


@router.patch(
    "/admin/notificacao-sidi/destinatarios/{destinatario_id}",
    response_model=SidiNotificacaoDestinatarioOut,
    summary="Atualiza destinatário da contingência SIDI.",
)
async def patch_destinatario_notificacao_sidi(
    destinatario_id: int,
    body: SidiNotificacaoDestinatarioUpdate,
    _current_user: User = Depends(require_list_all_users),
    db: AsyncSession = db_local_dependency,
):
    updated = await ConferenciaCRUD.update_destinatario_sidi(
        db, destinatario_id, body.model_dump(exclude_unset=True)
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Destinatário não encontrado.")
    return updated


@router.post(
    "/financeiro/notificacoes-pendentes/{pedido_id}/reenviar",
    response_model=SidiNotificacaoResultado,
    summary="Reenvia e-mail de contingência para um pedido pendente.",
)
async def reenviar_notificacao_pendente_sidi(
    pedido_id: int,
    _current_user: User = Depends(require_finance_decision),
    db: AsyncSession = db_local_dependency,
):
    enviado, mensagem = await ConferenciaCRUD.notificar_pedido_pronto_sidi(db, pedido_id)
    return SidiNotificacaoResultado(
        pedido_id=pedido_id,
        enviado=enviado,
        mensagem=mensagem,
    )


@router.get(
    "/financeiro/notificacoes-pendentes",
    response_model=List[SidiNotificacaoPendenteOut],
    summary="Lista pendências de envio de e-mail de contingência SIDI.",
)
async def list_notificacoes_pendentes_sidi(
    _current_user: User = Depends(require_finance_decision),
    db: AsyncSession = db_local_dependency,
):
    return await ConferenciaCRUD.listar_pendencias_notificacao_sidi(db)


@router.post(
    "/financeiro/pedidos/{pedido_id}/notificar-sidi",
    response_model=SidiNotificacaoResultado,
    summary="Dispara e-mail de contingência para pedido elegível ao SIDI.",
)
async def post_notificar_pedido_sidi(
    pedido_id: int,
    _current_user: User = Depends(require_finance_decision),
    db: AsyncSession = db_local_dependency,
):
    enviado, mensagem = await ConferenciaCRUD.notificar_pedido_pronto_sidi(db, pedido_id)
    return SidiNotificacaoResultado(
        pedido_id=pedido_id,
        enviado=enviado,
        mensagem=mensagem,
    )


@router.get(
    "/financeiro/pedidos/{pedido_id}/registro-envio-manual",
    response_model=List[SidiEnvioManualRegistroOut],
    summary="Lista histórico de registro manual de envio ao SIDI.",
)
async def list_registro_envio_manual_sidi(
    pedido_id: int,
    _current_user: User = Depends(require_finance_decision),
    db: AsyncSession = db_local_dependency,
):
    return await ConferenciaCRUD.listar_registros_envio_manual_sidi(db, pedido_id)


@router.post(
    "/financeiro/pedidos/{pedido_id}/registro-envio-manual",
    response_model=SidiEnvioManualRegistroOut,
    summary="Registra manualmente envio do pedido ao SIDI (contingência).",
)
async def post_registro_envio_manual_sidi(
    pedido_id: int,
    body: SidiEnvioManualRegistroCreate,
    current_user: User = Depends(require_finance_decision),
    db: AsyncSession = db_local_dependency,
):
    try:
        return await ConferenciaCRUD.registrar_envio_manual_sidi(
            db,
            pedido_id,
            enviado_por=(current_user.name_full or current_user.username),
            protocolo=body.protocolo,
            observacao=body.observacao,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.get(
    "/pedidos/{pedido_id}",
    response_model=ConferenciaPedidoResumo,
    summary="Resumo do pedido de conferência com fase, indicadores e itens.",
)
async def get_pedido_resumo(
    pedido_id: int,
    _current_user: User = Depends(require_view_conference_details),
    db: AsyncSession = Depends(get_local_db_session),
    incluir_cancelados: bool = Query(
        True,
        description="Se false, remove itens cancelados da lista retornada.",
    ),
):
    itens = await ConferenciaCRUD.get_itens_por_pedido(
        db, pedido_id, incluir_cancelados=incluir_cancelados
    )
    if not itens:
        raise HTTPException(status_code=404, detail="Pedido de conferência não encontrado.")

    agregados = await ConferenciaCRUD.agregados_por_pedidos(db, [pedido_id])
    agregado = agregados.get(pedido_id, _agregado_padrao())
    itens_saida = [
        await _conferencia_item_resposta(db, it, agregados) for it in itens
    ]

    return ConferenciaPedidoResumo(
        pedido_id=pedido_id,
        fase_conferencia=agregado["fase_conferencia"],
        pedido_concluido=agregado["pedido_concluido"],
        tem_pendencia_financeira=agregado["tem_pendencia_financeira"],
        quantidade_itens_pendentes_conferencia=agregado[
            "quantidade_itens_pendentes_conferencia"
        ],
        quantidade_itens_pendencia_financeira=agregado[
            "quantidade_itens_pendencia_financeira"
        ],
        itens=itens_saida,
    )


@router.get(
    "/pedidos/{pedido_id}/{item}",
    response_model=ConferenciaItem,
    summary="Detalhe de um item de conferência (NUMPED + ITEM).",
)
async def get_pedido_details(
    pedido_id: int,
    item: int,
    _current_user: User = Depends(require_view_conference_details),
    db: AsyncSession = Depends(get_local_db_session),
):
    row = await ConferenciaCRUD.get_item(db, pedido_id, item)
    if not row:
        raise HTTPException(
            status_code=404, detail="Item de Conferência não encontrado."
        )
    return await _conferencia_item_resposta(db, row)


@router.post(
    "/pedidos",
    response_model=ConferenciaItem,
    status_code=status.HTTP_201_CREATED,
    summary="Cria novo item de conferência (simulação / carga manual).",
)
async def create_new_pedido(
    item_data: ConferenciaItemCreate,
    _current_user_id: str = auth_dependency,
    db: AsyncSession = db_local_dependency,
):
    created = await ConferenciaCRUD.create_item(db, item_data)
    return await _conferencia_item_resposta(db, created)


@router.patch(
    "/pedidos/{pedido_id}/{item}",
    response_model=ConferenciaItem,
    summary="Atualiza quantidade física, divergência e status da conferência.",
)
async def update_conferencia_item(
    pedido_id: int,
    item: int,
    item_update: ConferenciaItemUpdate,
    _current_user: User = Depends(require_sync_and_update),
    db: AsyncSession = Depends(get_local_db_session),
):
    try:
        updated = await ConferenciaCRUD.update_item(db, pedido_id, item, item_update)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    if not updated:
        raise HTTPException(
            status_code=404, detail="Item de Conferência não encontrado."
        )
    return await _conferencia_item_resposta(db, updated)


@router.get(
    "/divergencias",
    response_model=List[Divergencia],
    summary="Lista opções de divergência (ID e descrição).",
)
async def list_divergencias(
    _current_user: User = Depends(require_list_divergences),
    db: AsyncSession = db_local_dependency,
):
    return await ConferenciaCRUD.get_divergencias(db)
