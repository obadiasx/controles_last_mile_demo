import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, ForeignKey, String, func, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base


class SolicitacaoDia(Base):
    """
    Modelo ORM para a tabela 'solicitacoes_dia' no banco de dados local.
    Representa a 'Missão do Dia' ou 'Lista de Compras Interna'.
    """
    __tablename__ = "solicitacoes_dia"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Chave Primária da Solicitação do Dia"
    )

    # Coluna obrigatória. Apenas a data da solicitação (sem hora)
    data: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        comment="Data em que a compra será executada"
    )

    # Chave estrangeira para a tabela de usuários (Comprador Responsável)
    comprador_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("public.tb_user.id", ondelete="SET NULL"),
        nullable=True,
        comment="UUID do Comprador responsável pela Solicitação"
    )

    # Relacionamento: permite acessar os dados do comprador
    comprador = relationship(
        "User",
        back_populates="solicitacoes_dia_criadas",
        lazy="selectin"
    )

    observacoes: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        comment="Observações gerais para toda a molicitação"
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
        return f"SolicitacaoDia(data={self.data!r}, comprador_id={self.comprador_id!r})"
