import uuid
import logging
from datetime import datetime
from decimal import ROUND_HALF_EVEN, ROUND_HALF_UP, Decimal
from typing import List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, contains_eager
from sqlalchemy import func, select
from zoneinfo import ZoneInfo

from backend.app.models.produtos import Produto
from backend.app.models.unidades import UnidadeProduto
from backend.app.models.solicitacoes_dia_itens import SolicitacaoDiaItem
from backend.app.models.solicitacoes_dia import SolicitacaoDia
from backend.app.models.fornecedores import Fornecedor
from backend.app.models.forma_pagamento import FormaPagamento
from backend.app.models.users import User
from backend.app.models.integracao_sidi import (
    IntegracaoSidiPedido,
    IntegracaoSidiPedidoItem,
    IntegracaoSidiPedidoStatus,
)
from backend.app.schemas.solicitacoes_dia_itens import (
    ItemSolicitacaoCreate,
    ItemSolicitacaoResponse,
    ItemSolicitacaoUpdate,
    RegistroCompraBaixa,
)
from backend.app.services.integracao_sidi_pedido_app import IntegracaoSidiPedidoAppService
from backend.app.services.teto_preco_produto import TetoPrecoProdutoService

logger = logging.getLogger(__name__)


class SolicitacaoItemService:

    @staticmethod
    async def _get_item_com_relacionamentos(db: AsyncSession, item_id: uuid.UUID):
        """Método auxiliar para buscar item com unidade_info carregada."""
        stmt = (
            select(SolicitacaoDiaItem)
            .where(SolicitacaoDiaItem.id == item_id)
            .options(
                selectinload(SolicitacaoDiaItem.unidade_info),
                selectinload(SolicitacaoDiaItem.produto),
                selectinload(SolicitacaoDiaItem.fornecedor),
                selectinload(SolicitacaoDiaItem.forma_pagamento_ref),
                selectinload(SolicitacaoDiaItem.solicitacao).selectinload(
                    SolicitacaoDia.comprador
                ),
            )
        )

        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def incluir_item(db: AsyncSession, item_in: ItemSolicitacaoCreate):
        # 1. Busca produto para regra de preço teto
        produto = await db.get(Produto, item_in.produto_codigo)
        if not produto:
            raise HTTPException(status_code=404, detail="Produto não encontrado")

        teto_linha = await TetoPrecoProdutoService.teto_efetivo_para_unidade(
            db, item_in.produto_codigo, item_in.unidade
        )

        fornecedor_resolved_id: int | None = item_in.fornecedor_id
        forma_resolved_uuid: uuid.UUID | None = item_in.forma_pagamento_ref_id
        forma_pagamento_text: str | None = None

        if item_in.fornecedor_id is not None:
            forn_row = await db.get(Fornecedor, item_in.fornecedor_id)
            if not forn_row:
                raise HTTPException(status_code=404, detail="Fornecedor não encontrado.")
            fp_id = item_in.forma_pagamento_ref_id or forn_row.forma_pagamento_padrao_id
            if fp_id is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Fornecedor sem forma de pagamento padrão. Cadastre em Pagamento / e-mail.",
                )
            if (
                forn_row.forma_pagamento_padrao_id is not None
                and fp_id != forn_row.forma_pagamento_padrao_id
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Este fornecedor possui forma de pagamento fixa; não é permitido alterar.",
                )
            forma_row = await db.get(FormaPagamento, fp_id)
            if not forma_row or not forma_row.ativo:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Forma de pagamento inválida ou inativa.",
                )
            forma_resolved_uuid = fp_id
            forma_pagamento_text = (forma_row.descricao or "")[:160]

            if item_in.valor_unitario is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Pedido direto: informe o preço unitário estimado (maior que zero).",
                )
            vu_est = float(item_in.valor_unitario)
            valor_unitario_linha = vu_est
        else:
            if item_in.valor_unitario is not None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Valor unitário na inclusão só se aplica ao pedido direto (com fornecedor).",
                )
            valor_unitario_linha = None

        # 2. Instancia o novo item (teto congelado conforme regras por unidade na data da inclusão)
        novo_item = SolicitacaoDiaItem(
            solicitacao_id=item_in.solicitacao_id,
            produto_codigo=item_in.produto_codigo,
            quantidade=item_in.quantidade,
            unidade=item_in.unidade,
            valor_maximo_aceitavel=teto_linha,
            valor_unitario=valor_unitario_linha,
            comprado=False,
            valor_liberado=False,
            fornecedor_id=fornecedor_resolved_id,
            forma_pagamento_ref_id=forma_resolved_uuid,
            forma_pagamento=forma_pagamento_text,
        )

        db.add(novo_item)
        await db.commit()
        await db.refresh(novo_item)

        # 3. Retorna com relacionamentos carregados para evitar erro de Greenlet no Pydantic
        return await SolicitacaoItemService._get_item_com_relacionamentos(db, novo_item.id)

    @staticmethod
    async def excluir_item(db: AsyncSession, item_id: uuid.UUID):
        item = await db.get(SolicitacaoDiaItem, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Item não encontrado")

        # REGRA: Não permite excluir se o Cassiano já tiver dado baixa
        if item.comprado:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Não é possível excluir este item porque ele já foi comprado."
                ),
            )

        await db.delete(item)
        await db.commit()
        return None

    @staticmethod
    def _planejar_desdobramento_compra_parcial(
        *,
        unidade_solicitada: str,
        unidade_comprada: str,
        quantidade_solicitada: Decimal,
        quantidade_comprada: Decimal,
        peso_alvo_kg: Decimal,
        peso_comprado_kg: Decimal,
        unidade_saldo_kg_cadastrada: Optional[str],
    ) -> Tuple[bool, Optional[Decimal], Optional[Decimal], Optional[str]]:
        """
        Define se haverá desdobramento e os quantitativos.

        - Mesma unidade (ex.: pediu em UN e comprou em UN): desdobra pelo saldo na
          própria unidade sempre que comprou menos que o solicitado (independe de kg).
        - Unidade de compra diferente: só desdobra se a diferença de peso for > 1 kg;
          saldo em KG inteiros (arredondamento universal) e cadastro de unidade KG.
        """
        un_sol = unidade_solicitada.strip().upper()
        un_comp = unidade_comprada.strip().upper()
        qa = quantidade_solicitada
        q_comp = quantidade_comprada

        if un_sol == un_comp:
            rem = (qa - q_comp).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            if rem > 0:
                qs = q_comp.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                return True, qs, rem, unidade_solicitada.strip()
            return False, None, None, None

        if peso_alvo_kg <= 0:
            return False, None, None, None
        diff_kg = peso_alvo_kg - peso_comprado_kg
        if diff_kg <= Decimal("1"):
            return False, None, None, None
        if not (unidade_saldo_kg_cadastrada or "").strip():
            return False, None, None, None
        q_shrink = (qa * (peso_comprado_kg / peso_alvo_kg)).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        saldo_qty = diff_kg.quantize(Decimal("1"), rounding=ROUND_HALF_EVEN)
        if saldo_qty <= 0:
            return False, None, None, None
        return True, q_shrink, saldo_qty, unidade_saldo_kg_cadastrada.strip()

    @staticmethod
    async def registrar_baixa(
        db: AsyncSession,
        item_id: uuid.UUID,
        dados: RegistroCompraBaixa,
        current_user: User,
    ):
        item = await SolicitacaoItemService._get_item_com_relacionamentos(db, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Item não encontrado.")

        solicitacao = item.solicitacao
        if not solicitacao:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Item sem solicitação do dia vinculada.",
            )

        # Substituição do lançamento: mesmas regras que cancelar compra + remove linha SIDI se pendente
        if item.comprado:
            SolicitacaoItemService._verificar_permissao_ajuste_compra_registrada(
                solicitacao, current_user
            )
            await SolicitacaoItemService._remover_linha_fila_sidi_se_existir(db, item_id)

        # REGRA 1: Trava de Preço (Limitador) — recalcula pelo teto efetivo na unidade comprada
        # (várias regras por unidade → maior limite normalizado por kg, convertido para a unidade da compra).
        limite = float(
            await TetoPrecoProdutoService.teto_efetivo_para_unidade(
                db, item.produto_codigo, dados.unidade_comprada
            )
        )
        role_nm = (
            (current_user.role.name or "").strip().lower()
            if getattr(current_user, "role", None)
            else ""
        )
        perfil_supera_teto = role_nm in ("financeiro", "administrador")
        if (
            limite > 0
            and float(dados.valor_unitario) > limite
            and not item.valor_liberado
            and not perfil_supera_teto
        ):
            vu = float(dados.valor_unitario)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"O valor unitário informado ({vu:.2f}) ultrapassa o teto máximo "
                    f"definido para este item ({limite:.2f}). "
                    "Ajuste o valor unitário ou peça ao financeiro/administração a liberação deste item."
                ),
            )

        # --- REGRA 2: Verificação de Unidade e Peso (Nova) ---
        # 1. Descobrir o peso do que foi SOLICITADO originalmente (Peso Alvo)
        peso_alvo = item.peso_total_calculado

        # 2. Descobrir o peso do que está sendo COMPRADO agora
        # Precisamos buscar o fator de conversão da unidade que o comprador escolheu
        stmt = select(UnidadeProduto).where(
            UnidadeProduto.codigo == item.produto_codigo,
            UnidadeProduto.unidade == dados.unidade_comprada
        )
        res = await db.execute(stmt)
        unidade_info_comprada = res.scalar_one_or_none()

        if not unidade_info_comprada:
            raise HTTPException(status_code=400, detail="Unidade comprada inválida para este produto.")

        peso_comprado = float(dados.quantidade_adquirida) * float(unidade_info_comprada.qtde_kg)

        # 3. Validação dos 10% (Desperdício)
        limite_maximo = peso_alvo * 1.10
        if peso_comprado > limite_maximo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Compra excede o limite de 10% de peso \
                    (Máx: {limite_maximo:.2f}kg, Tentativa: {peso_comprado:.2f}kg)."
            )

        # Compra parcial com desdobramento (ver docstring de _planejar_desdobramento_compra_parcial)
        saldo_item_id: uuid.UUID | None = None
        mensagem_desdobramento: str | None = None

        w_a = Decimal(str(peso_alvo))
        w_c = Decimal(str(peso_comprado))

        un_sol_pre = (item.unidade or "").strip().upper()
        un_comp_pre = (dados.unidade_comprada or "").strip().upper()
        unidade_kg_cad: str | None = None
        if un_sol_pre != un_comp_pre:
            stmt_kg = select(UnidadeProduto).where(
                UnidadeProduto.codigo == item.produto_codigo,
                func.upper(UnidadeProduto.unidade) == "KG",
            )
            res_kg = await db.execute(stmt_kg)
            row_kg = res_kg.scalar_one_or_none()
            if row_kg is None:
                logger.warning(
                    "Compra parcial com unidade distinta sem cadastro KG (produto %s); "
                    "desdobramento em KG indisponível.",
                    item.produto_codigo,
                )
            else:
                unidade_kg_cad = (row_kg.unidade or "KG").strip()

        compra_parcial, q_shrink, saldo_qty, saldo_unidade = (
            SolicitacaoItemService._planejar_desdobramento_compra_parcial(
                unidade_solicitada=item.unidade or "",
                unidade_comprada=dados.unidade_comprada or "",
                quantidade_solicitada=Decimal(str(item.quantidade)),
                quantidade_comprada=Decimal(str(dados.quantidade_adquirida)),
                peso_alvo_kg=w_a,
                peso_comprado_kg=w_c,
                unidade_saldo_kg_cadastrada=unidade_kg_cad,
            )
        )

        comprador = solicitacao.comprador
        if not comprador:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missão do dia sem comprador vinculado; não é possível registrar o pedido para integração.",
            )

        fornecedor_row = await db.get(Fornecedor, dados.fornecedor_id)
        if not fornecedor_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Fornecedor não encontrado no cadastro local (sincronize CADFORN).",
            )

        forma_row = await db.get(FormaPagamento, dados.forma_pagamento_id)
        if not forma_row or not forma_row.ativo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Forma de pagamento inválida ou inativa.",
            )
        if (
            fornecedor_row.forma_pagamento_padrao_id is not None
            and dados.forma_pagamento_id != fornecedor_row.forma_pagamento_padrao_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Este fornecedor possui forma de pagamento fixa; não é permitido alterar.",
            )

        qtde_dec = Decimal(str(dados.quantidade_adquirida))
        preco_dec = Decimal(str(dados.valor_unitario))
        valor_linha = (qtde_dec * preco_dec).quantize(Decimal("0.01"))
        totkg_dec = Decimal(str(peso_comprado)).quantize(Decimal("0.001"))
        peso_unit_dec = (
            (totkg_dec / qtde_dec).quantize(Decimal("0.001")) if qtde_dec > 0 else Decimal("0")
        )

        obs_parts = [forma_row.descricao]
        if getattr(dados, "observacao", None):
            obs_parts.append(dados.observacao or "")
        obs_linha = " | ".join(p for p in obs_parts if p).strip()[:40]

        valor_unitario_lista_antes = item.valor_unitario

        try:
            await IntegracaoSidiPedidoAppService.registrar_item_compra_ceagesp(
                db,
                data_compra=solicitacao.data,
                comprador=comprador,
                fornecedor=fornecedor_row,
                solicitacao_dia_item_id=item.id,
                produto_id=item.produto_codigo,
                qtde=qtde_dec,
                preco=preco_dec,
                un=dados.unidade_comprada,
                peso=peso_unit_dec,
                totkg=totkg_dec,
                obs=obs_linha,
                dtmovim=solicitacao.data,
                valor_linha=valor_linha,
            )
        except IntegrityError as e:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Este item já possui registro na fila de integração com o SIDI.",
            ) from e
        except Exception as e:
            logger.exception("Falha ao registrar fila de integração SIDI no banco do app")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Não foi possível registrar o pedido para integração: {e!s}",
            ) from e

        # Atualização dos campos financeiros e de fornecedor (banco local)
        item.fornecedor_id = dados.fornecedor_id
        if compra_parcial and q_shrink is not None:
            item.quantidade = float(q_shrink)
        item.quantidade_adquirida = dados.quantidade_adquirida
        item.unidade_comprada = dados.unidade_comprada
        item.valor_unitario = dados.valor_unitario
        item.comprado = True
        item.forma_pagamento = forma_row.descricao[:160]
        item.forma_pagamento_ref_id = forma_row.id
        item.observacao = getattr(dados, 'observacao', None)

        if (
            compra_parcial
            and saldo_qty is not None
            and saldo_unidade
            and saldo_qty > 0
        ):
            teto_saldo = await TetoPrecoProdutoService.teto_efetivo_para_unidade(
                db, item.produto_codigo, saldo_unidade
            )
            obs_saldo = (
                "Saldo após compra parcial (KG)."
                if saldo_unidade.strip().upper() == "KG"
                else "Saldo após compra parcial."
            )
            novo_item = SolicitacaoDiaItem(
                solicitacao_id=item.solicitacao_id,
                produto_codigo=item.produto_codigo,
                quantidade=float(saldo_qty),
                unidade=saldo_unidade,
                valor_maximo_aceitavel=teto_saldo,
                valor_liberado=item.valor_liberado,
                comprado=False,
                valor_unitario=valor_unitario_lista_antes,
                observacao=obs_saldo,
            )
            db.add(novo_item)
            await db.flush()
            saldo_item_id = novo_item.id
            mensagem_desdobramento = (
                "Compra parcial registrada. O saldo restante foi desdobrado em uma nova linha "
                f"pendente ({float(saldo_qty):g} {saldo_unidade}) para compra futura ou outro fornecedor."
            )

        await db.commit()
        atualizado = await SolicitacaoItemService._get_item_com_relacionamentos(db, item.id)
        resp = ItemSolicitacaoResponse.model_validate(atualizado)
        if saldo_item_id is not None and mensagem_desdobramento:
            resp = resp.model_copy(
                update={
                    "saldo_item_id": saldo_item_id,
                    "mensagem_desdobramento": mensagem_desdobramento,
                }
            )
        return resp

    @staticmethod
    async def atualizar_item(db: AsyncSession, item_id: uuid.UUID, item_up: ItemSolicitacaoUpdate, current_user: User):
        item = await SolicitacaoItemService._get_item_com_relacionamentos(db, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Item não encontrado")

        if item.comprado:
            raise HTTPException(status_code=403, detail="Item finalizado não permite alterações.")

        dados_update = item_up.model_dump(exclude_unset=True)

        unidade_para_teto = item.unidade
        if item_up.unidade is not None:
            unidade_para_teto = item_up.unidade

        # Regra de Permissão por Role
        if "valor_liberado" in dados_update:
            if current_user.role.name not in ["financeiro", "administrador"]:
                raise HTTPException(status_code=403, detail="Apenas o financeiro pode liberar valores.")

        # REGRA: Validação de Preço contra o teto (só se houver teto > 0 na linha)
        if "valor_unitario" in dados_update and dados_update["valor_unitario"] is not None:
            v_unitario = float(dados_update["valor_unitario"])
            liberado = dados_update.get("valor_liberado", item.valor_liberado)
            limite = float(
                await TetoPrecoProdutoService.teto_efetivo_para_unidade(
                    db, item.produto_codigo, unidade_para_teto
                )
            )
            role_atual = (current_user.role.name or "").strip().lower()
            perfil_supera_teto = role_atual in ("financeiro", "administrador")
            if (
                limite > 0
                and v_unitario > limite
                and not liberado
                and not perfil_supera_teto
            ):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"O valor unitário ({v_unitario:.2f}) ultrapassa o teto ({limite:.2f}) "
                        "deste item. Solicite liberação ao financeiro ou ajuste o valor unitário."
                    ),
                )

        for campo, valor in dados_update.items():
            setattr(item, campo, valor)

        await db.commit()
        return item

    @staticmethod
    async def _remover_linha_fila_sidi_se_existir(
        db: AsyncSession, solicitacao_dia_item_id: uuid.UUID
    ) -> None:
        stmt = select(IntegracaoSidiPedidoItem).where(
            IntegracaoSidiPedidoItem.solicitacao_dia_item_id == solicitacao_dia_item_id
        )
        res = await db.execute(stmt)
        linha = res.scalar_one_or_none()
        if not linha:
            return

        pedido = await db.get(IntegracaoSidiPedido, linha.pedido_id)
        if pedido and pedido.status == IntegracaoSidiPedidoStatus.INTEGRADO:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Não é possível cancelar: o pedido já foi integrado ao sistema externo (SIDI). "
                    "Alinhe com o financeiro a conciliação ou o estorno manual."
                ),
            )

        valor_linha = Decimal(str(linha.qtde)) * Decimal(str(linha.preco))
        totkg = Decimal(str(linha.totkg or 0))
        qtde_un = Decimal(str(linha.qtde))
        pedido_id = linha.pedido_id

        await db.delete(linha)
        await db.flush()

        pedido = await db.get(IntegracaoSidiPedido, pedido_id)
        if not pedido:
            return

        pedido.valor_total = max(
            Decimal("0"),
            (Decimal(str(pedido.valor_total or 0)) - valor_linha).quantize(Decimal("0.01")),
        )
        pedido.itens_total = max(0, int(pedido.itens_total or 0) - 1)
        pedido.kg_total = max(
            Decimal("0"),
            (Decimal(str(pedido.kg_total or 0)) - totkg).quantize(Decimal("0.001")),
        )
        pedido.un_total = max(
            Decimal("0"),
            (Decimal(str(pedido.un_total or 0)) - qtde_un).quantize(Decimal("0.001")),
        )

        cnt_stmt = select(func.count()).select_from(IntegracaoSidiPedidoItem).where(
            IntegracaoSidiPedidoItem.pedido_id == pedido_id
        )
        restantes = int((await db.execute(cnt_stmt)).scalar_one() or 0)
        if restantes == 0:
            await db.delete(pedido)

    @staticmethod
    def _verificar_permissao_ajuste_compra_registrada(
        sol: SolicitacaoDia, current_user: User
    ) -> None:
        """Cancelar compra ou substituir lançamento (nova baixa): mesmas regras por perfil/data."""
        role = (current_user.role.name or "").lower()
        hoje_sp = datetime.now(ZoneInfo("America/Sao_Paulo")).date()

        if role == "comprador":
            if sol.comprador_id is None or sol.comprador_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Você só pode alterar compras da sua própria lista.",
                )
            if sol.data != hoje_sp:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Compradores só podem alterar compras do dia atual.",
                )
        elif role not in ("financeiro", "administrador"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operação não permitida para este perfil.",
            )

    @staticmethod
    async def cancelar_compra(
        db: AsyncSession, item_id: uuid.UUID, current_user: User
    ):
        """
        Desfaz o estado de compra do item (volta a pendente). Comprador: só data de hoje
        e lista própria. Financeiro/administrador: qualquer data.
        """
        item = await SolicitacaoItemService._get_item_com_relacionamentos(db, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Item não encontrado.")

        if not item.comprado:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este item não está marcado como comprado; não há compra a cancelar.",
            )

        sol = item.solicitacao
        if not sol:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Item sem solicitação do dia vinculada.",
            )

        SolicitacaoItemService._verificar_permissao_ajuste_compra_registrada(
            sol, current_user
        )

        await SolicitacaoItemService._remover_linha_fila_sidi_se_existir(db, item_id)

        item.comprado = False
        item.fornecedor_id = None
        item.quantidade_adquirida = None
        item.unidade_comprada = None
        item.valor_unitario = None
        item.valor_total_pago = None
        item.forma_pagamento = None
        item.forma_pagamento_ref_id = None
        item.observacao = None

        await db.commit()
        return await SolicitacaoItemService._get_item_com_relacionamentos(db, item.id)

    @staticmethod
    async def listar_por_solicitacao(db: AsyncSession, solicitacao_id: uuid.UUID) -> List[SolicitacaoDiaItem]:
        """
        Retorna todos os itens de uma solicitação específica.
        Carrega unidade_info para permitir o cálculo de peso_total no Schema.
        """
        stmt = (
            select(SolicitacaoDiaItem)
            .join(SolicitacaoDiaItem.produto)
            .where(SolicitacaoDiaItem.solicitacao_id == solicitacao_id)
            .order_by(
                SolicitacaoDiaItem.comprado.asc(),  # False (0) antes de True (1)
                Produto.descricao.asc()  # Ordem alfabética A-Z
            )
            .options(
                selectinload(SolicitacaoDiaItem.unidade_info),
                selectinload(SolicitacaoDiaItem.fornecedor),
                # Já que fizemos o join, podemos usar o que já foi carregado
                contains_eager(SolicitacaoDiaItem.produto)
            )
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())
