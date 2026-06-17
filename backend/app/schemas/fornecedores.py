import uuid
from typing import Optional

from pydantic import BaseModel, Field, field_validator
from pydantic import ConfigDict

from backend.app.schemas.forma_pagamento import FormaPagamentoResponse


class FornecedorBase(BaseModel):
    fantasia: str = Field(..., min_length=2, description="Nome Fantasia do Fornecedor")
    box_complemento: Optional[str] = Field(None, description="Ex: Box 142, Coluna B")
    contato: Optional[str] = None


class FornecedorCreate(FornecedorBase):
    pass


class FornecedorUpdate(BaseModel):
    """
    Schema para atualização parcial (PATCH).
    Todos os campos são opcionais.
    """
    nome: Optional[str] = Field(None, min_length=2, description="Nome do Box ou Fornecedor")
    ativo: Optional[bool] = None
    box_complemento: Optional[str] = Field(None, description="Ex: Box 142, Coluna B")
    contato: Optional[str] = None


class FornecedorResponse(FornecedorBase):
    id: int
    forma_pagamento_padrao: Optional[FormaPagamentoResponse] = None
    email: Optional[str] = Field(None, description="E-mail de contato/envio (cadastro local)")

    model_config = ConfigDict(from_attributes=True)


class FornecedorEmailEnvioUpdate(BaseModel):
    """Atualização do e-mail usado para envio de pedido ao fornecedor."""

    email: Optional[str] = Field(None, max_length=100)

    @field_validator("email", mode="before")
    @classmethod
    def normalizar_e_validar_email(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            s = v.strip()
            if not s:
                return None
            if "@" not in s or s.index("@") < 1:
                raise ValueError("Informe um e-mail válido ou deixe em branco.")
            return s[:100]
        return v
