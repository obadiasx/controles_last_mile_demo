from fastapi import Depends
from backend.app.repositories.produtos import ProdutoCRUD
from backend.app.services.produtos import ProdutoService
from backend.app.repositories.solicitacoes_dia import SolicitacaoDiaCRUD
from backend.app.services.solicitacoes_dia import SolicitacaoDiaService

# Instancia o Repositório, que será usado pelo Service
PRODUTO_REPO = ProdutoCRUD()


def get_produto_service():
    """Dependência para injetar o ProdutoService nos endpoints."""
    # O service é instanciado com a dependência do repositório
    return ProdutoService(produto_repo=PRODUTO_REPO)


# async def get_produto_repo():
#     """Gerencia a instância do Repositório de Produto."""
#     yield ProdutoCRUD()

async def get_solicitacao_dia_repo():
    yield SolicitacaoDiaCRUD


async def get_solicitacao_dia_service(
        repo: SolicitacaoDiaCRUD = Depends(get_solicitacao_dia_repo)
):
    yield SolicitacaoDiaService(repo)
