from datetime import date
from typing import Optional

from sqlalchemy import Integer, String, Numeric, Date
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


# Base para o Modelo de Origem (separada da Base do DB Local)
class OrigemBase(DeclarativeBase):
    """Classe base para os modelos ORM do banco de dados de ORIGEM."""
    pass


class ItemSC(OrigemBase):
    """
    Modelo ORM para a tabela 'ITENSC' no banco de dados de Origem.
    Usado apenas para leitura.
    """
    __tablename__ = "ITENSC"
    __table_args__ = {'schema': 'public'}  # Especifica o schema 'public' se necessário

    # PK Composta (Mapeamento)
    numped: Mapped[int] = mapped_column("NUMPED", Integer, primary_key=True)
    item: Mapped[int] = mapped_column("ITEM", Integer, primary_key=True)

    # Campos de Mapeamento
    qtde: Mapped[float] = mapped_column("QTDE", Numeric(10, 3), nullable=True)
    peso: Mapped[float] = mapped_column("PESO", Numeric(8, 3), nullable=True)
    totkg: Mapped[float] = mapped_column("TOTKG", Numeric(10, 3), nullable=True)
    un: Mapped[Optional[str]] = mapped_column("UN", String(6), nullable=True)
    dtmovim: Mapped[Optional[date]] = mapped_column("DTMOVIM", Date, nullable=True)
    fantasia: Mapped[Optional[str]] = mapped_column("FANTASIA", String(30), nullable=True)
    descricao: Mapped[Optional[str]] = mapped_column("DESCRICAO", String(60), nullable=True)


class UnidadeProdutoSC(OrigemBase):
    """
    Modelo ORM para a tabela 'UNPROD' no banco de dados de Origem.
    Usado apenas para leitura.
    """
    __tablename__ = "UNPROD"
    __table_args__ = {'schema': 'public'}  # Especifica o schema 'public' se necessário

    # Mapeamento
    codigo: Mapped[int] = mapped_column("CODIGO", Integer, primary_key=True)  # CODIGO
    unidade: Mapped[str] = mapped_column("UN", String(6), primary_key=True)  # UN

    # Campos de Mapeamento
    qtde_kg: Mapped[Optional[float]] = mapped_column("QKG", Numeric(8, 3), nullable=True)  # QKG
    qtde_un: Mapped[Optional[float]] = mapped_column("QUN", Numeric(8, 3), nullable=True)  # QUN

    def __repr__(self) -> str:
        return f"UnidadeProdutoSC(codigo={self.codigo!r}, unidade={self.unidade!r})"


class ProdutoSC(OrigemBase):
    """
    Modelo de Origem para a tabela CADPROD (Produto - Sistema de Carga)
    """
    __tablename__ = "CADPROD"  # Nome da tabela no DB de Origem

    codigo: Mapped[int] = mapped_column(
        "CODIGO",
        Integer,
        primary_key=True,  # Assumindo que CODIGO é a chave primária
        nullable=False
    )
    descricao: Mapped[str] = mapped_column(
        "DESCRICAO",
        String(60),
        nullable=True
    )
    unc: Mapped[str] = mapped_column(
        "UNC",
        String(6),
        nullable=True
    )
    grupo: Mapped[str] = mapped_column(
        "GRUPO",
        String(20),
        nullable=True
    )


class FornecedorSC(OrigemBase):
    """
    Modelo ORM para a tabela 'CADFORN' no banco de dados de Origem.
    Representa o cadastro de fornecedores, transportadores e funcionários.
    """
    __tablename__ = "CADFORN"
    __table_args__ = {'schema': 'public'}

    # Chave Primária
    numero: Mapped[int] = mapped_column("NUMERO", Integer, primary_key=True)

    # Identificação Básica
    fantasia: Mapped[str] = mapped_column("FANTASIA", String(30), nullable=False)
    razsocial: Mapped[Optional[str]] = mapped_column("RAZSOCIAL", String(60), nullable=True)
    cgc: Mapped[Optional[str]] = mapped_column("CGC", String(16), nullable=True)
    insc: Mapped[Optional[str]] = mapped_column("INSC", String(16), nullable=True)

    # Endereço
    endr: Mapped[Optional[str]] = mapped_column("ENDR", String(50), nullable=True)
    bairro: Mapped[Optional[str]] = mapped_column("BAIRRO", String(20), nullable=True)
    mun: Mapped[Optional[str]] = mapped_column("MUN", String(20), nullable=True)
    cep: Mapped[Optional[str]] = mapped_column("CEP", String(9), nullable=True)
    uf: Mapped[Optional[str]] = mapped_column("UF", String(2), nullable=True)
    numendr: Mapped[Optional[str]] = mapped_column("NUMENDR", String(20), nullable=True)
    complr: Mapped[Optional[str]] = mapped_column("COMPLR", String(20), nullable=True)
    codmun: Mapped[Optional[str]] = mapped_column("CODMUN", String(7), nullable=True)

    # Contatos
    tel1: Mapped[Optional[str]] = mapped_column("TEL1", String(16), nullable=True)
    email: Mapped[Optional[str]] = mapped_column("EMAIL", String(100), nullable=True)
    wsite: Mapped[Optional[str]] = mapped_column("WSITE", String(100), nullable=True)
    contato: Mapped[Optional[str]] = mapped_column("CONTATO", String(100), nullable=True)

    # Outros
    obs: Mapped[Optional[str]] = mapped_column("OBS", String(150), nullable=True)
    placa: Mapped[Optional[str]] = mapped_column("PLACA", String(10), nullable=True)

    def __repr__(self) -> str:
        return f"<FornecedorSC(numero={self.numero}, fantasia='{self.fantasia}')>"
