from datetime import datetime
from typing import Optional

from sqlalchemy import (Integer, String, DateTime, Numeric, func, PrimaryKeyConstraint, BigInteger, Boolean,
                        ForeignKey)
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.core.database import Base
from backend.app.domain.conferencia_fase import StatusItemConferencia


# --- Pedido agregado na conferência (fase macro) ---
class ConferenciaPedido(Base):
    """
    Uma linha por `pedido_id` com a fase operacional calculada a partir dos itens.
    """

    __tablename__ = "conferencia_pedidos"

    pedido_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    fase_conferencia: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    sidi_contingencia_email_auto_enviado_em: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    data_atualizacao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), onupdate=func.now()
    )


# --- Modelo de Conferência de Mercadoria (Tabela) ---
class ConferenciaItem(Base):
    """
    Modelo ORM para a tabela 'conferencia_items'.
    """
    __tablename__ = "conferencia_itens"

    # Define a chave primária composta
    __table_args__ = (
        # A combinação de PEDIDO e ITEM deve ser única
        PrimaryKeyConstraint('pedido_id', 'item', name='conferencia_item_pk'),
    )

    # Dados do Pedido
    pedido_id: Mapped[int] = mapped_column(
        BigInteger,
        index=True,
        nullable=False
    )

    item: Mapped[int] = mapped_column(
        Integer,
        index=True,
        nullable=False
    )

    # Outras colunas
    fornecedor: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    produto: Mapped[str] = mapped_column(String(100), nullable=False)
    quantidade_esperada: Mapped[float] = mapped_column(Numeric(10, 3), nullable=False)
    peso: Mapped[float] = mapped_column(Numeric(8, 3), default=0, nullable=False)  # PESO
    peso_total: Mapped[float] = mapped_column(Numeric(10, 3), default=0, nullable=False)  # TOTKG
    unidade: Mapped[str] = mapped_column(String(6), nullable=True)  # UN

    # Dados da Conferência (Preenchidos pelo conferente)
    quantidade_fisica: Mapped[float] = mapped_column(Numeric(10, 3), default=0.0, nullable=False)
    observacoes: Mapped[str] = mapped_column(String, nullable=True)

    # Status canônico (ver StatusItemConferencia / domain)
    status_conferencia: Mapped[str] = mapped_column(
        String(40),
        default=StatusItemConferencia.PENDENTE_CONFERENCIA.value,
        nullable=False,
    )

    cancelado: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )

    origem_compra: Mapped[str] = mapped_column(
        String(20),
        default="financeiro",
        nullable=False,
        index=True,
    )

    pedido_do_fornecedor: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True
    )

    nf_do_fornecedor: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True
    )

    divergencia_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("divergencias.id"),
        nullable=True
    )

    # Metadados
    data_criacao: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())
    data_atualizacao: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

    def __repr__(self) -> str:
        return f"ConferenciaItem(pedido_id={self.pedido_id!r}, item={self.item!r}, status={self.status_conferencia!r})"
