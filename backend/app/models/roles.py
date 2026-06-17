from sqlalchemy import Column, String, DateTime, text, func, ForeignKey, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from backend.app.core.database import Base

# Tabela de Associação N:N (Role <-> Permission)
# Se estiver usando SQLAlchemy 1.4+, use o mapeamento de classes para esta tabela.
# Se for simples, pode usar a Table Metadata como abaixo:
role_permission_association = Table(
    'tb_role_permission', Base.metadata,
    Column('role_id', UUID(as_uuid=True), ForeignKey('public.tb_role.id'), primary_key=True),
    Column('permission_id', UUID(as_uuid=True), ForeignKey('public.tb_permission.id'), primary_key=True),
    schema="public"
)


class Role(Base):
    __tablename__ = "tb_role"
    __table_args__ = {"schema": "public"}

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=text("gen_random_uuid()"))
    name = Column(String(50), nullable=False, unique=True, index=True)  # Ex: "administrador"
    description = Column(String(255), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    # Relações:
    # 1. Relação 1:N com User (Um papel tem muitos usuários)
    users = relationship("User", back_populates="role")

    # 2. Relação N:N com Permission (Um papel tem muitas permissões)
    permissions = relationship(
        "Permission",
        secondary=role_permission_association,
        back_populates="roles",
        lazy="selectin"
    )

    def __repr__(self):
        return f"<Role(name='{self.name}')>"


class Permission(Base):
    __tablename__ = "tb_permission"
    __table_args__ = {"schema": "public"}

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=text("gen_random_uuid()"))

    # O nome da permissão deve ser uma constante usada tanto no backend quanto no frontend
    # Ex: 'user:create', 'report:view:finance', 'inventory:access'
    name = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(String(255), nullable=True)

    # Relação N:N com Role (Uma permissão pode pertencer a vários papéis)
    roles = relationship(
        "Role",
        secondary=role_permission_association,
        back_populates="permissions"
    )

    def __repr__(self):
        return f"<Permission(name='{self.name}')>"
