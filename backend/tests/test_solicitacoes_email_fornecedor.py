from types import SimpleNamespace
from uuid import uuid4

from backend.app.services.solicitacoes_email_fornecedor import (
    renderizar_template_pedido_fornecedor,
)


def test_render_template_pedido_fornecedor_inclui_dados_essenciais():
    solicitacao = SimpleNamespace(
        id=uuid4(),
        data="2026-04-28",
        observacoes="Entregar ate 10h.",
    )
    fornecedor = SimpleNamespace(fantasia="Fornecedor Cliente B")
    solicitante = SimpleNamespace(name_full="Financeiro Teste")
    itens = [
        SimpleNamespace(
            produto_codigo=1001,
            quantidade=12,
            unidade="KG",
            produto=SimpleNamespace(descricao="Tomate extrusado"),
        ),
        SimpleNamespace(
            produto_codigo=1002,
            quantidade=4,
            unidade="CX",
            produto=SimpleNamespace(descricao="Cebola amarela"),
        ),
    ]

    body = renderizar_template_pedido_fornecedor(
        solicitacao=solicitacao,
        fornecedor=fornecedor,
        itens=itens,
        solicitante=solicitante,
        observacao="Priorizar itens frescos.",
    )

    assert "Solicitacao de compra (financeiro)" in body
    assert "Fornecedor Cliente B" in body
    assert "Tomate extrusado" in body
    assert "qtd: 12 KG" in body
    assert "Priorizar itens frescos." in body
