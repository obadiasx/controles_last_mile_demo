from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.core.database import Base


class SidiNotificacaoSmtpConfig(Base):
    __tablename__ = "sidi_notificacao_smtp_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    host: Mapped[str] = mapped_column(String(255), nullable=False)
    port: Mapped[int] = mapped_column(Integer, nullable=False, default=587)
    username: Mapped[str] = mapped_column(String(255), nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    use_tls: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    remetente_email: Mapped[str] = mapped_column(String(255), nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    modo_contingencia_email_automatico: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False
    )


class SidiNotificacaoDestinatario(Base):
    __tablename__ = "sidi_notificacao_destinatarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), nullable=False
    )


class SidiEnvioManualRegistro(Base):
    __tablename__ = "sidi_envio_manual_registro"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    pedido_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    enviado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), nullable=False
    )
    enviado_por: Mapped[str] = mapped_column(String(120), nullable=False)
    canal_envio: Mapped[str] = mapped_column(
        String(40), nullable=False, default="manual_contingencia"
    )
    protocolo: Mapped[str | None] = mapped_column(String(120), nullable=True)
    observacao: Mapped[str | None] = mapped_column(String(500), nullable=True)


class SidiNotificacaoPendente(Base):
    __tablename__ = "sidi_notificacao_pendentes"

    pedido_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    tentativas: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    ultima_falha: Mapped[str] = mapped_column(String(500), nullable=False)
    primeiro_erro_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), nullable=False
    )
    ultima_tentativa_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), nullable=False
    )
    resolvido_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
