from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

# Importa o repositório
from backend.app.repositories.produtos import ProdutoCRUD
# Importa o modelo de Produto para tipagem
from backend.app.models.produtos import Produto


class ProdutoService:
    """
    Camada de serviço responsável pela lógica de negócio dos produtos.
    """

    # O service precisa do repositório
    def __init__(self, produto_repo: ProdutoCRUD):
        self.produto_repo = produto_repo

    async def get_autocomplete_results(
            self,
            db_local: AsyncSession,
            search_term: str,
            limit: int
    ) -> List[Produto]:
        # Chama o repositório para a busca
        produtos = await self.produto_repo.search_produtos(
            db_local=db_local,
            search_term=search_term,
            limit=limit
        )

        return produtos
