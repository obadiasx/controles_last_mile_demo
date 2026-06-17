"""
Regras puras do fluxo financeiro na conferência (Sprint 6).
"""
from __future__ import annotations

from typing import Iterable

from backend.app.domain.conferencia_fase import (
    StatusItemConferencia,
    STATUS_TERMINAIS_PEDIDO_OK,
    normalizar_status_item,
)

STATUS_ELEGIVEIS_SIDI_LIBERACAO_GLOBAL = frozenset(
    STATUS_TERMINAIS_PEDIDO_OK.difference({StatusItemConferencia.REJEITADO_CONFERENCIA.value})
)


ACOES_FINANCEIRO_STATUS: dict[str, str] = {
    "liberar_sidi": StatusItemConferencia.FINALIZADO_PARA_INTEGRACAO.value,
    "manter_fora": StatusItemConferencia.NAO_RECEBIDO.value,
    "pendencia_financeira": StatusItemConferencia.PENDENTE_DECISAO_FINANCEIRO.value,
}


def status_destino_por_acao_financeira(acao: str) -> str:
    try:
        return ACOES_FINANCEIRO_STATUS[acao]
    except KeyError as exc:
        raise ValueError("Ação financeira inválida.") from exc


def linha_elegivel_sidi(status: str | None, cancelado: bool) -> bool:
    if cancelado:
        return False
    s = normalizar_status_item(status)
    return s in (
        StatusItemConferencia.FINALIZADO_PARA_INTEGRACAO.value,
        StatusItemConferencia.INTEGRADO_SIDI.value,
    )


def linha_elegivel_sidi_liberacao_global(status: str | None, cancelado: bool) -> bool:
    if cancelado:
        return False
    s = normalizar_status_item(status)
    return s in STATUS_ELEGIVEIS_SIDI_LIBERACAO_GLOBAL


def montar_preview_sidi(
    linhas: Iterable[tuple[int, str | None, bool]],
) -> dict[str, int | list[int]]:
    incluidos: list[int] = []
    excluidos: list[int] = []
    for item, status, cancelado in linhas:
        if linha_elegivel_sidi(status, cancelado):
            incluidos.append(item)
        else:
            excluidos.append(item)
    return {
        "itens_incluidos": sorted(incluidos),
        "itens_excluidos": sorted(excluidos),
        "total_incluidos": len(incluidos),
        "total_excluidos": len(excluidos),
    }


def montar_preview_sidi_liberacao_global(
    linhas: Iterable[tuple[int, str | None, bool]],
) -> dict[str, int | list[int]]:
    incluidos: list[int] = []
    excluidos: list[int] = []
    for item, status, cancelado in linhas:
        if linha_elegivel_sidi_liberacao_global(status, cancelado):
            incluidos.append(item)
        else:
            excluidos.append(item)
    return {
        "itens_incluidos": sorted(incluidos),
        "itens_excluidos": sorted(excluidos),
        "total_incluidos": len(incluidos),
        "total_excluidos": len(excluidos),
    }
