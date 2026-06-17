import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class FormaPagamentoResponse(BaseModel):
    id: uuid.UUID
    tipo: str = Field(description="cartao | boleto | dinheiro | pix")
    descricao: str
    dias_prazo: int = 0
    codigo_cartao_4: Optional[str] = None
    ativo: bool = True

    model_config = ConfigDict(from_attributes=True)


class FornecedorFormaPagamentoPadraoUpdate(BaseModel):
    """Define ou remove a forma de pagamento padrão do fornecedor (uso: financeiro)."""

    forma_pagamento_id: Optional[uuid.UUID] = Field(
        None,
        description="ID da forma no catálogo; null remove o padrão.",
    )
