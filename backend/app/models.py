from typing import Optional
from datetime import datetime

from sqlalchemy import String, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

# Importa a Base Declarativa do seu arquivo de configuração
from backend.app.core.database import Base


class User(Base):
    """
    Modelagem da tabela 'user' no banco de dados PostgreSQL.
    """
    __tablename__ = "user"

    # Coluna principal e chave primária
    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Colunas de autenticação e identificação
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))

    # Colunas de perfil e status
    name_full: Mapped[str] = mapped_column(String(100))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    # Coluna para a função/papel do usuário (admin, standard, etc.)
    role_id: Mapped[str] = mapped_column(String(20), default="standard")

    # Colunas de metadados
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        onupdate=func.now()
    )

    def __repr__(self) -> str:
        """Representação da string para depuração."""
        return f"User(id={self.id!r}, username={self.username!r}, email={self.email!r})"