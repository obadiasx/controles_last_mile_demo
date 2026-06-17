import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import (String, Boolean, DateTime, func, Integer, ForeignKey)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.core.database import Base

if TYPE_CHECKING:
    from backend.app.models.forma_pagamento import FormaPagamento


class For_necedor(Base):
    __tablename__ = "fornecedores_old"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)  # Ativo/Inativo
    # Campos para CEAGESP / Endereço
    box_complemento: Mapped[str] = mapped_column(String(255), nullable=True)
    contato: Mapped[str] = mapped_column(String(100), nullable=True)


class Fornecedor(Base):
    """
    Modelo espelho da tabela CADFORN.
    """
    __tablename__ = "fornecedores"

    # Chave Primária idêntica à Origem (Integer)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)

    # Identificação Básica (Sincronizada com CADFORN)
    fantasia: Mapped[str] = mapped_column(String(30), nullable=False)
    razsocial: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    cgc: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    insc: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)

    # Endereço
    endr: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    bairro: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    mun: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    cep: Mapped[Optional[str]] = mapped_column(String(9), nullable=True)
    uf: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    numendr: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    box_complemento: Mapped[Optional[str]] = mapped_column(String(20), nullable=True) # complr na origem
    codmun: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)

    # Contatos
    tel1: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    wsite: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Controle Interno e Campos Adicionais
    # ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    obs: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    placa: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)

    # Campos Legados/Negócio (CEAGESP)
    contato: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Metadados
    data_atualizacao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=func.now(),
        onupdate=func.now()
    )

    forma_pagamento_padrao_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("formas_pagamento.id", ondelete="SET NULL"),
        nullable=True,
    )
    forma_pagamento_padrao: Mapped[Optional["FormaPagamento"]] = relationship(
        "FormaPagamento",
        foreign_keys=[forma_pagamento_padrao_id],
        lazy="joined",
    )

    def __repr__(self) -> str:
        return f"<For_necedor(id={self.id}, fantasia='{self.fantasia}')>"
