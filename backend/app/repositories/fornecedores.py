from datetime import datetime, timedelta
from sqlalchemy import update as sql_update, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload

from backend.app.models.origem import FornecedorSC
from backend.app.models.fornecedores import Fornecedor


class FornecedorCRUD:
    @staticmethod
    async def sync_from_origem(db_local: AsyncSession, db_origem: AsyncSession) -> dict:
        """
        Sincroniza dados da tabela CADFORN (Origem) para fornecedores (Local).
        Regra: Sincroniza se a última atualização local foi há mais de 1 dia ou tabela vazia.
        """

        # 1. 🔍 Verificação da Janela de Tempo (1 dia)
        limite_tempo = datetime.now() - timedelta(days=1)
        max_update_query = select(func.max(Fornecedor.data_atualizacao))
        max_update_result = await db_local.execute(max_update_query)
        max_data_local = max_update_result.scalar_one_or_none()

        should_sync = False
        if max_data_local is None:
            should_sync = True
            data_ultima_sync_str = "Tabela Local Vazia"
        else:
            data_ultima_sync_str = max_data_local.isoformat()
            if max_data_local.replace(tzinfo=None) < limite_tempo:
                should_sync = True

        if not should_sync:
            return {
                "status": "Ignorado",
                "total_processado": 0,
                "data_ultima_atualizacao_local": data_ultima_sync_str,
                "motivo": f"Sincronização recente ({data_ultima_sync_str}). Aguarde o limite de 1 dia."
            }

        # 2. 🗃️ Buscar dados na Origem
        origem_query = select(FornecedorSC)
        origem_result = await db_origem.execute(origem_query)
        fornecedores_origem = origem_result.scalars().all()

        counts = {"processados": 0, "inseridos": 0, "atualizados": 0}

        # 3. Processar De/Para
        for forn_sc in fornecedores_origem:
            counts["processados"] += 1

            existing_query = select(Fornecedor).where(Fornecedor.id == forn_sc.numero)
            result = await db_local.execute(existing_query)
            db_forn = result.scalar_one_or_none()

            # Mapeamento de campos Origem (numero, fantasia...) -> Local (id, fantasia...)
            data_to_sync = {
                "fantasia": forn_sc.fantasia,
                "razsocial": forn_sc.razsocial,
                "cgc": forn_sc.cgc,
                "insc": forn_sc.insc,
                "endr": forn_sc.endr,
                "bairro": forn_sc.bairro,
                "mun": forn_sc.mun,
                "cep": forn_sc.cep,
                "uf": forn_sc.uf,
                "numendr": forn_sc.numendr,
                "box_complemento": forn_sc.complr,
                "codmun": forn_sc.codmun,
                "tel1": forn_sc.tel1,
                "email": forn_sc.email,
                "wsite": forn_sc.wsite,
                "obs": forn_sc.obs,
                "placa": forn_sc.placa,
                "contato": forn_sc.contato,
            }

            if db_forn:
                update_stmt = (
                    sql_update(Fornecedor)
                    .where(Fornecedor.id == forn_sc.numero)
                    .values(**data_to_sync)
                )
                await db_local.execute(update_stmt)
                counts["atualizados"] += 1
            else:
                new_forn = Fornecedor(
                    id=forn_sc.numero,
                    **data_to_sync
                )
                db_local.add(new_forn)
                counts["inseridos"] += 1

        await db_local.commit()

        return {
            "status": "Sincronizado",
            "total_encontrado_origem": len(fornecedores_origem),
            "total_processado": counts["processados"],
            "total_inserido": counts["inseridos"],
            "total_atualizado": counts["atualizados"]
        }

    @staticmethod
    async def search_autocomplete(
            db: AsyncSession,
            search_term: str,
            limit: int = 10
    ) -> list[Fornecedor]:
        """
        Busca fornecedores por nome fantasia usando busca parcial (LIKE).
        """
        query = (
            select(Fornecedor)
            .where(Fornecedor.fantasia.ilike(f"%{search_term}%"))
            .options(joinedload(Fornecedor.forma_pagamento_padrao))
            .order_by(Fornecedor.fantasia)
            .limit(limit)
        )
        result = await db.execute(query)
        return list(result.unique().scalars().all())

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        fornecedor_id: int,
    ) -> Fornecedor | None:
        stmt = (
            select(Fornecedor)
            .where(Fornecedor.id == fornecedor_id)
            .options(joinedload(Fornecedor.forma_pagamento_padrao))
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()