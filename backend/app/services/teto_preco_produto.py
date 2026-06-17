from __future__ import annotations

from typing import Dict, List

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.produto_teto_preco_unidade import ProdutoTetoPrecoUnidade
from backend.app.models.produtos import Produto
from backend.app.models.unidades import UnidadeProduto
from backend.app.repositories.unidades import UnidadeProdutoCRUD
from backend.app.schemas.produto_teto_preco import TetoUnidadeLinha


def calcular_teto_efetivo_por_unidade(
    unidade_alvo: str,
    valores_por_unidade: Dict[str, float],
    kg_por_unidade: Dict[str, float],
) -> float:
    """
    - Se existir valor máximo cadastrado **para a unidade escolhida**, usa **somente** esse valor.
    - Se **não** houver teto na unidade escolhida:
      - **Uma** outra unidade com teto: converte pela taxa R$/kg dessa regra (sem comparar máximo).
      - **Duas ou mais** outras unidades com teto: usa o **maior** R$/kg entre elas e converte para a unidade alvo.
    - Requer fator kg na unidade alvo e na(s) regra(s) usada(s) para conversão; senão, 0.
    """
    u_target = (unidade_alvo or "").strip()
    if not u_target:
        return 0.0

    vals: Dict[str, float] = {}
    for k, v in valores_por_unidade.items():
        uk = (k or "").strip()
        if not uk:
            continue
        try:
            fv = float(v)
        except (TypeError, ValueError):
            continue
        if fv > 0:
            vals[uk] = fv

    if u_target in vals:
        return vals[u_target]

    outras_com_teto = [u for u in vals if u != u_target]
    if not outras_com_teto:
        return 0.0

    kg_target = float(kg_por_unidade.get(u_target) or 0.0)
    if kg_target <= 0:
        return 0.0

    # Exatamente uma outra unidade com teto: assume essa regra (conversão direta).
    if len(outras_com_teto) == 1:
        u_o = outras_com_teto[0]
        kg_o = float(kg_por_unidade.get(u_o) or 0.0)
        if kg_o <= 0:
            return 0.0
        return (vals[u_o] / kg_o) * kg_target

    # Duas ou mais outras unidades com teto: maior R$/kg entre elas.
    per_kg_de_outras: List[float] = []
    for u in outras_com_teto:
        kg_u = float(kg_por_unidade.get(u) or 0.0)
        if kg_u > 0:
            per_kg_de_outras.append(vals[u] / kg_u)

    if not per_kg_de_outras:
        return 0.0

    return max(per_kg_de_outras) * kg_target


class TetoPrecoProdutoService:
    @staticmethod
    async def _carregar_kg_por_unidade(
        db: AsyncSession, codigo_produto: int
    ) -> Dict[str, float]:
        stmt = select(UnidadeProduto).where(UnidadeProduto.codigo == codigo_produto)
        res = await db.execute(stmt)
        rows = res.scalars().all()
        out: Dict[str, float] = {}
        for r in rows:
            u = (r.unidade or "").strip()
            if not u:
                continue
            q = r.qtde_kg
            if q is not None and float(q) > 0:
                out[u] = float(q)
        return out

    @staticmethod
    async def _mapa_valores_teto(
        db: AsyncSession, codigo_produto: int
    ) -> Dict[str, float]:
        stmt = select(ProdutoTetoPrecoUnidade).where(
            ProdutoTetoPrecoUnidade.codigo_produto == codigo_produto
        )
        res = await db.execute(stmt)
        out: Dict[str, float] = {}
        for t in res.scalars().all():
            u = (t.unidade or "").strip()
            if not u:
                continue
            v = float(t.valor_maximo_aceitavel)
            if v > 0:
                out[u] = v
        return out

    @staticmethod
    async def teto_efetivo_para_unidade(
        db: AsyncSession, codigo_produto: int, unidade_alvo: str
    ) -> float:
        produto = await db.get(Produto, codigo_produto)
        if not produto:
            return 0.0

        valores = await TetoPrecoProdutoService._mapa_valores_teto(db, codigo_produto)
        kg_map = await TetoPrecoProdutoService._carregar_kg_por_unidade(db, codigo_produto)
        return calcular_teto_efetivo_por_unidade(unidade_alvo, valores, kg_map)

    @staticmethod
    async def substituir_tetos(
        db: AsyncSession,
        codigo_produto: int,
        tetos: List[tuple[str, float]],
    ) -> None:
        await db.execute(
            delete(ProdutoTetoPrecoUnidade).where(
                ProdutoTetoPrecoUnidade.codigo_produto == codigo_produto
            )
        )
        for unidade, valor in tetos:
            u = (unidade or "").strip()
            if not u:
                continue
            if valor is None or float(valor) <= 0:
                continue
            db.add(
                ProdutoTetoPrecoUnidade(
                    codigo_produto=codigo_produto,
                    unidade=u[:6],
                    valor_maximo_aceitavel=round(float(valor), 2),
                )
            )
        await db.commit()

    @staticmethod
    async def listar_tetos_para_edicao(
        db: AsyncSession, codigo_produto: int
    ) -> List[TetoUnidadeLinha]:
        produto = await db.get(Produto, codigo_produto)
        if not produto:
            raise ValueError("Produto não encontrado")

        unidades = await UnidadeProdutoCRUD.get_by_codigo(db, codigo_produto)
        tetos_rows = await TetoPrecoProdutoService._mapa_valores_teto(db, codigo_produto)

        linhas: List[TetoUnidadeLinha] = []
        for u in sorted(unidades, key=lambda x: (x.unidade or "")):
            un = (u.unidade or "").strip()
            if not un:
                continue
            qk = u.qtde_kg
            qk_f = float(qk) if qk is not None and float(qk) > 0 else None
            val = tetos_rows.get(un)
            linhas.append(
                TetoUnidadeLinha(
                    unidade=un,
                    qtde_kg=qk_f,
                    valor_maximo_aceitavel=val,
                )
            )
        return linhas
