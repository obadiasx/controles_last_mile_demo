import pytest

from backend.app.domain.conferencia_financeiro import (
    linha_elegivel_sidi,
    linha_elegivel_sidi_liberacao_global,
    montar_preview_sidi,
    montar_preview_sidi_liberacao_global,
    status_destino_por_acao_financeira,
)


def test_preview_sidi_inclui_somente_linhas_liberadas():
    preview = montar_preview_sidi(
        [
            (1, "FinalizadoParaIntegracao", False),
            (2, "PendenteDecisaoFinanceiro", False),
            (3, "IntegradoSIDI", False),
            (4, "Parcial", True),
        ]
    )
    assert preview["itens_incluidos"] == [1, 3]
    assert preview["itens_excluidos"] == [2, 4]
    assert preview["total_incluidos"] == 2
    assert preview["total_excluidos"] == 2


def test_linha_so_entra_no_sidi_quando_elegivel():
    assert linha_elegivel_sidi("FinalizadoParaIntegracao", False) is True
    assert linha_elegivel_sidi("IntegradoSIDI", False) is True
    assert linha_elegivel_sidi("PendenteDecisaoFinanceiro", False) is False
    assert linha_elegivel_sidi("FinalizadoParaIntegracao", True) is False


def test_acao_financeira_mapeia_status_de_destino():
    assert status_destino_por_acao_financeira("liberar_sidi") == "FinalizadoParaIntegracao"
    assert status_destino_por_acao_financeira("manter_fora") == "NaoRecebido"
    assert status_destino_por_acao_financeira("pendencia_financeira") == "PendenteDecisaoFinanceiro"
    with pytest.raises(ValueError):
        status_destino_por_acao_financeira("acao_invalida")


def test_preview_liberacao_global_cenario_10_3():
    linhas = []
    for item in range(1, 8):
        linhas.append((item, "RecebidoConforme", False))
    for item in range(8, 11):
        linhas.append((item, "PendenteDecisaoFinanceiro", False))
    preview = montar_preview_sidi_liberacao_global(linhas)
    assert preview["total_incluidos"] == 7
    assert preview["total_excluidos"] == 3
    assert preview["itens_excluidos"] == [8, 9, 10]


def test_preview_liberacao_global_zero_excluidos():
    preview = montar_preview_sidi_liberacao_global(
        [
            (1, "RecebidoConforme", False),
            (2, "Parcial", False),
            (3, "NaoRecebido", False),
        ]
    )
    assert preview["total_excluidos"] == 0
    assert preview["total_incluidos"] == 3


def test_preview_liberacao_global_todos_excluidos():
    preview = montar_preview_sidi_liberacao_global(
        [
            (1, "PendenteConferencia", False),
            (2, "PendenteDecisaoFinanceiro", False),
            (3, "PendenteConferencia", True),
        ]
    )
    assert preview["total_excluidos"] == 3
    assert preview["total_incluidos"] == 0
    assert linha_elegivel_sidi_liberacao_global("PendenteConferencia", False) is False
