import uuid
from datetime import date
from typing import Optional, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.solicitacoes_dia import SolicitacaoDia
from backend.app.schemas.solicitacoes_dia import SolicitacaoDiaCreate, SolicitacaoDiaUpdate


class SolicitacaoDiaCRUD:

    @staticmethod
    async def create(
            db: AsyncSession, sol_in: SolicitacaoDiaCreate
    ) -> SolicitacaoDia:
        """
        Cria uma nova Solicitação do Dia.
        As regras de data e unicidade são verificadas na Camada Service.
        """
        # Cria a instância do modelo a partir do Pydantic
        db_solicitacao = SolicitacaoDia(
            **sol_in.model_dump(exclude={"permitir_multiplas_no_dia"})
        )

        db.add(db_solicitacao)
        await db.commit()
        await db.refresh(db_solicitacao)
        return db_solicitacao

    @staticmethod
    async def get_by_id(db: AsyncSession, sol_id: uuid.UUID) -> Optional[SolicitacaoDia]:
        """Busca uma SolicitaçãoDia pelo ID."""
        stmt = select(SolicitacaoDia).where(SolicitacaoDia.id == sol_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def update(
            db: AsyncSession,
            solicitacao: SolicitacaoDia,
            sol_update: SolicitacaoDiaUpdate
    ) -> SolicitacaoDia:
        """
        Atualiza as observações de uma SolicitaçãoDia existente.
        Assume que a checagem de existência e permissão foi feita.
        """
        update_data = sol_update.model_dump(exclude_unset=True)

        # Apenas 'observacoes' deve ser passível de alteração (Regra 2)
        if 'observacoes' in update_data:
            solicitacao.observacoes = update_data['observacoes']

        await db.commit()
        await db.refresh(solicitacao)
        return solicitacao

    @staticmethod
    async def get_by_date_and_optional_comprador(
            db: AsyncSession,
            data: date,
            comprador_id: Optional[uuid.UUID] = None
    ) -> Sequence[SolicitacaoDia]:
        """
        Busca solicitações pela data e, opcionalmente, pelo comprador_id.
        """
        stmt = select(SolicitacaoDia).where(SolicitacaoDia.data == data)

        if comprador_id:
            stmt = stmt.where(SolicitacaoDia.comprador_id == comprador_id)

        result = await db.execute(stmt)
        return result.scalars().all()  # Retorna uma lista

    @staticmethod
    async def delete(db: AsyncSession, solicitacao: SolicitacaoDia) -> None:
        """Exclui uma solicitação do dia."""
        await db.delete(solicitacao)
        await db.commit()
