"""Contratos Pydantic dos itens de solicitação / baixa CEAGESP."""
import uuid

import pytest
from pydantic import ValidationError

from backend.app.schemas.solicitacoes_dia_itens import (
    ItemSolicitacaoCreate,
    RegistroCompraBaixa,
)


def test_registro_compra_baixa_nao_possui_data_vencimento():
    """Fluxo de baixa não usa mais data de vencimento no payload."""
    assert "data_vencimento" not in RegistroCompraBaixa.model_fields


def test_registro_compra_baixa_campos_obrigatorios():
    fid = uuid.uuid4()
    data = RegistroCompraBaixa(
        fornecedor_id=1,
        quantidade_adquirida=10,
        unidade_comprada="KG",
        valor_unitario=5.5,
        forma_pagamento_id=fid,
    )
    assert data.observacao is None


def test_registro_compra_baixa_observacao_opcional():
    fid = uuid.uuid4()
    data = RegistroCompraBaixa(
        fornecedor_id=1,
        quantidade_adquirida=1,
        unidade_comprada="UN",
        valor_unitario=3,
        forma_pagamento_id=fid,
        observacao="  teste  ",
    )
    assert data.observacao == "  teste  "


def test_item_solicitacao_create_quantidade_deve_ser_positiva():
    sid = uuid.uuid4()
    with pytest.raises(ValidationError):
        ItemSolicitacaoCreate(
            produto_codigo=1,
            quantidade=0,
            unidade="KG",
            solicitacao_id=sid,
        )


def test_item_solicitacao_create_valido():
    sid = uuid.uuid4()
    item = ItemSolicitacaoCreate(
        produto_codigo=100,
        quantidade=12.5,
        unidade="CX",
        solicitacao_id=sid,
    )
    assert item.quantidade == 12.5
    assert item.unidade == "CX"
