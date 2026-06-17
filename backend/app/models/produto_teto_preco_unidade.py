from sqlalchemy import ForeignKey, Integer, Numeric, PrimaryKeyConstraint, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.core.database import Base


class ProdutoTetoPrecoUnidade(Base):
    """
    Valor máximo aceitável por produto e unidade (opcional por unidade).
    """

    __tablename__ = "produtos_teto_preco_unidade"
    __table_args__ = (
        PrimaryKeyConstraint("codigo_produto", "unidade", name="pk_produtos_teto_preco_unidade"),
    )

    codigo_produto: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("produtos.codigo", ondelete="CASCADE"),
        nullable=False,
    )
    unidade: Mapped[str] = mapped_column(String(6), nullable=False)
    valor_maximo_aceitavel: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
