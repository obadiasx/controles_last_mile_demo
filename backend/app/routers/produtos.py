# backend/app/routers/produtos.py
from typing import List, Tuple

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_origem_db_session, get_local_db_session
from backend.app.core.dependencies import get_produto_service
from backend.app.models.produtos import Produto as ProdutoModel
from backend.app.models.users import User
from backend.app.repositories.unidades import UnidadeProdutoCRUD
from backend.app.routers.deps import get_current_user, require_products_update_maximum_acceptable
from backend.app.schemas.produto_teto_preco import (
    TetoEfetivoResponse,
    TetoUnidadeLinha,
    TetosPrecoUnidadeReplace,
)
from backend.app.schemas.produtos import Produto
from backend.app.services.produtos import ProdutoService
from backend.app.services.teto_preco_produto import TetoPrecoProdutoService

router = APIRouter()

db_local_dependency = Depends(get_local_db_session)
db_origem_dependency = Depends(get_origem_db_session)


@router.get(
    "/{codigo}/teto-efetivo",
    response_model=TetoEfetivoResponse,
    summary=(
        "Teto por unidade: teto na unidade escolhida tem prioridade; senão, "
        "uma outra regra converte direto; duas ou mais outras usam o maior R$/kg."
    ),
)
async def obter_teto_efetivo_unidade(
    codigo: int,
    unidade: str = Query(..., min_length=1, max_length=6),
    db: AsyncSession = db_local_dependency,
    _user: User = Depends(get_current_user),
):
    prod = await db.get(ProdutoModel, codigo)
    if not prod:
        raise HTTPException(status_code=404, detail=f"Produto com código {codigo} não encontrado.")
    v = await TetoPrecoProdutoService.teto_efetivo_para_unidade(db, codigo, unidade)
    return TetoEfetivoResponse(unidade=unidade.strip(), valor_maximo_aceitavel=v)


@router.get(
    "/{codigo}/tetos-preco-unidade",
    response_model=List[TetoUnidadeLinha],
    summary="Lista unidades do produto com tetos (financeiro / leitura autenticada).",
)
async def listar_tetos_preco_por_unidade(
    codigo: int,
    db: AsyncSession = db_local_dependency,
    _user: User = Depends(get_current_user),
):
    try:
        return await TetoPrecoProdutoService.listar_tetos_para_edicao(db, codigo)
    except ValueError as e:
        if str(e) == "Produto não encontrado":
            raise HTTPException(status_code=404, detail="Produto não encontrado.") from e
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.put(
    "/{codigo}/tetos-preco-unidade",
    response_model=List[TetoUnidadeLinha],
    summary="Substitui os tetos por unidade (apenas unidades existentes no cadastro).",
)
async def substituir_tetos_preco_por_unidade(
    codigo: int,
    body: TetosPrecoUnidadeReplace,
    db: AsyncSession = db_local_dependency,
    _user: User = Depends(require_products_update_maximum_acceptable),
):
    prod = await db.get(ProdutoModel, codigo)
    if not prod:
        raise HTTPException(status_code=404, detail=f"Produto com código {codigo} não encontrado.")

    unidades_ok = {
        (u.unidade or "").strip()
        for u in await UnidadeProdutoCRUD.get_by_codigo(db, codigo)
    }
    pares: List[Tuple[str, float]] = []
    for t in body.tetos:
        u = (t.unidade or "").strip()
        if not u:
            continue
        if u not in unidades_ok:
            raise HTTPException(
                status_code=400,
                detail=f"Unidade «{u}» não existe para este produto. Sincronize unidades se necessário.",
            )
        if t.valor_maximo_aceitavel is None or float(t.valor_maximo_aceitavel) <= 0:
            continue
        pares.append((u, float(t.valor_maximo_aceitavel)))

    await TetoPrecoProdutoService.substituir_tetos(db, codigo, pares)
    return await TetoPrecoProdutoService.listar_tetos_para_edicao(db, codigo)


@router.get(
    "/search",
    response_model=List[Produto],
    summary="Busca Produtos por Descrição (Autocomplete)"
)
async def search_produtos_autocomplete(
        q: str = Query(..., min_length=2, max_length=50),
        limit: int = Query(10, gt=0, le=50),
        db_local: AsyncSession = Depends(get_local_db_session),
        produto_service: ProdutoService = Depends(get_produto_service)
):
    try:
        produtos = await produto_service.get_autocomplete_results(
            db_local=db_local,
            search_term=q,
            limit=limit
        )
        return produtos
    except Exception:
        # ... tratamento de erro
        raise HTTPException(status_code=500, detail="Erro interno ao realizar a busca de produtos.")
