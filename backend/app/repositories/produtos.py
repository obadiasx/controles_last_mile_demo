from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import update as sql_update, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import not_

from backend.app.models.origem import ProdutoSC  # Modelo de Origem
from backend.app.models.produtos import Produto  # Modelo Local


class ProdutoCRUD:
    """
    Classe de Repositório (CRUD) para a entidade Produto.
    """

    @staticmethod
    async def sync_from_origem(db_local: AsyncSession, db_origem: AsyncSession) -> dict:
        """
        Sincroniza dados da tabela CADPROD (Origem) para produtos (Local).
        Regra: Sincroniza se o último update local tiver sido há mais de 1 dia ou se a tabela estiver vazia.
        """

        # 1. 🔍 Verificação da Última Atualização Local
        limite_tempo = datetime.now() - timedelta(days=1)

        max_update_query = select(func.max(Produto.data_atualizacao))
        max_update_result = await db_local.execute(max_update_query)
        max_data_atualizacao_local = max_update_result.scalar_one_or_none()

        should_sync = False
        "N/A"

        if max_data_atualizacao_local is None:
            should_sync = True
            data_ultima_sync_str = "Tabela Local Vazia"
        else:
            data_ultima_sync_str = max_data_atualizacao_local.isoformat()
            if max_data_atualizacao_local.replace(tzinfo=None) < limite_tempo:
                should_sync = True

        if not should_sync:
            return {
                "status": "Ignorado",
                "total_encontrado_origem": 0,
                "total_processado": 0,
                "total_inserido": 0,
                "total_atualizado": 0,
                "data_ultima_atualizacao_local": data_ultima_sync_str,
                "motivo": f"Última sincronização em {data_ultima_sync_str} está dentro do limite de 1 dia."
            }

        # 2. 🗃️ Realizar SELECT no Banco de Dados de Origem
        origem_query = select(
            ProdutoSC.codigo,
            ProdutoSC.descricao,
            ProdutoSC.unc,
            ProdutoSC.grupo,
        ).where(
            not_(ProdutoSC.grupo.startswith('PROC '))
        )
        origem_result = await db_origem.execute(origem_query)
        itens_origem = origem_result.all()

        itens_processados_count = 0
        itens_inseridos_count = 0
        itens_atualizados_count = 0

        # 3. Processar e Inserir/Atualizar
        for item_origem in itens_origem:
            itens_processados_count += 1

            existing_item_query = select(Produto).filter(
                Produto.codigo == item_origem.codigo
            )
            existing_item = await db_local.execute(existing_item_query)
            db_item = existing_item.scalar_one_or_none()

            data_to_sync = {
                "descricao": item_origem.descricao,
                "unidade_compra": item_origem.unc,
                "grupo_produto": item_origem.grupo,
            }

            if db_item:
                # Se existe: atualiza dados de catálogo vindos da origem
                update_stmt = (
                    sql_update(Produto)
                    .where(Produto.codigo == item_origem.codigo)
                    .values(**data_to_sync)
                )
                await db_local.execute(update_stmt)
                itens_atualizados_count += 1
            else:
                # Se não existe: Insere com valores do CADPROD
                new_item = Produto(
                    codigo=item_origem.codigo,
                    **data_to_sync
                )
                db_local.add(new_item)
                itens_inseridos_count += 1

        await db_local.commit()

        # Recalcula a data da última atualização para a resposta
        max_update_query_after_sync = select(func.max(Produto.data_atualizacao))
        max_update_result_after_sync = await db_local.execute(max_update_query_after_sync)
        max_data_atualizacao_local_after_sync = max_update_result_after_sync.scalar_one_or_none()

        return {
            "status": "Sincronizado",
            "total_encontrado_origem": len(itens_origem),
            "total_processado": itens_processados_count,
            "total_inserido": itens_inseridos_count,
            "total_atualizado": itens_atualizados_count,
            "data_ultima_atualizacao_local":
                max_data_atualizacao_local_after_sync.isoformat() if max_data_atualizacao_local_after_sync else "N/A"
        }

    @staticmethod
    async def search_produtos(db_local: AsyncSession, search_term: str, limit: int = 15) -> list[Produto]:
        """
        Busca produtos cuja descrição contenha o termo de busca (case-insensitive)
        e limita o número de resultados.
        """
        if not search_term:
            return []

        # 1. Trata o termo de busca para a pesquisa LIKE
        # Normaliza para minúsculas e adiciona wildcards (%)
        search_pattern = f"%{search_term.lower()}%"

        # 2. Cria a query: busca na coluna descricao (usando func.lower e like)
        query = select(Produto).where(
            func.lower(Produto.descricao).like(search_pattern)
        ).limit(limit)

        result = await db_local.execute(query)
        # Retorna os objetos Produto
        return result.scalars().all()