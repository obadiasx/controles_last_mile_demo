# backend/app/schemas/produtos.py
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# Schema de Base para Produto (Leitura)
class ProdutoBase(BaseModel):
    codigo: int
    descricao: Optional[str] = None
    unidade_compra: Optional[str] = None
    grupo_produto: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# Schema de Leitura Completa
class Produto(ProdutoBase):
    data_criacao: datetime
    data_atualizacao: datetime


# Schema de Resposta para a Sincronização
class SincronizacaoProdutosResponse(BaseModel):
    status: str
    total_encontrado_origem: int
    total_processado: int
    total_inserido: int
    total_atualizado: int
    data_ultima_atualizacao_local: str
    motivo: Optional[str] = None
