from datetime import datetime, timedelta

from sqlalchemy import update as sql_update, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.app.models.origem import UnidadeProdutoSC  # Modelo de Origem
from backend.app.models.unidades import UnidadeProduto  # Modelo Local


class UnidadeProdutoCRUD:
    """
    Classe de Repositório (CRUD) para a entidade UnidadeProduto.
    """

    @staticmethod
    async def sync_from_origem(db_local: AsyncSession, db_origem: AsyncSession) -> dict:
        """
        Sincroniza dados da tabela UNPROD (Origem) para unidades_produto (Local).
        A sincronização só ocorre se a tabela local estiver vazia OU
        se o último registro atualizado tiver sido há mais de 1 dia.
        """

        # 1. 🔍 Verificação da Última Atualização Local
        # Calcula o limite de tempo: agora - 1 dia
        limite_tempo = datetime.now() - timedelta(days=1)

        # Seleciona a data_atualizacao máxima da tabela local
        max_update_query = select(func.max(UnidadeProduto.data_atualizacao))
        max_update_result = await db_local.execute(max_update_query)
        max_data_atualizacao = max_update_result.scalar_one_or_none()

        should_sync = False

        # Regra 1: Tabela local vazia (1a carga)
        if max_data_atualizacao is None:
            should_sync = True
        # Regra 2: Última atualização há mais de 1 dia
        elif max_data_atualizacao.replace(tzinfo=None) < limite_tempo:  # remove tzinfo para comparação direta
            should_sync = True

        if not should_sync:
            return {
                "status": "Ignorado",
                "motivo": f"Última sincronização em {max_data_atualizacao.isoformat()} está dentro do limite de 1 dia."
            }

        # 2. 🗃️ Realizar SELECT no Banco de Dados de Origem
        # Seleciona todos os dados de ORIGEM.
        origem_query = select(
            UnidadeProdutoSC.codigo,
            UnidadeProdutoSC.unidade,
            UnidadeProdutoSC.qtde_kg,
            UnidadeProdutoSC.qtde_un
        )
        origem_result = await db_origem.execute(origem_query)
        itens_origem = origem_result.all()

        itens_processados_count = 0
        itens_inseridos_count = 0
        itens_atualizados_count = 0

        # 3. Processar e Inserir/Atualizar
        for item_origem in itens_origem:
            itens_processados_count += 1

            # Checa se o item já existe na tabela local
            existing_item_query = select(UnidadeProduto).filter(
                (UnidadeProduto.codigo == item_origem.codigo) &
                (UnidadeProduto.unidade == item_origem.unidade)
            )
            existing_item = await db_local.execute(existing_item_query)
            db_item = existing_item.scalar_one_or_none()

            update_data = {
                "qtde_kg": item_origem.qtde_kg if item_origem.qtde_kg is not None else 0.0,
                "qtde_un": item_origem.qtde_un if item_origem.qtde_un is not None else 0.0,
            }

            if db_item:
                # Se existe: Atualiza
                update_stmt = (
                    sql_update(UnidadeProduto)
                    .where(
                        (UnidadeProduto.codigo == item_origem.codigo) &
                        (UnidadeProduto.unidade == item_origem.unidade)
                    )
                    .values(**update_data)
                )
                await db_local.execute(update_stmt)
                itens_atualizados_count += 1
            else:
                # Se não existe: Insere
                new_item = UnidadeProduto(
                    codigo=item_origem.codigo,
                    unidade=item_origem.unidade,
                    **update_data
                )
                db_local.add(new_item)
                itens_inseridos_count += 1

        await db_local.commit()

        return {
            "status": "Sincronizado",
            "total_encontrado_origem": len(itens_origem),
            "total_processado": itens_processados_count,
            "total_inserido": itens_inseridos_count,
            "total_atualizado": itens_atualizados_count,
            "data_ultima_atualizacao_local": max_data_atualizacao.isoformat() if max_data_atualizacao else "N/A"
        }

    @staticmethod
    async def get_by_codigo(db: AsyncSession, codigo: int) -> list[UnidadeProduto]:
        """
        Busca todas as unidades cadastradas para um código de produto específico.
        """
        query = select(UnidadeProduto).where(UnidadeProduto.codigo == codigo)
        result = await db.execute(query)
        return list(result.scalars().all())
