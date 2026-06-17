import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field

from backend.app.schemas.produtos import ProdutoBase


class FornecedorFantasiaOnly(BaseModel):
    """Trecho do cadastro usado só para mapear o relacionamento no item."""

    fantasia: str
    model_config = ConfigDict(from_attributes=True)


class ItemSolicitacaoBase(BaseModel):
    produto_codigo: int = Field(..., description="Código do produto vindo do cadastro")
    quantidade: float = Field(..., gt=0)
    unidade: str = Field(..., max_length=6, description="Unidade de medida (ex: KG, UN)")


class ItemSolicitacaoCreate(ItemSolicitacaoBase):
    """Utilizado no POST individual para incluir um item na lista"""
    solicitacao_id: uuid.UUID = Field(..., description="ID da Missão/Solicitação pai")
    fornecedor_id: Optional[int] = Field(
        default=None,
        description="Pedido direto: fornecedor da linha (obrigatório nesse fluxo no front).",
    )
    forma_pagamento_ref_id: Optional[uuid.UUID] = Field(
        default=None,
        description="Forma de pagamento; se omitido com fornecedor_id, usa a padrão do fornecedor.",
    )
    valor_unitario: Optional[float] = Field(
        default=None,
        description="Pedido direto (com fornecedor): preço unitário estimado na unidade pedida (> 0).",
    )


class ItemSolicitacaoUpdate(BaseModel):
    """Utilizado no PATCH para alterar um item antes da compra"""
    quantidade: Optional[float] = Field(None, gt=0)
    unidade: Optional[str] = Field(None, max_length=6)
    # O comprador usará estes campos no momento da execução:
    valor_unitario: Optional[float] = None
    fornecedor_id: Optional[uuid.UUID] = None
    comprado: Optional[bool] = None  # Flag que trava edições futuras
    valor_liberado: Optional[bool] = None  # Liberação manual do financeiro


class ItemSolicitacaoResponse(ItemSolicitacaoBase):
    id: uuid.UUID
    solicitacao_id: uuid.UUID
    valor_maximo_aceitavel: float  # Persistido no momento da criação para auditoria
    comprado: bool
    valor_liberado: bool
    produto: Optional[ProdutoBase] = None
    peso_total_calculado: float = Field(
        ...,
        description="Peso total em KG calculado automaticamente com base na unidade"
    )
    # Dados do lançamento de compra (quando comprado — útil para correção no CEAGESP)
    fornecedor_id: Optional[int] = None
    quantidade_adquirida: Optional[float] = None
    unidade_comprada: Optional[str] = None
    valor_unitario: Optional[float] = Field(
        None,
        description="Valor unitário do lançamento de compra (coluna local)",
    )
    forma_pagamento_ref_id: Optional[uuid.UUID] = None
    observacao: Optional[str] = None
    # Relacionamento ORM (selectinload); não entra no JSON — só alimenta nome_fornecedor.
    fornecedor: Optional[FornecedorFantasiaOnly] = Field(
        default=None,
        exclude=True,
    )

    @computed_field
    @property
    def nome_fornecedor(self) -> Optional[str]:
        if self.fornecedor is None:
            return None
        return self.fornecedor.fantasia

    # Preenchidos só na resposta do PATCH /baixa quando há compra parcial (não vêm do ORM).
    saldo_item_id: Optional[uuid.UUID] = Field(
        default=None,
        description="Nova linha pendente com o restante, após compra parcial.",
    )
    mensagem_desdobramento: Optional[str] = Field(
        default=None,
        description="Texto para exibir ao usuário sobre o desdobramento do saldo.",
    )

    model_config = ConfigDict(from_attributes=True)


class RegistroCompraBaixa(BaseModel):
    fornecedor_id: int
    quantidade_adquirida: float
    unidade_comprada: str  # Para saber se comprou em KG, CX, etc.
    valor_unitario: float
    forma_pagamento_id: uuid.UUID
    observacao: Optional[str] = None
