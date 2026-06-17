from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_origem_db_session, get_local_db_session
from backend.app.repositories.unidades import UnidadeProdutoCRUD
from backend.app.schemas.unidades import UnidadeProduto as UnidadeProdutoSchema

router = APIRouter()

db_local_dependency = Depends(get_local_db_session)
db_origem_dependency = Depends(get_origem_db_session)


@router.get(
    "/{codigo}",
    response_model=List[UnidadeProdutoSchema],
    summary="Busca unidades por código do produto",
)
async def listar_unidades_por_codigo(
        codigo: int,
        db_local: AsyncSession = db_local_dependency
):
    """
    Retorna uma lista de todas as configurações de unidade (ex: UN, KG, CX)
    vinculadas a um determinado código de produto no banco local.
    """
    unidades = await UnidadeProdutoCRUD.get_by_codigo(db_local, codigo)

    if not unidades:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nenhuma unidade encontrada para o produto com código {codigo}."
        )

    return unidades
