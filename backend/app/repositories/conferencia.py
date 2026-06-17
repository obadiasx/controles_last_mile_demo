import logging
import smtplib
import uuid
from datetime import datetime, timedelta
from typing import Any, Optional, Sequence

from sqlalchemy import and_, update as sql_update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.app.domain.conferencia_fase import (
    STATUS_EXCLUIDOS_FILA_PADRAO,
    FaseConferenciaPedido,
    StatusItemConferencia,
    calcular_fase_pedido,
    indicadores_pedido,
    normalizar_status_item,
    pedido_encerrado_operacionalmente,
    recalcular_pedido_apos_mudanca_item,
)
from backend.app.domain.conferencia_financeiro import (
    montar_preview_sidi,
    montar_preview_sidi_liberacao_global,
    status_destino_por_acao_financeira,
)
from backend.app.models.conferencia import ConferenciaItem, ConferenciaPedido
from backend.app.models.notificacao_sidi import (
    SidiEnvioManualRegistro,
    SidiNotificacaoDestinatario,
    SidiNotificacaoPendente,
    SidiNotificacaoSmtpConfig,
)
from backend.app.models.divergencias import Divergencia
from backend.app.models.produtos import Produto
from backend.app.models.users import User
from backend.app.models.integracao_sidi import (
    IntegracaoSidiPedido,
    IntegracaoSidiPedidoItem,
    IntegracaoSidiPedidoStatus,
)
from backend.app.schemas.conferencia import ConferenciaItemCreate, ConferenciaItemUpdate
from backend.app.services.conferencia_notificacao_sidi import (
    deve_disparar_email_contingencia,
    enviar_email_contingencia_sidi,
    renderizar_template_notificacao_sidi,
)
from backend.app.services.conferencia_registro_manual import (
    validar_registro_manual_existente,
)

logger = logging.getLogger(__name__)
COMPRADOR_TECNICO_PEDIDO_DIRETO = "solicitacao_direta"
STATUS_PERMITIDOS_CONFERENTE = {
    StatusItemConferencia.PENDENTE_CONFERENCIA.value,
    StatusItemConferencia.RECEBIDO_CONFORME.value,
    StatusItemConferencia.PARCIAL.value,
    StatusItemConferencia.NAO_RECEBIDO.value,
    StatusItemConferencia.REJEITADO_CONFERENCIA.value,
    StatusItemConferencia.RECEBIDO_COM_DIVERGENCIA.value,
    StatusItemConferencia.PENDENTE_DECISAO_FINANCEIRO.value,
}


class ConferenciaCRUD:
    SMTP_CONFIG_SINGLETON_ID = 1
    MAX_JS_SAFE_INTEGER = 9_007_199_254_740_991
    CONFERENCE_KEY_MOD = 9_000_000_000_000_000
    @staticmethod
    def origem_compra_do_item(item: ConferenciaItem) -> str:
        valor = (item.origem_compra or "").strip().lower()
        if valor in ("comprador", "financeiro"):
            return valor
        return "financeiro"

    @staticmethod
    async def pedido_esta_concluido(db: AsyncSession, pedido_id: int) -> bool:
        """Pedido pronto para integração ou já integrado (equivalente ao antigo 'todos Concluído')."""
        result = await db.execute(
            select(ConferenciaItem).where(ConferenciaItem.pedido_id == pedido_id)
        )
        rows = result.scalars().all()
        if not rows:
            return False
        pares = [(r.status_conferencia, bool(r.cancelado)) for r in rows]
        fase = calcular_fase_pedido(pares)
        return pedido_encerrado_operacionalmente(fase)

    @staticmethod
    async def reconciliar_fase_pedido(
        db: AsyncSession, pedido_id: int
    ) -> FaseConferenciaPedido:
        fase = await ConferenciaCRUD._reconciliar_fase_pedido_sem_commit(db, pedido_id)
        await db.commit()
        return fase

    @staticmethod
    async def _reconciliar_fase_pedido_sem_commit(
        db: AsyncSession, pedido_id: int
    ) -> FaseConferenciaPedido:
        """Atualiza fase no mesmo transaction (ex.: antes do commit da sync)."""
        result = await db.execute(
            select(ConferenciaItem).where(ConferenciaItem.pedido_id == pedido_id)
        )
        itens = result.scalars().all()
        pares = [(it.status_conferencia, bool(it.cancelado)) for it in itens]
        fase = calcular_fase_pedido(pares)
        existing = await db.scalar(
            select(ConferenciaPedido).where(ConferenciaPedido.pedido_id == pedido_id)
        )
        if existing:
            existing.fase_conferencia = fase.value
            if fase != FaseConferenciaPedido.PRONTO_PARA_INTEGRACAO:
                existing.sidi_contingencia_email_auto_enviado_em = None
        else:
            db.add(
                ConferenciaPedido(
                    pedido_id=pedido_id,
                    fase_conferencia=fase.value,
                )
            )
        return fase

    @staticmethod
    def _pedido_uuid_para_chave_conferencia(pedido_uuid: uuid.UUID) -> int:
        # Chave negativa técnica para pedidos vindos de UUID, mantendo faixa segura para JS.
        # Se exceder Number.MAX_SAFE_INTEGER, o frontend pode arredondar e quebrar PATCH/GET por ID.
        base = int(pedido_uuid.hex[:15], 16) % ConferenciaCRUD.CONFERENCE_KEY_MOD
        if base >= ConferenciaCRUD.MAX_JS_SAFE_INTEGER:
            base = base % (ConferenciaCRUD.MAX_JS_SAFE_INTEGER - 1)
        return -(base or 1)

    @staticmethod
    async def get_items(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        fornecedor: Optional[str] = None,
        produto: Optional[str] = None,
        incluir_cancelados: bool = False,
    ) -> Sequence[ConferenciaItem]:
        query = select(ConferenciaItem).order_by(ConferenciaItem.data_criacao.desc())

        if not incluir_cancelados:
            query = query.where(ConferenciaItem.cancelado.is_(False))

        if status:
            norm = normalizar_status_item(status)
            query = query.where(ConferenciaItem.status_conferencia == norm)
        else:
            query = query.where(
                ~ConferenciaItem.status_conferencia.in_(list(STATUS_EXCLUIDOS_FILA_PADRAO))
            )

        if fornecedor:
            query = query.filter(ConferenciaItem.fornecedor.ilike(f"%{fornecedor}%"))
        if produto:
            query = query.filter(ConferenciaItem.produto.ilike(f"%{produto}%"))

        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def get_item_by_pedido_item(
        db: AsyncSession, pedido_id: int, item_num: int
    ) -> Optional[ConferenciaItem]:
        result = await db.execute(
            select(ConferenciaItem).filter(
                and_(
                    ConferenciaItem.pedido_id == pedido_id,
                    ConferenciaItem.item == item_num,
                )
            )
        )
        return result.scalars().first()

    @staticmethod
    async def _sync_from_app(
        db_local: AsyncSession, data_limite_dt: datetime, data_limite_date
    ) -> dict:
        status_aberto_comprador = (
            StatusItemConferencia.PENDENTE_CONFERENCIA.value,
            StatusItemConferencia.RECEBIDO_COM_DIVERGENCIA.value,
            "Pendente",
            "Divergente",
        )
        cancel_stmt = (
            sql_update(ConferenciaItem)
            .where(
                and_(
                    ConferenciaItem.origem_compra.in_(("comprador", "financeiro")),
                    ConferenciaItem.status_conferencia.in_(status_aberto_comprador),
                    ConferenciaItem.data_criacao >= data_limite_dt,
                )
            )
            .values(cancelado=True)
        )
        pre_cancelados = (await db_local.execute(cancel_stmt)).rowcount

        pedidos_tocados: set[int] = set()

        ped_stmt = (
            select(IntegracaoSidiPedido)
            .where(
                IntegracaoSidiPedido.data_compra >= data_limite_date,
                IntegracaoSidiPedido.status.in_(
                    [
                        IntegracaoSidiPedidoStatus.PENDENTE,
                        IntegracaoSidiPedidoStatus.ERRO,
                        IntegracaoSidiPedidoStatus.EM_PROCESSAMENTO,
                    ]
                ),
            )
            .order_by(IntegracaoSidiPedido.created_at.desc())
        )
        pedidos = (await db_local.execute(ped_stmt)).scalars().all()

        comprador_ids = list({p.comprador_id for p in pedidos if p.comprador_id})
        origem_por_comprador: dict[uuid.UUID, str] = {}
        if comprador_ids:
            users_stmt = select(User).where(User.id.in_(comprador_ids))
            users = (await db_local.execute(users_stmt)).scalars().all()
            for user in users:
                username = (getattr(user, "username", "") or "").strip().lower()
                origem_por_comprador[user.id] = (
                    "financeiro"
                    if username == COMPRADOR_TECNICO_PEDIDO_DIRETO
                    else "comprador"
                )

        importados = 0
        atualizados = 0
        reativados = 0
        total_origem = 0

        for pedido in pedidos:
            pedido_chave = ConferenciaCRUD._pedido_uuid_para_chave_conferencia(pedido.id)
            pedidos_tocados.add(pedido_chave)
            origem_compra = origem_por_comprador.get(pedido.comprador_id, "comprador")
            itens_stmt = (
                select(IntegracaoSidiPedidoItem)
                .where(IntegracaoSidiPedidoItem.pedido_id == pedido.id)
                .order_by(IntegracaoSidiPedidoItem.item_seq.asc())
            )
            itens = (await db_local.execute(itens_stmt)).scalars().all()
            total_origem += len(itens)

            produto_ids = [it.produto_id for it in itens]
            descricoes_por_codigo: dict[int, str] = {}
            if produto_ids:
                pr_stmt = select(Produto).where(Produto.codigo.in_(produto_ids))
                for p in (await db_local.execute(pr_stmt)).scalars().all():
                    d = (p.descricao or "").strip()
                    if d:
                        descricoes_por_codigo[p.codigo] = d

            def rotulo_produto(codigo: int) -> str:
                return descricoes_por_codigo.get(codigo) or f"Produto {codigo}"

            for it in itens:
                existing = await ConferenciaCRUD.get_item_by_pedido_item(
                    db_local, pedido_chave, int(it.item_seq)
                )
                data_cri = (
                    datetime.combine(it.dtmovim, datetime.min.time())
                    if it.dtmovim
                    else datetime.now()
                )

                if existing:
                    if existing.status_conferencia in (
                        StatusItemConferencia.FINALIZADO_PARA_INTEGRACAO.value,
                        "Concluido",
                    ):
                        if existing.cancelado:
                            await db_local.execute(
                                sql_update(ConferenciaItem)
                                .where(
                                    and_(
                                        ConferenciaItem.pedido_id == pedido_chave,
                                        ConferenciaItem.item == int(it.item_seq),
                                    )
                                )
                                .values(cancelado=False)
                            )
                            reativados += 1
                        continue

                    await db_local.execute(
                        sql_update(ConferenciaItem)
                        .where(
                            and_(
                                ConferenciaItem.pedido_id == pedido_chave,
                                ConferenciaItem.item == int(it.item_seq),
                            )
                        )
                        .values(
                            fornecedor=(pedido.fornecedor_fantasia or "N/A"),
                            produto=rotulo_produto(int(it.produto_id)),
                            quantidade_esperada=float(it.qtde or 0),
                            peso=float(it.peso or 0),
                            peso_total=float(it.totkg or 0),
                            unidade=it.un,
                            data_criacao=data_cri,
                            cancelado=False,
                            origem_compra=origem_compra,
                        )
                    )
                    atualizados += 1
                    if existing.cancelado:
                        reativados += 1
                    continue

                db_local.add(
                    ConferenciaItem(
                        pedido_id=pedido_chave,
                        item=int(it.item_seq),
                        fornecedor=(pedido.fornecedor_fantasia or "N/A"),
                        produto=rotulo_produto(int(it.produto_id)),
                        quantidade_esperada=float(it.qtde or 0),
                        peso=float(it.peso or 0),
                        peso_total=float(it.totkg or 0),
                        unidade=it.un,
                        quantidade_fisica=0.0,
                        observacoes=None,
                        status_conferencia=StatusItemConferencia.PENDENTE_CONFERENCIA.value,
                        cancelado=False,
                        origem_compra=origem_compra,
                        data_criacao=data_cri,
                    )
                )
                importados += 1

        for pid in pedidos_tocados:
            await ConferenciaCRUD._reconciliar_fase_pedido_sem_commit(db_local, pid)

        return {
            "total_encontrado_origem_app": total_origem,
            "total_importado_app": importados,
            "total_atualizados_app": atualizados,
            "total_pre_cancelados_app": pre_cancelados,
            "total_reativados_app": reativados,
        }

    @staticmethod
    async def sync_from_origem(
        db_local: AsyncSession,
        dias_retroativos: int,
    ) -> dict:
        data_limite = datetime.now().date() - timedelta(days=dias_retroativos)
        data_limite_dt = datetime.combine(data_limite, datetime.min.time())

        app_stats = await ConferenciaCRUD._sync_from_app(
            db_local, data_limite_dt, data_limite
        )

        await db_local.commit()

        detalhes = {
            **app_stats,
            "data_inicio_busca": data_limite.isoformat(),
            "modo_sincronizacao": "app_somente",
        }
        detalhes["mensagem_resumo"] = (
            f"Origem app: {app_stats['total_encontrado_origem_app']} itens "
            f"(novos: {app_stats['total_importado_app']}, atualizados: {app_stats['total_atualizados_app']})."
        )
        return detalhes

    @staticmethod
    async def get_item(
        db: AsyncSession, pedido_id: int, item: int
    ) -> Optional[ConferenciaItem]:
        result = await db.execute(
            select(ConferenciaItem).where(
                and_(
                    ConferenciaItem.pedido_id == pedido_id,
                    ConferenciaItem.item == item,
                )
            )
        )
        return result.scalars().first()

    @staticmethod
    async def create_item(db: AsyncSession, item_data: ConferenciaItemCreate) -> ConferenciaItem:
        db_item = ConferenciaItem(**item_data.model_dump(mode="json"))
        db.add(db_item)
        await db.flush()
        await ConferenciaCRUD._reconciliar_fase_pedido_sem_commit(db, int(db_item.pedido_id))
        await db.commit()
        await db.refresh(db_item)
        await ConferenciaCRUD.tentar_disparo_email_contingencia_automatico(
            db, int(db_item.pedido_id)
        )
        return db_item

    @staticmethod
    async def update_item(
        db: AsyncSession,
        pedido_id: int,
        item: int,
        item_update: ConferenciaItemUpdate,
        permitir_status_financeiro: bool = False,
    ) -> Optional[ConferenciaItem]:
        existing = await ConferenciaCRUD.get_item(db, pedido_id, item)
        if not existing:
            return None

        update_data = item_update.model_dump(exclude_unset=True)
        # Garantir persistência de observações quando o campo veio no JSON (evita
        # edge cases de exclude_unset com PATCH).
        _campos_enviados = getattr(item_update, "model_fields_set", None) or set()
        if "observacoes" in _campos_enviados:
            update_data["observacoes"] = item_update.observacoes
        if not update_data:
            return existing

        if ("quantidade_esperada" in update_data or "unidade" in update_data) and (
            ConferenciaCRUD.origem_compra_do_item(existing) != "financeiro"
        ):
            raise ValueError(
                "Alteração de quantidade esperada ou unidade só é permitida para "
                "compra direta pelo financeiro (origem financeiro)."
            )

        if (
            not permitir_status_financeiro
            and "status_conferencia" in update_data
            and update_data["status_conferencia"] not in STATUS_PERMITIDOS_CONFERENTE
        ):
            raise ValueError(
                "Status inválido para conferência operacional. "
                "Use apenas: Pendente conferência, Recebido conforme, Parcial, "
                "Não recebido, Rejeitado na conferência, Recebido com divergência "
                "ou Pendente decisão financeiro."
            )

        if (
            not permitir_status_financeiro
            and "status_conferencia" in update_data
            and normalizar_status_item(update_data["status_conferencia"])
            in (
                StatusItemConferencia.FINALIZADO_PARA_INTEGRACAO.value,
                StatusItemConferencia.INTEGRADO_SIDI.value,
            )
        ):
            raise ValueError(
                "Status de integração é reservado ao fluxo financeiro (ação explícita)."
            )

        status_resultante = normalizar_status_item(
            str(update_data.get("status_conferencia", existing.status_conferencia))
        )
        observacao_resultante = str(
            update_data.get("observacoes", existing.observacoes or "")
        ).strip()
        if (
            status_resultante == StatusItemConferencia.REJEITADO_CONFERENCIA.value
            and not observacao_resultante
        ):
            raise ValueError(
                "Informe uma observação ao marcar o item como Rejeitado na conferência."
            )

        if "divergencia_id" in update_data and update_data["divergencia_id"] in (None, 0):
            update_data.pop("divergencia_id")

        stmt = (
            sql_update(ConferenciaItem)
            .where(
                and_(
                    ConferenciaItem.pedido_id == pedido_id,
                    ConferenciaItem.item == item,
                )
            )
            .values(**update_data)
            .returning(ConferenciaItem)
        )
        updated_item = await db.scalar(stmt)
        if updated_item:
            await ConferenciaCRUD._reconciliar_fase_pedido_sem_commit(db, pedido_id)
        await db.commit()
        await ConferenciaCRUD.tentar_disparo_email_contingencia_automatico(db, pedido_id)
        return updated_item

    @staticmethod
    async def agregados_por_pedidos(
        db: AsyncSession, pedido_ids: list[int]
    ) -> dict[int, dict[str, Any]]:
        """Fase, flags e contagens por pedido (para enriquecer a listagem de itens)."""
        if not pedido_ids:
            return {}
        result = await db.execute(
            select(ConferenciaItem).where(ConferenciaItem.pedido_id.in_(pedido_ids))
        )
        rows = result.scalars().all()
        by_pedido: dict[int, list[ConferenciaItem]] = {}
        for row in rows:
            by_pedido.setdefault(int(row.pedido_id), []).append(row)
        out: dict[int, dict[str, Any]] = {}
        for pid, itens in by_pedido.items():
            pares = [(i.status_conferencia, bool(i.cancelado)) for i in itens]
            out[pid] = recalcular_pedido_apos_mudanca_item(pares)
        return out

    @staticmethod
    async def get_itens_por_pedido(
        db: AsyncSession, pedido_id: int, incluir_cancelados: bool = True
    ) -> Sequence[ConferenciaItem]:
        query = (
            select(ConferenciaItem)
            .where(ConferenciaItem.pedido_id == pedido_id)
            .order_by(ConferenciaItem.item.asc())
        )
        if not incluir_cancelados:
            query = query.where(ConferenciaItem.cancelado.is_(False))
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def resumo_financeiro_pedido(
        db: AsyncSession, pedido_id: int
    ) -> dict[str, Any] | None:
        itens = await ConferenciaCRUD.get_itens_por_pedido(
            db, pedido_id, incluir_cancelados=True
        )
        if not itens:
            return None
        agregados = await ConferenciaCRUD.agregados_por_pedidos(db, [pedido_id])
        agregado = agregados.get(pedido_id, {})
        preview = montar_preview_sidi(
            [(int(it.item), it.status_conferencia, bool(it.cancelado)) for it in itens]
        )
        return {
            "itens": itens,
            "agregado": agregado,
            **preview,
        }

    @staticmethod
    async def listar_fila_financeira(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        fornecedor: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        query = select(ConferenciaItem)
        if fornecedor:
            query = query.filter(ConferenciaItem.fornecedor.ilike(f"%{fornecedor}%"))
        rows = (await db.execute(query)).scalars().all()
        by_pedido: dict[int, list[ConferenciaItem]] = {}
        for row in rows:
            by_pedido.setdefault(int(row.pedido_id), []).append(row)
        saida: list[dict[str, Any]] = []
        for pedido_id, itens in by_pedido.items():
            pares = [(it.status_conferencia, bool(it.cancelado)) for it in itens]
            agregado = recalcular_pedido_apos_mudanca_item(pares)
            if agregado["fase_conferencia"] != FaseConferenciaPedido.AGUARDANDO_DECISAO_FINANCEIRO:
                continue
            preview = montar_preview_sidi(
                [(int(it.item), it.status_conferencia, bool(it.cancelado)) for it in itens]
            )
            fornecedor_principal = next(
                ((it.fornecedor or "").strip() for it in itens if (it.fornecedor or "").strip()),
                None,
            )
            saida.append(
                {
                    "pedido_id": pedido_id,
                    "fase_conferencia": agregado["fase_conferencia"],
                    "fornecedor_principal": fornecedor_principal,
                    "total_itens": len([it for it in itens if not it.cancelado]),
                    "total_itens_elegiveis_sidi": preview["total_incluidos"],
                    "total_itens_excluidos_sidi": preview["total_excluidos"],
                }
            )
        saida.sort(key=lambda x: x["pedido_id"], reverse=True)
        return saida[skip : skip + limit]

    @staticmethod
    async def aplicar_acao_financeira_linha(
        db: AsyncSession,
        pedido_id: int,
        item: int,
        acao: str,
        observacoes: Optional[str],
    ) -> Optional[ConferenciaItem]:
        status_destino = status_destino_por_acao_financeira(acao)
        return await ConferenciaCRUD.update_item(
            db,
            pedido_id,
            item,
            ConferenciaItemUpdate(
                status_conferencia=status_destino,
                observacoes=observacoes,
            ),
            permitir_status_financeiro=True,
        )

    @staticmethod
    async def preview_liberacao_global_sidi(
        db: AsyncSession, pedido_id: int
    ) -> dict[str, Any] | None:
        itens = await ConferenciaCRUD.get_itens_por_pedido(
            db, pedido_id, incluir_cancelados=True
        )
        if not itens:
            return None
        preview = montar_preview_sidi_liberacao_global(
            [(int(it.item), it.status_conferencia, bool(it.cancelado)) for it in itens]
        )
        linhas_excluidas: list[dict[str, Any]] = []
        for it in itens:
            if int(it.item) not in preview["itens_excluidos"]:
                continue
            linhas_excluidas.append(
                {
                    "item": int(it.item),
                    "produto": it.produto,
                    "quantidade_esperada": float(it.quantidade_esperada),
                    "status_atual": normalizar_status_item(it.status_conferencia),
                    "motivo": "Linha fora dos estados elegíveis para este envio SIDI.",
                }
            )
        return {
            "pedido_id": pedido_id,
            "itens": itens,
            "linhas_excluidas": linhas_excluidas,
            **preview,
        }

    @staticmethod
    async def aplicar_liberacao_global_sidi(
        db: AsyncSession, pedido_id: int
    ) -> dict[str, Any] | None:
        preview = await ConferenciaCRUD.preview_liberacao_global_sidi(db, pedido_id)
        if not preview:
            return None
        itens = preview["itens"]
        for it in itens:
            if int(it.item) not in preview["itens_incluidos"]:
                continue
            status_norm = normalizar_status_item(it.status_conferencia)
            if status_norm == StatusItemConferencia.INTEGRADO_SIDI.value:
                continue
            it.status_conferencia = StatusItemConferencia.FINALIZADO_PARA_INTEGRACAO.value
        await ConferenciaCRUD._reconciliar_fase_pedido_sem_commit(db, pedido_id)
        await db.commit()
        return preview

    @staticmethod
    async def contingencia_auto_ja_enviou_email(
        db: AsyncSession, pedido_id: int
    ) -> bool:
        row = await db.get(ConferenciaPedido, pedido_id)
        return bool(row and row.sidi_contingencia_email_auto_enviado_em is not None)

    @staticmethod
    async def tentar_disparo_email_contingencia_automatico(
        db: AsyncSession,
        pedido_id: int,
        *,
        smtp_factory=None,
    ) -> None:
        """
        Com `modo_contingencia_email_automatico` ativo na configuração SMTP, ao pedido
        ficar em fase ProntoParaIntegracao após alteração de itens, aplica liberação
        global SIDI e envia o e-mail de contingência (uma vez até a fase mudar).
        """
        smtp_cfg = await ConferenciaCRUD.get_smtp_config(db)
        if not smtp_cfg or not smtp_cfg.modo_contingencia_email_automatico:
            return

        itens_chk = await ConferenciaCRUD.get_itens_por_pedido(
            db, pedido_id, incluir_cancelados=True
        )
        if not itens_chk:
            return
        pares_chk = [(i.status_conferencia, bool(i.cancelado)) for i in itens_chk]
        if calcular_fase_pedido(pares_chk) != FaseConferenciaPedido.PRONTO_PARA_INTEGRACAO:
            return

        ped_row = await db.get(ConferenciaPedido, pedido_id)
        if ped_row and ped_row.sidi_contingencia_email_auto_enviado_em is not None:
            return

        preview = await ConferenciaCRUD.aplicar_liberacao_global_sidi(db, pedido_id)
        if not preview:
            return
        enviado, _msg = await ConferenciaCRUD.notificar_pedido_pronto_sidi(
            db, pedido_id, smtp_factory=smtp_factory
        )

    @staticmethod
    async def get_divergencias(db: AsyncSession) -> Sequence[Divergencia]:
        query = select(Divergencia).order_by(Divergencia.descricao)
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def get_smtp_config(db: AsyncSession) -> Optional[SidiNotificacaoSmtpConfig]:
        return await db.get(SidiNotificacaoSmtpConfig, ConferenciaCRUD.SMTP_CONFIG_SINGLETON_ID)

    @staticmethod
    async def upsert_smtp_config(
        db: AsyncSession, payload: dict[str, Any]
    ) -> SidiNotificacaoSmtpConfig:
        current = await ConferenciaCRUD.get_smtp_config(db)
        if not current:
            current = SidiNotificacaoSmtpConfig(
                id=ConferenciaCRUD.SMTP_CONFIG_SINGLETON_ID, **payload
            )
            db.add(current)
        else:
            for k, v in payload.items():
                setattr(current, k, v)
        await db.commit()
        await db.refresh(current)
        return current

    @staticmethod
    async def list_destinatarios_sidi(
        db: AsyncSession,
    ) -> list[SidiNotificacaoDestinatario]:
        rows = await db.execute(
            select(SidiNotificacaoDestinatario).order_by(
                SidiNotificacaoDestinatario.nome.asc()
            )
        )
        return list(rows.scalars().all())

    @staticmethod
    async def create_destinatario_sidi(
        db: AsyncSession,
        payload: dict[str, Any],
    ) -> SidiNotificacaoDestinatario:
        row = SidiNotificacaoDestinatario(**payload)
        db.add(row)
        await db.commit()
        await db.refresh(row)
        return row

    @staticmethod
    async def update_destinatario_sidi(
        db: AsyncSession, destinatario_id: int, payload: dict[str, Any]
    ) -> Optional[SidiNotificacaoDestinatario]:
        row = await db.get(SidiNotificacaoDestinatario, destinatario_id)
        if not row:
            return None
        for k, v in payload.items():
            setattr(row, k, v)
        await db.commit()
        await db.refresh(row)
        return row

    @staticmethod
    async def _payload_notificacao_pedido(
        db: AsyncSession, pedido_id: int
    ) -> Optional[dict[str, Any]]:
        resumo = await ConferenciaCRUD.resumo_financeiro_pedido(db, pedido_id)
        if not resumo:
            return None
        agregado = resumo.get("agregado") or {}
        fase = agregado.get("fase_conferencia")
        total_incluidos = int(resumo.get("total_incluidos", 0))
        if isinstance(fase, FaseConferenciaPedido):
            fase_valor = fase.value
        else:
            fase_valor = str(fase or "")
        if not deve_disparar_email_contingencia(fase_valor, total_incluidos):
            return {
                "pedido_id": pedido_id,
                "deve_disparar": False,
                "mensagem": "Pedido ainda não elegível para e-mail de contingência.",
            }
        itens = resumo["itens"]
        fornecedor = next(
            ((it.fornecedor or "").strip() for it in itens if (it.fornecedor or "").strip()),
            None,
        )
        linhas = [
            {
                "item": int(it.item),
                "produto": it.produto,
                "quantidade_esperada": float(it.quantidade_esperada),
                "status_conferencia": normalizar_status_item(it.status_conferencia),
            }
            for it in itens
            if int(it.item) in resumo["itens_incluidos"]
        ]
        return {
            "pedido_id": pedido_id,
            "fornecedor_principal": fornecedor,
            "fase_conferencia": fase_valor,
            "total_incluidos": total_incluidos,
            "total_excluidos": int(resumo.get("total_excluidos", 0)),
            "linhas": linhas,
            "deve_disparar": True,
        }

    @staticmethod
    async def notificar_pedido_pronto_sidi(
        db: AsyncSession,
        pedido_id: int,
        smtp_factory=None,
    ) -> tuple[bool, str]:
        payload = await ConferenciaCRUD._payload_notificacao_pedido(db, pedido_id)
        if not payload:
            return False, "Pedido não encontrado."
        if not payload.get("deve_disparar"):
            return False, str(payload.get("mensagem"))
        smtp_cfg = await ConferenciaCRUD.get_smtp_config(db)
        if not smtp_cfg or not smtp_cfg.ativo:
            msg = "SMTP não configurado/ativo para notificação SIDI."
            await ConferenciaCRUD._registrar_pendencia_notificacao_sidi(db, pedido_id, msg)
            return False, msg
        destinatarios = [
            d.email
            for d in await ConferenciaCRUD.list_destinatarios_sidi(db)
            if d.ativo
        ]
        if not destinatarios:
            msg = "Nenhum destinatário ativo configurado para notificação SIDI."
            await ConferenciaCRUD._registrar_pendencia_notificacao_sidi(db, pedido_id, msg)
            return False, msg
        corpo = renderizar_template_notificacao_sidi(payload)
        try:
            enviar_email_contingencia_sidi(
                smtp_host=smtp_cfg.host,
                smtp_port=smtp_cfg.port,
                smtp_username=smtp_cfg.username,
                smtp_password=smtp_cfg.password,
                smtp_use_tls=smtp_cfg.use_tls,
                remetente=smtp_cfg.remetente_email,
                destinatarios=destinatarios,
                assunto=f"[Contingência SIDI] Pedido {pedido_id} pronto para lançamento",
                corpo=corpo,
                smtp_factory=smtp_factory,
            )
        except (smtplib.SMTPException, OSError) as exc:
            logger.exception(
                "Falha no envio de e-mail de contingência SIDI para o pedido %s",
                pedido_id,
            )
            msg = (
                "Falha no envio do e-mail de contingência (SMTP/configuração), "
                "mas a conclusão operacional foi mantida."
            )
            await ConferenciaCRUD._registrar_pendencia_notificacao_sidi(db, pedido_id, msg)
            return (False, msg)
        await ConferenciaCRUD._resolver_pendencia_notificacao_sidi(db, pedido_id)
        await ConferenciaCRUD._marcar_contingencia_sidi_email_enviado_neste_ciclo_pronto(
            db, pedido_id
        )
        return True, "E-mail de contingência enviado com sucesso."

    @staticmethod
    async def _marcar_contingencia_sidi_email_enviado_neste_ciclo_pronto(
        db: AsyncSession, pedido_id: int
    ) -> None:
        """Evita novo disparo enquanto o pedido segue em ProntoParaIntegracao após envio com sucesso."""
        await ConferenciaCRUD._reconciliar_fase_pedido_sem_commit(db, pedido_id)
        itens = await ConferenciaCRUD.get_itens_por_pedido(
            db, pedido_id, incluir_cancelados=True
        )
        if not itens:
            return
        pares = [(i.status_conferencia, bool(i.cancelado)) for i in itens]
        if calcular_fase_pedido(pares) != FaseConferenciaPedido.PRONTO_PARA_INTEGRACAO:
            return
        row = await db.get(ConferenciaPedido, pedido_id)
        if not row:
            return
        row.sidi_contingencia_email_auto_enviado_em = datetime.now()
        await db.commit()

    @staticmethod
    async def listar_registros_envio_manual_sidi(
        db: AsyncSession, pedido_id: int
    ) -> list[SidiEnvioManualRegistro]:
        rows = await db.execute(
            select(SidiEnvioManualRegistro)
            .where(SidiEnvioManualRegistro.pedido_id == pedido_id)
            .order_by(SidiEnvioManualRegistro.enviado_em.desc())
        )
        return list(rows.scalars().all())

    @staticmethod
    async def registrar_envio_manual_sidi(
        db: AsyncSession,
        pedido_id: int,
        enviado_por: str,
        protocolo: str | None,
        observacao: str | None,
    ) -> SidiEnvioManualRegistro:
        ja_existe = await db.scalar(
            select(SidiEnvioManualRegistro.id)
            .where(SidiEnvioManualRegistro.pedido_id == pedido_id)
            .limit(1)
        )
        validar_registro_manual_existente(bool(ja_existe), observacao)
        row = SidiEnvioManualRegistro(
            pedido_id=pedido_id,
            enviado_por=enviado_por,
            canal_envio="manual_contingencia",
            protocolo=(protocolo or "").strip() or None,
            observacao=(observacao or "").strip() or None,
        )
        db.add(row)
        await db.commit()
        await db.refresh(row)
        return row

    @staticmethod
    async def _registrar_pendencia_notificacao_sidi(
        db: AsyncSession, pedido_id: int, mensagem_falha: str
    ) -> None:
        row = await db.get(SidiNotificacaoPendente, pedido_id)
        if not row:
            db.add(
                SidiNotificacaoPendente(
                    pedido_id=pedido_id,
                    ativo=True,
                    tentativas=1,
                    ultima_falha=mensagem_falha[:500],
                )
            )
            await db.commit()
            return
        row.ativo = True
        row.tentativas = int(row.tentativas or 0) + 1
        row.ultima_falha = mensagem_falha[:500]
        row.ultima_tentativa_em = datetime.now()
        row.resolvido_em = None
        await db.commit()

    @staticmethod
    async def _resolver_pendencia_notificacao_sidi(
        db: AsyncSession, pedido_id: int
    ) -> None:
        row = await db.get(SidiNotificacaoPendente, pedido_id)
        if not row:
            return
        row.ativo = False
        row.resolvido_em = datetime.now()
        await db.commit()

    @staticmethod
    async def listar_pendencias_notificacao_sidi(
        db: AsyncSession,
    ) -> list[SidiNotificacaoPendente]:
        rows = await db.execute(
            select(SidiNotificacaoPendente)
            .where(SidiNotificacaoPendente.ativo.is_(True))
            .order_by(SidiNotificacaoPendente.ultima_tentativa_em.desc())
        )
        return list(rows.scalars().all())
