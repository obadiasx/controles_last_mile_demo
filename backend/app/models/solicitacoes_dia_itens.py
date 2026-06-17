import uuid
from typing import Optional

from sqlalchemy import ForeignKey, Numeric, Boolean, String, ForeignKeyConstraint, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.core.database import Base
from backend.app.models.unidades import UnidadeProduto


class SolicitacaoDiaItem(Base):
    __tablename__ = "solicitacoes_dia_itens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    solicitacao_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("solicitacoes_dia.id", ondelete="CASCADE"))
    produto_codigo: Mapped[int] = mapped_column(Integer, nullable=False)

    quantidade: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    unidade: Mapped[str] = mapped_column(String(6), nullable=False)

    # Valores e Regras de Negócio
    valor_unitario: Mapped[float] = mapped_column(Numeric(10, 2), nullable=True)
    valor_maximo_aceitavel: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    valor_liberado: Mapped[bool] = mapped_column(Boolean, default=False)

    # Status e Rastreabilidade
    comprado: Mapped[bool] = mapped_column(Boolean, default=False)
    fornecedor_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("fornecedores.id"), nullable=True)

    # Dados da transação efetiva
    quantidade_adquirida: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    unidade_comprada: Mapped[Optional[str]] = mapped_column(String(6), nullable=True)
    valor_total_pago: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)

    # Informações de Pagamento
    observacao: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    forma_pagamento: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    forma_pagamento_ref_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("formas_pagamento.id", ondelete="SET NULL"),
        nullable=True,
    )

    # --- Configuração da ForeignKey Composta ---
    __table_args__ = (
        ForeignKeyConstraint(
            ['produto_codigo', 'unidade'],
            ['unidades_produto.codigo', 'unidades_produto.unidade'],
            name="fk_solicitacao_item_unidade"
        ),
    )

    # Relacionamentos
    solicitacao = relationship("SolicitacaoDia", backref="itens")
    produto = relationship(
        "Produto",
        foreign_keys=[produto_codigo],
        primaryjoin="SolicitacaoDiaItem.produto_codigo == Produto.codigo",
        lazy="joined"
    )
    fornecedor = relationship("Fornecedor")
    forma_pagamento_ref = relationship("FormaPagamento", foreign_keys=[forma_pagamento_ref_id])
    unidade_info: Mapped["UnidadeProduto"] = relationship(
        "UnidadeProduto",
        foreign_keys=[produto_codigo, unidade],
        primaryjoin="and_(SolicitacaoDiaItem.produto_codigo == UnidadeProduto.codigo, "
                    "SolicitacaoDiaItem.unidade == UnidadeProduto.unidade)",
        overlaps="produto"
    )

    # --- Regra de Negócio: Cálculo de Peso Total ---
    @property
    def peso_total_calculado(self) -> float:
        """
        Calcula o peso total multiplicando a quantidade pedida pelo fator de conversão (qtde_kg).
        Ex: Pediu 2 CAIXAS, cada CAIXA tem 5kg -> Retorna 10kg.
        """
        if self.unidade_info and self.unidade_info.qtde_kg:
            return float(self.quantidade) * float(self.unidade_info.qtde_kg)
        return 0.0
