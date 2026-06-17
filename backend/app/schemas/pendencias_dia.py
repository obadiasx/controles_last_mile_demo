import uuid
from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field


class PendenciaCompraItem(BaseModel):
    item_id: uuid.UUID
    solicitacao_id: uuid.UUID
    data_solicitacao: date
    comprador_id: Optional[uuid.UUID] = None
    comprador_nome: str = "Sem comprador"
    produto_codigo: int
    produto_descricao: str
    quantidade: float
    unidade: str
    observacao: Optional[str] = None


class PendenciaRecebimentoItem(BaseModel):
    pedido_id: int
    item: int
    fornecedor: str
    produto: str
    quantidade_esperada: float
    quantidade_fisica: float
    status_conferencia: str
    cancelado: bool
    observacoes: Optional[str] = Field(
        default=None,
        description="Observações / comentário registrados na conferência.",
    )


class PendenciasDiaResponse(BaseModel):
    data: date
    total_pendencias_compra: int
    total_pendencias_recebimento: int
    pendencias_compra: List[PendenciaCompraItem]
    pendencias_recebimento: List[PendenciaRecebimentoItem]


class ReagendarPendenciaRequest(BaseModel):
    nova_data: date = Field(..., description="Nova data da missão para reagendamento.")


class NaoRepetirPendenciaRequest(BaseModel):
    motivo: Optional[str] = Field(
        default=None,
        max_length=300,
        description="Motivo opcional para registrar decisão de não repetir.",
    )
