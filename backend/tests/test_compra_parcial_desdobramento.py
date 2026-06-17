"""
Cenários de desdobramento na baixa CEAGESP (compra parcial → linha origem + saldo).

Os testes são unitários sobre a função pura `_planejar_desdobramento_compra_parcial`
(sem banco). Executar: `pytest backend/tests/test_compra_parcial_desdobramento.py -q`
"""
from decimal import Decimal

import pytest

from backend.app.services.solicitacoes_dia_itens import SolicitacaoItemService


class TestMesmaUnidade:
    """Pedido e compra na mesma unidade (UN, CX, etc.): saldo na unidade original."""

    def test_tres_un_compra_dois_gera_um_un_pendente(self):
        """Cenário relatado: 3 UN solicitadas, 2 compradas → linha vira 2 UN + saldo 1 UN."""
        parcial, q_shrink, saldo, un = (
            SolicitacaoItemService._planejar_desdobramento_compra_parcial(
                unidade_solicitada="UN",
                unidade_comprada="UN",
                quantidade_solicitada=Decimal("3"),
                quantidade_comprada=Decimal("2"),
                peso_alvo_kg=Decimal("0.45"),
                peso_comprado_kg=Decimal("0.30"),
                unidade_saldo_kg_cadastrada=None,
            )
        )
        assert parcial is True
        assert q_shrink == Decimal("2")
        assert saldo == Decimal("1")
        assert un == "UN"

    def test_mesma_unidade_diff_kg_menor_que_1_ainda_desdobra(self):
        """Não exige diferença > 1 kg quando a unidade da compra é a da solicitação."""
        parcial, _, saldo, _ = (
            SolicitacaoItemService._planejar_desdobramento_compra_parcial(
                unidade_solicitada="UN",
                unidade_comprada="un",
                quantidade_solicitada=Decimal("3"),
                quantidade_comprada=Decimal("2"),
                peso_alvo_kg=Decimal("0.10"),
                peso_comprado_kg=Decimal("0.07"),
                unidade_saldo_kg_cadastrada=None,
            )
        )
        assert parcial is True
        assert saldo == Decimal("1")

    def test_compra_igual_solicitado_sem_desdobro(self):
        parcial, _, _, _ = SolicitacaoItemService._planejar_desdobramento_compra_parcial(
            unidade_solicitada="UN",
            unidade_comprada="UN",
            quantidade_solicitada=Decimal("3"),
            quantidade_comprada=Decimal("3"),
            peso_alvo_kg=Decimal("1"),
            peso_comprado_kg=Decimal("1"),
            unidade_saldo_kg_cadastrada=None,
        )
        assert parcial is False


class TestUnidadeDiferente:
    """Compra em unidade distinta da solicitação: exige diferença > 1 kg e cadastro KG."""

    def test_diff_menor_igual_1kg_nao_desdobra(self):
        parcial, _, _, _ = SolicitacaoItemService._planejar_desdobramento_compra_parcial(
            unidade_solicitada="CX",
            unidade_comprada="UN",
            quantidade_solicitada=Decimal("1"),
            quantidade_comprada=Decimal("2"),
            peso_alvo_kg=Decimal("10"),
            peso_comprado_kg=Decimal("9.5"),
            unidade_saldo_kg_cadastrada="KG",
        )
        assert parcial is False

    def test_diff_maior_1kg_sem_cadastro_kg_nao_desdobra(self):
        parcial, _, _, _ = SolicitacaoItemService._planejar_desdobramento_compra_parcial(
            unidade_solicitada="CX",
            unidade_comprada="UN",
            quantidade_solicitada=Decimal("2"),
            quantidade_comprada=Decimal("1"),
            peso_alvo_kg=Decimal("20"),
            peso_comprado_kg=Decimal("5"),
            unidade_saldo_kg_cadastrada=None,
        )
        assert parcial is False

    def test_diff_maior_1kg_com_kg_desdobra_em_kg_inteiros(self):
        parcial, q_shrink, saldo_kg, un = (
            SolicitacaoItemService._planejar_desdobramento_compra_parcial(
                unidade_solicitada="CX",
                unidade_comprada="UN",
                quantidade_solicitada=Decimal("2"),
                quantidade_comprada=Decimal("1"),
                peso_alvo_kg=Decimal("20"),
                peso_comprado_kg=Decimal("5"),
                unidade_saldo_kg_cadastrada="KG",
            )
        )
        assert parcial is True
        assert un == "KG"
        assert saldo_kg == Decimal("15")
        assert q_shrink == Decimal("0.50")


@pytest.mark.parametrize(
    "qa,qb,espera_parcial",
    [
        (Decimal("3"), Decimal("2"), True),
        (Decimal("3"), Decimal("3"), False),
    ],
)
def test_parametrizado_mesma_unidade(qa, qb, espera_parcial):
    parcial, _, _, _ = SolicitacaoItemService._planejar_desdobramento_compra_parcial(
        unidade_solicitada="UN",
        unidade_comprada="UN",
        quantidade_solicitada=qa,
        quantidade_comprada=qb,
        peso_alvo_kg=Decimal("1"),
        peso_comprado_kg=Decimal("0.5"),
        unidade_saldo_kg_cadastrada=None,
    )
    assert parcial is espera_parcial
