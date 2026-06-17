from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# Schema de Base para UnidadeProduto (Leitura)
class UnidadeProdutoBase(BaseModel):
    codigo: int
    unidade: str
    qtde_kg: Optional[float] = 0.0
    qtde_un: Optional[float] = 0.0

    model_config = ConfigDict(from_attributes=True)


# Schema de Leitura (inclui metadados)
class UnidadeProduto(UnidadeProdutoBase):
    data_criacao: datetime
    data_atualizacao: datetime


# Schema de Resposta para a Sincronização
class SincronizacaoUnidadesResponse(BaseModel):
    status: str
    total_encontrado_origem: int
    total_processado: int
    total_inserido: int
    total_atualizado: int
    data_ultima_atualizacao_local: str
    motivo: Optional[str] = None
