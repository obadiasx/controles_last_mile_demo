from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.core.database import Base


# --- Modelo de Tabela de Divergências (Tabela) ---
class Divergencia(Base):
    """
    Modelo ORM para a tabela 'divergencias'.
    Armazena os tipos de divergência possíveis na conferência (ex: "Falta de item", "Excesso", "Avaria").
    """
    __tablename__ = "divergencias"

    # Chave Primária (PK)
    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
        nullable=False
    )

    # Descrição da Divergência
    descricao: Mapped[str] = mapped_column(
        String(100),  # Tamanho razoável para a descrição
        nullable=False,
        unique=True
    )

    def __repr__(self) -> str:
        return f"Divergencia(id={self.id!r}, descricao={self.descricao!r})"
