"""Catálogo interno de formas de pagamento (4 famílias: cartão, boleto, dinheiro, pix)."""

import uuid
from typing import Optional, TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base

if TYPE_CHECKING:
    pass


class FormaPagamento(Base):
    """
    Uma linha = uma opção usada na compra (ex.: Boleto - 30 dias, PIX, Cartão ****1234).
    """

    __tablename__ = "formas_pagamento"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tipo: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        doc="cartao | boleto | dinheiro | pix",
    )
    descricao: Mapped[str] = mapped_column(String(160), nullable=False)
    dias_prazo: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    codigo_cartao_4: Mapped[Optional[str]] = mapped_column(String(4), nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    def __repr__(self) -> str:
        return f"<FormaPagamento(id={self.id}, tipo={self.tipo!r}, descricao={self.descricao!r})>"
