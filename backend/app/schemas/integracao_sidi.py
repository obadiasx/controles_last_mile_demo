"""Schemas alinhados a docs/integracao_sidi_get_patch_api.md"""
import uuid
from datetime import date, datetime, time
from typing import List, Optional

from pydantic import BaseModel, Field


# --- GET resposta ---


class IntegracaoSidiItemOut(BaseModel):
    item_uuid: uuid.UUID
    item_seq: int
    produto_id: int
    qtde: float
    preco: float
    un: str
    peso: Optional[float] = None
    totkg: Optional[float] = None
    obs: Optional[str] = None
    dtmovim: Optional[date] = None


class IntegracaoSidiPedidoOut(BaseModel):
    pedido_uuid: uuid.UUID
    data_compra: date
    fornecedor_id: int
    fornecedor_fantasia: str
    comprador_codigo_sidi: str
    valor_total: float
    itens_total: int
    kg_total: float
    un_total: float
    hora_pedido: Optional[time] = None
    itens: List[IntegracaoSidiItemOut]


class IntegracaoSidiGetMeta(BaseModel):
    versao_contrato: str = "1.0"
    gerado_em: datetime
    proximo_cursor: Optional[str] = None


class IntegracaoSidiGetResponse(BaseModel):
    meta: IntegracaoSidiGetMeta
    pedidos: List[IntegracaoSidiPedidoOut]


# --- PATCH confirmação ---


class IntegracaoSidiItemConfirmadoIn(BaseModel):
    item_uuid: uuid.UUID
    sidi_item: int = Field(..., ge=1)


class IntegracaoSidiPatchConfirmacaoIn(BaseModel):
    pedido_uuid: uuid.UUID
    sucesso: bool
    sidi_numped: Optional[int] = None
    itens_confirmados: List[IntegracaoSidiItemConfirmadoIn] = Field(default_factory=list)
    codigo_erro: Optional[str] = None
    mensagem: Optional[str] = None


class IntegracaoSidiPatchResponse(BaseModel):
    ok: bool
    pedido_uuid: uuid.UUID
    idempotente: bool = False
