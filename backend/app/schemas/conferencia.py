from datetime import datetime
from enum import Enum as PyEnum
from typing import Any, Dict, Optional, List

from pydantic import BaseModel, Field, field_validator
from pydantic import ConfigDict

from backend.app.domain.conferencia_fase import (
    FaseConferenciaPedido,
    StatusItemConferencia,
    normalizar_status_item,
)


class StatusItemConferenciaSchema(str, PyEnum):
    """Estados canônicos do item (espelha domain)."""

    PENDENTE_CONFERENCIA = StatusItemConferencia.PENDENTE_CONFERENCIA.value
    RECEBIDO_CONFORME = StatusItemConferencia.RECEBIDO_CONFORME.value
    PARCIAL = StatusItemConferencia.PARCIAL.value
    NAO_RECEBIDO = StatusItemConferencia.NAO_RECEBIDO.value
    REJEITADO_CONFERENCIA = StatusItemConferencia.REJEITADO_CONFERENCIA.value
    RECEBIDO_COM_DIVERGENCIA = StatusItemConferencia.RECEBIDO_COM_DIVERGENCIA.value
    PENDENTE_DECISAO_FINANCEIRO = StatusItemConferencia.PENDENTE_DECISAO_FINANCEIRO.value
    FINALIZADO_PARA_INTEGRACAO = StatusItemConferencia.FINALIZADO_PARA_INTEGRACAO.value
    INTEGRADO_SIDI = StatusItemConferencia.INTEGRADO_SIDI.value


def _coerce_status_update(v: Any) -> str:
    if v is None:
        raise ValueError("status_conferencia não pode ser None")
    if isinstance(v, PyEnum):
        raw = v.value
    else:
        raw = str(v).strip()
    return normalizar_status_item(raw)


# 1. Base Schema
class ConferenciaItemBase(BaseModel):
    pedido_id: int
    item: int
    fornecedor: str = Field(..., max_length=100)
    produto: str = Field(..., max_length=100)
    quantidade_esperada: float = Field(..., gt=0)
    observacoes: Optional[str] = None
    divergencia_id: Optional[int] = None


# 2. Create Schema
class ConferenciaItemCreate(ConferenciaItemBase):
    quantidade_fisica: float = 0
    status_conferencia: StatusItemConferenciaSchema = (
        StatusItemConferenciaSchema.PENDENTE_CONFERENCIA
    )


# 3. Update Schema
class ConferenciaItemUpdate(BaseModel):
    quantidade_fisica: Optional[float] = None
    observacoes: Optional[str] = None
    divergencia_id: Optional[int] = None
    status_conferencia: Optional[str] = None
    quantidade_esperada: Optional[float] = Field(None, gt=0)
    unidade: Optional[str] = Field(None, max_length=6)

    @field_validator("unidade", mode="before")
    @classmethod
    def _trim_unidade(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        s = str(v).strip()
        return s[:6] if s else None

    @field_validator("status_conferencia", mode="before")
    @classmethod
    def _normalizar_status(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        return _coerce_status_update(v)

    model_config = ConfigDict(from_attributes=True)


# 4. Read/Response Schema
class ConferenciaItem(ConferenciaItemBase):
    quantidade_fisica: float
    status_conferencia: str
    data_criacao: datetime
    data_atualizacao: datetime
    cancelado: bool = False
    origem_compra: str = "financeiro"
    unidade: Optional[str] = None
    pedido_concluido: bool = False
    fase_conferencia: FaseConferenciaPedido = FaseConferenciaPedido.AGUARDANDO_RECEBIMENTO
    tem_pendencia_financeira: bool = False
    quantidade_itens_pendentes_conferencia: int = 0
    quantidade_itens_pendencia_financeira: int = 0

    class Config:
        from_attributes = True


class ConferenciaPedidoResumo(BaseModel):
    pedido_id: int
    fase_conferencia: FaseConferenciaPedido = FaseConferenciaPedido.AGUARDANDO_RECEBIMENTO
    pedido_concluido: bool = False
    tem_pendencia_financeira: bool = False
    quantidade_itens_pendentes_conferencia: int = 0
    quantidade_itens_pendencia_financeira: int = 0
    itens: List[ConferenciaItem] = Field(default_factory=list)

    class Config:
        from_attributes = True


class ConferenciaFinanceiroFilaItem(BaseModel):
    pedido_id: int
    fase_conferencia: FaseConferenciaPedido = FaseConferenciaPedido.AGUARDANDO_RECEBIMENTO
    fornecedor_principal: Optional[str] = None
    total_itens: int = 0
    total_itens_elegiveis_sidi: int = 0
    total_itens_excluidos_sidi: int = 0


class ConferenciaFinanceiroAcaoLinha(BaseModel):
    acao: str = Field(
        ...,
        description="Ações aceitas: liberar_sidi, manter_fora, pendencia_financeira",
    )
    observacoes: Optional[str] = None


class ConferenciaFinanceiroPedidoResumo(ConferenciaPedidoResumo):
    itens_incluidos_sidi: List[int] = Field(default_factory=list)
    itens_excluidos_sidi: List[int] = Field(default_factory=list)
    total_itens_incluidos_sidi: int = 0
    total_itens_excluidos_sidi: int = 0


class ConferenciaFinanceiroLinhaExclusao(BaseModel):
    item: int
    produto: str
    quantidade_esperada: float
    status_atual: str
    motivo: str


class ConferenciaFinanceiroLiberacaoGlobalRequest(BaseModel):
    confirmar: bool = False
    ciente_exclusoes: bool = False


class ConferenciaFinanceiroLiberacaoGlobalResponse(BaseModel):
    pedido_id: int
    itens_incluidos_sidi: List[int] = Field(default_factory=list)
    itens_excluidos_sidi: List[int] = Field(default_factory=list)
    total_itens_incluidos_sidi: int = 0
    total_itens_excluidos_sidi: int = 0
    linhas_excluidas: List[ConferenciaFinanceiroLinhaExclusao] = Field(default_factory=list)
    confirmacao_obrigatoria: bool = True
    mensagem: str


class SidiNotificacaoSmtpConfigBase(BaseModel):
    host: str
    port: int = Field(default=587, gt=0, lt=65536)
    username: str
    password: str
    use_tls: bool = True
    remetente_email: str
    ativo: bool = True
    modo_contingencia_email_automatico: bool = False


class SidiNotificacaoSmtpConfigOut(SidiNotificacaoSmtpConfigBase):
    id: int


class SidiNotificacaoDestinatarioCreate(BaseModel):
    nome: str
    email: str
    ativo: bool = True


class SidiNotificacaoDestinatarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    ativo: Optional[bool] = None


class SidiNotificacaoDestinatarioOut(BaseModel):
    id: int
    nome: str
    email: str
    ativo: bool


class SidiNotificacaoResultado(BaseModel):
    pedido_id: int
    enviado: bool
    mensagem: str


class SidiNotificacaoPendenteOut(BaseModel):
    pedido_id: int
    tentativas: int
    ultima_falha: str
    primeiro_erro_em: datetime
    ultima_tentativa_em: datetime

    model_config = ConfigDict(from_attributes=True)


class SidiEnvioManualRegistroCreate(BaseModel):
    protocolo: Optional[str] = None
    observacao: Optional[str] = None


class SidiEnvioManualRegistroOut(BaseModel):
    id: int
    pedido_id: int
    enviado_em: datetime
    enviado_por: str
    canal_envio: str
    protocolo: Optional[str] = None
    observacao: Optional[str] = None


# Modelo que define a estrutura do corpo da requisição (Body JSON)
class SincronizacaoRequest(BaseModel):
    dias_retroativos: int


class DivergenciaBase(BaseModel):
    descricao: str


class Divergencia(DivergenciaBase):
    id: int

    class Config:
        from_attributes = True


class SincronizacaoResposta(BaseModel):
    """Resposta do POST /conferencia/sincronizar."""

    message: str
    mensagem_resumo: str
    detalhes: Dict[str, Any]
