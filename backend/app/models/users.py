import uuid

from sqlalchemy import Column, String, Boolean, DateTime, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from backend.app.core.database import Base


class User(Base):
    __tablename__ = "tb_user"
    __table_args__ = {"schema": "public"}

    # 🔑 ID principal
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        unique=True,
        nullable=False
    )

    # Campos principais
    username = Column(String, unique=True, nullable=False)
    name_full = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    enabled = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now()) 

    # Relacionamento com tb_role
    role_id = Column(
        UUID(as_uuid=True),
        ForeignKey("public.tb_role.id"),
        nullable=False
    )
    role = relationship("Role", back_populates="users", lazy="joined")

    first_access = Column(Boolean, nullable=False, default=True)

    solicitacoes_dia_criadas = relationship(
        "SolicitacaoDia", back_populates="comprador")

    @property
    def permissions(self):
        """
        Retorna a lista de permissões do perfil (Role).
        """
        # Verifica se o role foi carregado e se tem permissões
        if self.role and self.role.permissions:
            return self.role.permissions
        return []

    def __repr__(self):
        return (
            f"<User(id={self.id}, username='{self.username}', "
            f"email='{self.email}', role_id='{self.role_id}')>"
        )
