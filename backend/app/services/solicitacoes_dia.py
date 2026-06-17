import uuid
from datetime import date
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select, func, delete

from backend.app.repositories.solicitacoes_dia import SolicitacaoDiaCRUD
from backend.app.schemas.solicitacoes_dia import SolicitacaoDiaCreate, SolicitacaoDiaUpdate, SolicitacaoDia
from backend.app.models.solicitacoes_dia import SolicitacaoDia as SolicitacaoDiaModel
from backend.app.models.solicitacoes_dia_itens import SolicitacaoDiaItem


class SolicitacaoDiaService:
    """
    Camada de serviço responsável pela lógica de negócio das Solicitações do Dia.
    """

    def __init__(self, solicitacao_repo: SolicitacaoDiaCRUD):
        self.solicitacao_repo = solicitacao_repo

    async def create_solicitacao(
            self, db: AsyncSession, sol_in: SolicitacaoDiaCreate
    ) -> SolicitacaoDiaModel:
        """
        Cria uma nova solicitação do dia, aplicando a regra de unicidade.
        """
        # Regra de Negócio 1: Verificar unicidade (data + comprador)
        if not sol_in.permitir_multiplas_no_dia:
            existing_sol = await self.solicitacao_repo.get_by_date_and_optional_comprador(
                db, data=sol_in.data, comprador_id=sol_in.comprador_id
            )

            if existing_sol:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Já existe uma Solicitação do Dia para a data {sol_in.data.strftime('%Y-%m-%d')} e Comprador {sol_in.comprador_id}."
                )

        try:
            # A regra de não aceitar datas anteriores já foi checada no Schema (SolicitacaoDiaCreate)
            return await self.solicitacao_repo.create(db, sol_in)
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Erro de integridade. Verifique se o Comprador ID é válido."
            )

    async def update_solicitacao(
            self, db: AsyncSession, sol_id: uuid.UUID, sol_update: SolicitacaoDiaUpdate
    ) -> SolicitacaoDiaModel:
        """
        Atualiza as observações da solicitação, garantindo que data e comprador não mudem.
        """
        solicitacao = await self.solicitacao_repo.get_by_id(db, sol_id)

        if not solicitacao:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Solicitação do Dia com ID {sol_id} não encontrada."
            )

        # O Repositório (update) já garante que apenas observações serão alteradas (Regra 2)
        return await self.solicitacao_repo.update(db, solicitacao, sol_update)

    async def delete_solicitacao(
            self, db: AsyncSession, sol_id: uuid.UUID
    ) -> int:
        """
        Exclui a solicitação inteira (cabeçalho + itens por cascade), desde que
        ainda não exista item comprado.
        Retorna a quantidade de itens vinculados removidos.
        """
        solicitacao = await self.solicitacao_repo.get_by_id(db, sol_id)
        if not solicitacao:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Solicitação do Dia com ID {sol_id} não encontrada."
            )

        qtd_itens = await db.scalar(
            select(func.count(SolicitacaoDiaItem.id)).where(
                SolicitacaoDiaItem.solicitacao_id == sol_id
            )
        )
        qtd_itens = int(qtd_itens or 0)

        existe_item_comprado = await db.scalar(
            select(func.count(SolicitacaoDiaItem.id)).where(
                SolicitacaoDiaItem.solicitacao_id == sol_id,
                SolicitacaoDiaItem.comprado.is_(True),
            )
        )
        if int(existe_item_comprado or 0) > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Esta solicitação já possui item(ns) comprado(s) e não pode ser excluída por inteiro."
                ),
            )

        # Remove itens explicitamente antes do cabeçalho para evitar tentativa do ORM
        # de setar FK como NULL (solicitacao_id é NOT NULL).
        await db.execute(
            delete(SolicitacaoDiaItem).where(
                SolicitacaoDiaItem.solicitacao_id == sol_id
            )
        )
        await self.solicitacao_repo.delete(db, solicitacao)
        return qtd_itens