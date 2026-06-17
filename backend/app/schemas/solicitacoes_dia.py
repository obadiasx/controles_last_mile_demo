import uuid
from datetime import date, datetime
from typing import Optional

from fastapi import HTTPException, status
from pydantic import BaseModel, ConfigDict, field_validator

from backend.app.schemas.users import UserBase


# Schema para leitura com o comprador (usando o schema base de User)
class SolicitacaoDiaComprador(UserBase):
    # Apenas os campos essenciais para identificar o comprador
    id: uuid.UUID
    email: str
    nome: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# Schema Base (para Leitura)
class SolicitacaoDiaBase(BaseModel):
    id: uuid.UUID
    comprador_id: uuid.UUID
    data: date
    observacoes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# Schema de Leitura Completa (inclui metadados e o objeto comprador)
class SolicitacaoDia(SolicitacaoDiaBase):
    data_criacao: datetime
    data_atualizacao: datetime
    # O objeto 'comprador' pode ser opcional dependendo da lógica do ORM/população
    comprador: Optional[SolicitacaoDiaComprador] = None


# Schema de Criação (Input do POST)
class SolicitacaoDiaCreate(BaseModel):
    data: date
    comprador_id: uuid.UUID
    observacoes: Optional[str] = None
    permitir_multiplas_no_dia: bool = False

    # Regra de Negócio 2: Não pode aceitar solicitações para dias anteriores
    @field_validator('data')
    @classmethod
    def check_future_or_current_date(cls, v: date):
        if v < date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A data da Solicitações do Dia deve ser igual ou posterior à data atual."
            )
        return v

    model_config = ConfigDict(from_attributes=True)


# Schema de Atualização (Input do PATCH)
class SolicitacaoDiaUpdate(BaseModel):
    # Regra de Negócio 1: data e comprador não são alteráveis (não incluídos aqui)
    observacoes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class EnviarPedidoFornecedorEmailIn(BaseModel):
    fornecedor_id: int
    observacao: Optional[str] = None


class EnviarPedidoFornecedorEmailOut(BaseModel):
    solicitacao_id: uuid.UUID
    fornecedor_id: int
    fornecedor_nome: str
    fornecedor_email: str
    total_itens: int
    enviado_por: str
    mensagem: str


class PedidoDiretoConcluirIn(BaseModel):
    fornecedor_id: int
    observacao: Optional[str] = None


class PedidoDiretoConcluirOut(BaseModel):
    solicitacao_id: uuid.UUID
    fornecedor_id: int
    fornecedor_nome: str
    total_itens: int
    enviado_por: str
    mensagem: str
    email_enviado: bool = True
    aviso_email: Optional[str] = None


class SolicitacaoDiaDeleteOut(BaseModel):
    solicitacao_id: uuid.UUID
    itens_excluidos: int
    mensagem: str
