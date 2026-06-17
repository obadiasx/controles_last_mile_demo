from typing import List, Optional

from pydantic import BaseModel, Field


class TetoUnidadeLinha(BaseModel):
    unidade: str = Field(..., max_length=6)
    qtde_kg: Optional[float] = None
    valor_maximo_aceitavel: Optional[float] = Field(
        None,
        description="Valor máximo por esta unidade; null = sem teto cadastrado para a unidade.",
    )


class TetoUnidadeReplaceItem(BaseModel):
    unidade: str = Field(..., max_length=6)
    valor_maximo_aceitavel: Optional[float] = Field(
        None,
        description="Omitir, zero ou negativo remove o teto desta unidade.",
    )


class TetosPrecoUnidadeReplace(BaseModel):
    tetos: List[TetoUnidadeReplaceItem] = Field(default_factory=list)


class TetoEfetivoResponse(BaseModel):
    unidade: str
    valor_maximo_aceitavel: float
