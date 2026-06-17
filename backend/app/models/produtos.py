from datetime import datetime
from typing import Optional

from sqlalchemy import Integer, String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.core.database import Base


# --- Modelo de Produto (Tabela) ---
class Produto(Base):
    """
    Modelo ORM para a tabela 'produtos' no banco de dados local.
    """
    __tablename__ = "produtos"

    codigo: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        nullable=False,
        comment="Código do produto (Chave Primária)"
    )

    descricao: Mapped[Optional[str]] = mapped_column(
        String(60),
        nullable=True,
        comment="Descrição do produto"
    )

    unidade_compra: Mapped[Optional[str]] = mapped_column(
        String(6),
        nullable=True,
        comment="Unidade de compra padrão (UNC do CADPROD)"
    )

    grupo_produto: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
        comment="Grupo de produto"
    )

    # Metadados
    data_criacao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=func.now()
    )
    data_atualizacao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=func.now(),
        onupdate=func.now(),
        comment="Data da última atualização (usada para o filtro de sincronização)"
    )

    def __repr__(self) -> str:
        return f"Produto(codigo={self.codigo!r}, descricao={self.descricao!r})"
