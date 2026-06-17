"""Testes unitários do domínio de fase/status da conferência (Sprint 3)."""
import pytest

from backend.app.domain.conferencia_fase import (
    FaseConferenciaPedido,
    calcular_fase_pedido,
    indicadores_pedido,
    item_aparece_na_fila_padrao,
    normalizar_status_item,
    pedido_encerrado_operacionalmente,
    recalcular_pedido_apos_mudanca_item,
)


def test_normalizar_legado():
    assert normalizar_status_item("Pendente") == "PendenteConferencia"
    assert normalizar_status_item("Divergente") == "RecebidoComDivergencia"
    assert normalizar_status_item("Concluido") == "FinalizadoParaIntegracao"
    assert (
        normalizar_status_item("PendenteConferencia") == "PendenteConferencia"
    )


def test_fase_todos_pendentes():
    fase = calcular_fase_pedido(
        [("PendenteConferencia", False), ("PendenteConferencia", False)]
    )
    assert fase == FaseConferenciaPedido.AGUARDANDO_RECEBIMENTO


def test_fase_em_conferencia_misto():
    fase = calcular_fase_pedido(
        [("PendenteConferencia", False), ("Parcial", False)]
    )
    assert fase == FaseConferenciaPedido.EM_CONFERENCIA


def test_fase_aguardando_financeiro():
    fase = calcular_fase_pedido(
        [
            ("Parcial", False),
            ("PendenteDecisaoFinanceiro", False),
        ]
    )
    assert fase == FaseConferenciaPedido.AGUARDANDO_DECISAO_FINANCEIRO


def test_fase_em_conferencia_com_financeiro_e_pendente():
    """§4.2-A: ainda há linha na doca."""
    fase = calcular_fase_pedido(
        [
            ("PendenteConferencia", False),
            ("PendenteDecisaoFinanceiro", False),
        ]
    )
    assert fase == FaseConferenciaPedido.EM_CONFERENCIA


def test_fase_pronto_para_integracao():
    fase = calcular_fase_pedido(
        [
            ("RecebidoConforme", False),
            ("Parcial", False),
        ]
    )
    assert fase == FaseConferenciaPedido.PRONTO_PARA_INTEGRACAO


def test_fase_integrado_sidi():
    fase = calcular_fase_pedido(
        [
            ("IntegradoSIDI", False),
            ("IntegradoSIDI", False),
        ]
    )
    assert fase == FaseConferenciaPedido.INTEGRADO_SIDI


def test_indicadores():
    ind = indicadores_pedido(
        [
            ("PendenteConferencia", False),
            ("PendenteDecisaoFinanceiro", False),
        ]
    )
    assert ind["tem_pendencia_financeira"] is True
    assert ind["quantidade_itens_pendentes_conferencia"] == 1
    assert ind["quantidade_itens_pendencia_financeira"] == 1


def test_pedido_encerrado_operacionalmente():
    assert pedido_encerrado_operacionalmente(
        FaseConferenciaPedido.PRONTO_PARA_INTEGRACAO
    )
    assert not pedido_encerrado_operacionalmente(
        FaseConferenciaPedido.EM_CONFERENCIA
    )


def test_item_fila_padrao():
    assert item_aparece_na_fila_padrao("PendenteConferencia", False) is True
    assert item_aparece_na_fila_padrao("RecebidoConforme", False) is False
    assert item_aparece_na_fila_padrao("PendenteConferencia", True) is False


def test_calcular_fase_aceita_status_legado_na_entrada():
    """Strings legadas são normalizadas dentro de calcular_fase_pedido."""
    assert calcular_fase_pedido([("Pendente", False)]) == FaseConferenciaPedido.AGUARDANDO_RECEBIMENTO
    assert (
        calcular_fase_pedido([("Concluido", False)])
        == FaseConferenciaPedido.PRONTO_PARA_INTEGRACAO
    )


def test_recalcular_pedido_apos_mudanca_item_retorna_agregado_completo():
    agregado = recalcular_pedido_apos_mudanca_item(
        [
            ("Parcial", False),
            ("PendenteDecisaoFinanceiro", False),
            ("PendenteConferencia", True),  # cancelado não entra no cálculo
        ]
    )
    assert agregado["fase_conferencia"] == FaseConferenciaPedido.AGUARDANDO_DECISAO_FINANCEIRO
    assert agregado["pedido_concluido"] is False
    assert agregado["tem_pendencia_financeira"] is True
    assert agregado["quantidade_itens_pendentes_conferencia"] == 0
    assert agregado["quantidade_itens_pendencia_financeira"] == 1
