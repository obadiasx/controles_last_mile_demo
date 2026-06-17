"""Schemas de forma de pagamento."""
import uuid

from backend.app.schemas.forma_pagamento import (
    FormaPagamentoResponse,
    FornecedorFormaPagamentoPadraoUpdate,
)


def test_fornecedor_forma_padrao_update_aceita_null():
    body = FornecedorFormaPagamentoPadraoUpdate(forma_pagamento_id=None)
    assert body.forma_pagamento_id is None


def test_fornecedor_forma_padrao_update_com_uuid():
    u = uuid.uuid4()
    body = FornecedorFormaPagamentoPadraoUpdate(forma_pagamento_id=u)
    assert body.forma_pagamento_id == u


def test_forma_pagamento_response_defaults():
    u = uuid.uuid4()
    fp = FormaPagamentoResponse(
        id=u,
        tipo="pix",
        descricao="PIX",
        dias_prazo=0,
        codigo_cartao_4=None,
        ativo=True,
    )
    assert fp.dias_prazo == 0
    assert fp.codigo_cartao_4 is None
