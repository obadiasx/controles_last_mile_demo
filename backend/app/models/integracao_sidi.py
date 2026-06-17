"""
Filas de pedidos CEAGESP para integração outbound (contrato em docs/integracao_sidi_get_patch_api.md).

Dados ficam apenas no banco do app (DB_NAME). O SIDI consome via GET e devolve resultado via PATCH.
"""
import uuid
from datetime import date, datetime, time
from typing import List, Optional

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base


class IntegracaoSidiPedidoStatus:
    PENDENTE = "pendente_sidi"
    EM_PROCESSAMENTO = "em_processamento_sidi"
    INTEGRADO = "integrado_sidi"
    ERRO = "erro_sidi"


class IntegracaoSidiPedido(Base):
    """
    Cabeçalho espelhado para exportação ao SIDI (equivalente futuro de CPEDIDOS no lado deles).
    """

    __tablename__ = "integracao_sidi_pedidos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    data_compra: Mapped[date] = mapped_column(Date, nullable=False)
    comprador_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        # User declara schema "public" em __table_args__; FK precisa bater com o metadata.
        ForeignKey("public.tb_user.id", ondelete="RESTRICT"),
        nullable=False,
    )
    comprador_codigo_sidi: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        comment="Valor enviado no GET como comprador_codigo_sidi (ex.: rótulo esperado pelo SIDI).",
    )
    fornecedor_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("fornecedores.id"),
        nullable=False,
    )
    fornecedor_fantasia: Mapped[str] = mapped_column(String(30), nullable=False)

    valor_total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    itens_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    kg_total: Mapped[float] = mapped_column(Numeric(10, 3), nullable=False, default=0)
    un_total: Mapped[float] = mapped_column(Numeric(10, 3), nullable=False, default=0)

    hora_pedido: Mapped[Optional[time]] = mapped_column(Time, nullable=True)

    status: Mapped[str] = mapped_column(
        String(24),
        nullable=False,
        default=IntegracaoSidiPedidoStatus.PENDENTE,
        index=True,
    )
    sidi_numped: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    ultimo_erro: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ultimo_codigo_erro: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    itens: Mapped[List["IntegracaoSidiPedidoItem"]] = relationship(
        "IntegracaoSidiPedidoItem",
        back_populates="pedido",
        cascade="all, delete-orphan",
        order_by="IntegracaoSidiPedidoItem.item_seq",
    )

class IntegracaoSidiPedidoItem(Base):
    """
    Item para exportação (equivalente futuro de ITENSC no SIDI).
    """

    __tablename__ = "integracao_sidi_pedido_itens"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    pedido_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("integracao_sidi_pedidos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    solicitacao_dia_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("solicitacoes_dia_itens.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    item_seq: Mapped[int] = mapped_column(Integer, nullable=False)
    produto_id: Mapped[int] = mapped_column(Integer, nullable=False)
    qtde: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False)
    preco: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    un: Mapped[str] = mapped_column(String(6), nullable=False)

    peso: Mapped[Optional[float]] = mapped_column(Numeric(10, 3), nullable=True)
    totkg: Mapped[Optional[float]] = mapped_column(Numeric(12, 3), nullable=True)
    obs: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    dtmovim: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    sidi_item: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    pedido: Mapped["IntegracaoSidiPedido"] = relationship(
        "IntegracaoSidiPedido", back_populates="itens"
    )
