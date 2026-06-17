from datetime import datetime
from typing import Optional

from sqlalchemy import (Integer, String, DateTime, Numeric, func, PrimaryKeyConstraint, BigInteger)
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.core.database import Base


# --- Modelo de Unidades de Produto (Tabela) ---
class UnidadeProduto(Base):
    """
    Modelo ORM para a tabela 'unidades_produto' no banco de dados local.
    """
    __tablename__ = "unidades_produto"

    # Define a chave primária composta (CODIGO, UN)
    __table_args__ = (
        PrimaryKeyConstraint('codigo', 'unidade', name='unidade_produto_pk'),
    )

    # Colunas de dados (Nomes Amigáveis)
    codigo: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    unidade: Mapped[str] = mapped_column(
        String(6),
        nullable=False
    )

    qtde_kg: Mapped[float] = mapped_column(
        Numeric(8, 3),
        default=0,
        nullable=True
    )

    qtde_un: Mapped[float] = mapped_column(
        Numeric(8, 3),
        default=0,
        nullable=True
    )

    # Metadados
    data_criacao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=func.now()
    )
    data_atualizacao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=func.now(),
        onupdate=func.now()
    )

    def __repr__(self) -> str:
        return f"UnidadeProduto(codigo={self.codigo!r}, unidade={self.unidade!r})"