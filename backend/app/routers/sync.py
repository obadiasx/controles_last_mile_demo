from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_origem_db_session, get_local_db_session
from backend.app.repositories.produtos import ProdutoCRUD
from backend.app.repositories.unidades import UnidadeProdutoCRUD
from backend.app.routers.deps import get_current_user
from backend.app.repositories.fornecedores import FornecedorCRUD

router = APIRouter(prefix="/sync", tags=["Sincronização de Dados"])


@router.post("/produtos", summary="Sincroniza catálogo de produtos")
async def sincronizar_produtos(
        db_local: AsyncSession = Depends(get_local_db_session),
        db_origem: AsyncSession = Depends(get_origem_db_session),
        _user=Depends(get_current_user)
):
    return await ProdutoCRUD.sync_from_origem(db_local, db_origem)


@router.post("/unidades", summary="Sincroniza unidades de medida")
async def sincronizar_unidades(
        db_local: AsyncSession = Depends(get_local_db_session),
        db_origem: AsyncSession = Depends(get_origem_db_session),
        _user=Depends(get_current_user)
):
    return await UnidadeProdutoCRUD.sync_from_origem(db_local, db_origem)


@router.post("/fornecedores", summary="Sincroniza cadastro de fornecedores")
async def sincronizar_fornecedores(
        db_local: AsyncSession = Depends(get_local_db_session),
        db_origem: AsyncSession = Depends(get_origem_db_session),
        _user=Depends(get_current_user)
):
    return await FornecedorCRUD.sync_from_origem(db_local, db_origem)
