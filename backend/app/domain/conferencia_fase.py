"""
Regras puras de fase do pedido e estados de item (conferência unificada).

Ver docs/MODELAGEM_CONFERENCIA_PEDIDO_E_ITENS.md — sem I/O.
"""
from __future__ import annotations

from enum import Enum
from typing import Iterable


class FaseConferenciaPedido(str, Enum):
    AGUARDANDO_RECEBIMENTO = "AguardandoRecebimento"
    EM_CONFERENCIA = "EmConferencia"
    AGUARDANDO_DECISAO_FINANCEIRO = "AguardandoDecisaoFinanceiro"
    PRONTO_PARA_INTEGRACAO = "ProntoParaIntegracao"
    INTEGRADO_SIDI = "IntegradoSIDI"


class StatusItemConferencia(str, Enum):
    PENDENTE_CONFERENCIA = "PendenteConferencia"
    RECEBIDO_CONFORME = "RecebidoConforme"
    PARCIAL = "Parcial"
    NAO_RECEBIDO = "NaoRecebido"
    REJEITADO_CONFERENCIA = "RejeitadoConferencia"
    RECEBIDO_COM_DIVERGENCIA = "RecebidoComDivergencia"
    PENDENTE_DECISAO_FINANCEIRO = "PendenteDecisaoFinanceiro"
    FINALIZADO_PARA_INTEGRACAO = "FinalizadoParaIntegracao"
    INTEGRADO_SIDI = "IntegradoSIDI"


# Itens que encerram a linha para fins de fila do conferente (não aparecem como “pendente”).
STATUS_ITEM_FILA_CONFERENCIA_ENCERRADA = frozenset(
    {
        StatusItemConferencia.RECEBIDO_CONFORME.value,
        StatusItemConferencia.REJEITADO_CONFERENCIA.value,
        StatusItemConferencia.FINALIZADO_PARA_INTEGRACAO.value,
        StatusItemConferencia.INTEGRADO_SIDI.value,
    }
)

# Valores legados ainda excluídos da fila padrão até migração 100% aplicada.
STATUS_EXCLUIDOS_FILA_PADRAO = frozenset(
    STATUS_ITEM_FILA_CONFERENCIA_ENCERRADA.union({"Concluido"})
)

# Conjunto §5.2 — todos nestes estados permitem avançar o pedido para ProntoParaIntegracao
# (desde que não exista PendenteDecisaoFinanceiro).
STATUS_TERMINAIS_PEDIDO_OK = frozenset(
    {
        StatusItemConferencia.RECEBIDO_CONFORME.value,
        StatusItemConferencia.PARCIAL.value,
        StatusItemConferencia.NAO_RECEBIDO.value,
        StatusItemConferencia.REJEITADO_CONFERENCIA.value,
        StatusItemConferencia.RECEBIDO_COM_DIVERGENCIA.value,
        StatusItemConferencia.FINALIZADO_PARA_INTEGRACAO.value,
        StatusItemConferencia.INTEGRADO_SIDI.value,
    }
)

MAPEAMENTO_STATUS_LEGADO: dict[str, str] = {
    "Pendente": StatusItemConferencia.PENDENTE_CONFERENCIA.value,
    "Divergente": StatusItemConferencia.RECEBIDO_COM_DIVERGENCIA.value,
    "Concluido": StatusItemConferencia.FINALIZADO_PARA_INTEGRACAO.value,
}


def normalizar_status_item(valor: str | None) -> str:
    """Converte valores legados da API/banco para o status canônico."""
    if valor is None or (v := valor.strip()) == "":
        return StatusItemConferencia.PENDENTE_CONFERENCIA.value
    return MAPEAMENTO_STATUS_LEGADO.get(v, v)


def calcular_fase_pedido(
    pares_status_cancelado: Iterable[tuple[str, bool]],
) -> FaseConferenciaPedido:
    """
    Calcula a fase macro do pedido a partir das linhas não canceladas.
    """
    ativos: list[str] = []
    for status, cancelado in pares_status_cancelado:
        if cancelado:
            continue
        ativos.append(normalizar_status_item(status))

    if not ativos:
        return FaseConferenciaPedido.AGUARDANDO_RECEBIMENTO

    if all(s == StatusItemConferencia.PENDENTE_CONFERENCIA.value for s in ativos):
        return FaseConferenciaPedido.AGUARDANDO_RECEBIMENTO

    if all(s == StatusItemConferencia.INTEGRADO_SIDI.value for s in ativos):
        return FaseConferenciaPedido.INTEGRADO_SIDI

    sem_pendente_conferencia = all(
        s != StatusItemConferencia.PENDENTE_CONFERENCIA.value for s in ativos
    )
    if (
        sem_pendente_conferencia
        and StatusItemConferencia.PENDENTE_DECISAO_FINANCEIRO.value in ativos
    ):
        return FaseConferenciaPedido.AGUARDANDO_DECISAO_FINANCEIRO

    if (
        sem_pendente_conferencia
        and all(s in STATUS_TERMINAIS_PEDIDO_OK for s in ativos)
        and StatusItemConferencia.PENDENTE_DECISAO_FINANCEIRO.value not in ativos
    ):
        return FaseConferenciaPedido.PRONTO_PARA_INTEGRACAO

    return FaseConferenciaPedido.EM_CONFERENCIA


def indicadores_pedido(
    pares_status_cancelado: Iterable[tuple[str, bool]],
) -> dict[str, bool | int]:
    ativos: list[str] = []
    for status, cancelado in pares_status_cancelado:
        if cancelado:
            continue
        ativos.append(normalizar_status_item(status))

    return {
        "tem_pendencia_financeira": any(
            s == StatusItemConferencia.PENDENTE_DECISAO_FINANCEIRO.value for s in ativos
        ),
        "quantidade_itens_pendentes_conferencia": sum(
            1 for s in ativos if s == StatusItemConferencia.PENDENTE_CONFERENCIA.value
        ),
        "quantidade_itens_pendencia_financeira": sum(
            1 for s in ativos if s == StatusItemConferencia.PENDENTE_DECISAO_FINANCEIRO.value
        ),
    }


def recalcular_pedido_apos_mudanca_item(
    pares_status_cancelado: Iterable[tuple[str, bool]],
) -> dict[str, bool | int | FaseConferenciaPedido]:
    """
    Recalcula os derivados do pedido após qualquer alteração de item.

    Função pura de domínio para manter uma única fonte de verdade no cálculo
    da fase, indicadores e estado de encerramento operacional.
    """
    fase = calcular_fase_pedido(pares_status_cancelado)
    return {
        "fase_conferencia": fase,
        "pedido_concluido": pedido_encerrado_operacionalmente(fase),
        **indicadores_pedido(pares_status_cancelado),
    }


def pedido_encerrado_operacionalmente(fase: FaseConferenciaPedido) -> bool:
    """Equivalente ao antigo 'pedido_concluído' para integração / e-mail."""
    return fase in (
        FaseConferenciaPedido.PRONTO_PARA_INTEGRACAO,
        FaseConferenciaPedido.INTEGRADO_SIDI,
    )


def item_aparece_na_fila_padrao(status: str | None, cancelado: bool) -> bool:
    """Itens que ainda devem aparecer na listagem padrão da conferência."""
    if cancelado:
        return False
    s = normalizar_status_item(status)
    return s not in STATUS_ITEM_FILA_CONFERENCIA_ENCERRADA
