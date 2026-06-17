import uuid
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_local_db_session
from backend.app.models.users import User
from backend.app.routers.deps import (
    get_current_user,
    require_create_daily_solicitation,
    require_update_daily_buy,
    require_read_daily_buy_or_ceagesp,
)
from backend.app.schemas.solicitacoes_dia import (
    EnviarPedidoFornecedorEmailIn,
    EnviarPedidoFornecedorEmailOut,
    PedidoDiretoConcluirIn,
    PedidoDiretoConcluirOut,
    SolicitacaoDiaDeleteOut,
    SolicitacaoDiaCreate,
    SolicitacaoDiaUpdate,
    SolicitacaoDia,
)
from backend.app.services.solicitacoes_dia import SolicitacaoDiaService
from backend.app.services.solicitacoes_email_fornecedor import (
    enviar_pedido_fornecedor_por_email,
)
from backend.app.services.solicitacoes_pedido_direto import (
    concluir_pedido_direto_fornecedor,
)
from backend.app.core.dependencies import get_solicitacao_dia_service
from backend.app.repositories.solicitacoes_dia import SolicitacaoDiaCRUD

router = APIRouter(prefix="", tags=["Solicitações do Dia"])

db_local_dependency = Depends(get_local_db_session)
sol_service_dependency = Depends(get_solicitacao_dia_service)


@router.post(
    "/",
    response_model=SolicitacaoDia,
    status_code=status.HTTP_201_CREATED,
    summary="Cria uma nova Solicitação do Dia para Lista de Compras."
)
async def criar_solicitacao_dia(
        sol_in: SolicitacaoDiaCreate,
        _current_user: User = Depends(require_create_daily_solicitation),
        db_local: AsyncSession = db_local_dependency,
        solicitacao_service: SolicitacaoDiaService = sol_service_dependency
):
    """
    Cria uma nova Solicitação do Dia (Missão de Compra).
    Aplica as regras:
    1. Unicidade: (data + comprador_id) deve ser único.
    2. Data: Deve ser igual ou posterior ao dia atual.
    """
    try:
        nova_solicitacao = await solicitacao_service.create_solicitacao(db_local, sol_in)
        return nova_solicitacao
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno ao criar Solicitação do Dia: {str(e)}"
        )


@router.get(
    "/",
    response_model=List[SolicitacaoDia],  # Retorna uma lista de SolicitacaoDia
    summary="Lista Solicitações do Dia por data e, opcionalmente, Comprador."
)
async def listar_solicitacoes_dia(
        data: date = Query(
            ...,
            description="Data da compra. Formato: YYYY-MM-DD",
            examples=["2025-12-25"],
        ),
        comprador_id: Optional[uuid.UUID] = Query(
            None,
            description="UUID opcional do Comprador. Se omitido, lista todas as solicitações da data."
        ),
        # Financeiro (ler) ou comprador no CEAGESP (sem acesso à tela Solicitações do Dia)
        _current_user: User = Depends(require_read_daily_buy_or_ceagesp),
        db_local: AsyncSession = db_local_dependency,
):
    """
    Busca Solicitações do Dia (Missões de Compra) com base na data obrigatória.
    Se o `comprador_id` for fornecido, filtra para aquele comprador específico.
    """
    try:
        # Chama a função criada no repositório
        solicitacoes = await SolicitacaoDiaCRUD.get_by_date_and_optional_comprador(
            db_local, data=data, comprador_id=comprador_id
        )

        # O FastAPI já serializa a lista automaticamente no response_model=List[SolicitacaoDia]
        return solicitacoes

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno ao listar Solicitações do Dia: {str(e)}"
        )


# Rota para SALVAR (Criação)

# Rota para UPDATE (Alteração)
@router.patch(
    "/{solicitacao_id}",
    response_model=SolicitacaoDia,
    summary="Atualiza Observações de uma Solicitação do Dia."
)
async def atualizar_observacoes_solicitacao_dia(
        solicitacao_id: uuid.UUID,
        sol_update: SolicitacaoDiaUpdate,
        _current_user: User = Depends(require_update_daily_buy),  # Garante que apenas Otniel/Admin possa alterar
        db_local: AsyncSession = db_local_dependency,
        solicitacao_service: SolicitacaoDiaService = sol_service_dependency
):
    """
    Atualiza as Observações Gerais de uma Solicitação do Dia existente.
    Apenas o campo 'observacoes' pode ser alterado (Data e Comprador são a chave lógica e são imutáveis).
    """
    try:
        solicitacao_atualizada = await solicitacao_service.update_solicitacao(
            db_local, solicitacao_id, sol_update
        )
        return solicitacao_atualizada
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno ao atualizar Solicitação do Dia: {str(e)}"
        )


@router.delete(
    "/{solicitacao_id}",
    response_model=SolicitacaoDiaDeleteOut,
    summary="Exclui uma Solicitação do Dia (cabeçalho + itens não comprados).",
)
async def excluir_solicitacao_dia(
    solicitacao_id: uuid.UUID,
    _current_user: User = Depends(require_update_daily_buy),
    db_local: AsyncSession = db_local_dependency,
    solicitacao_service: SolicitacaoDiaService = sol_service_dependency,
):
    itens_excluidos = await solicitacao_service.delete_solicitacao(db_local, solicitacao_id)
    return SolicitacaoDiaDeleteOut(
        solicitacao_id=solicitacao_id,
        itens_excluidos=itens_excluidos,
        mensagem="Solicitação excluída com sucesso.",
    )


@router.post(
    "/{solicitacao_id}/enviar-email-fornecedor",
    response_model=EnviarPedidoFornecedorEmailOut,
    summary="Envia pedido de compra por e-mail direto ao fornecedor.",
)
async def enviar_email_direto_para_fornecedor(
    solicitacao_id: uuid.UUID,
    payload: EnviarPedidoFornecedorEmailIn,
    _current_user_permission: User = Depends(require_update_daily_buy),
    current_user: User = Depends(get_current_user),
    db_local: AsyncSession = db_local_dependency,
):
    return await enviar_pedido_fornecedor_por_email(
        db=db_local,
        solicitacao_id=solicitacao_id,
        fornecedor_id=payload.fornecedor_id,
        observacao=payload.observacao,
        current_user=current_user,
    )


@router.post(
    "/{solicitacao_id}/pedido-direto/concluir",
    response_model=PedidoDiretoConcluirOut,
    summary="Pedido direto: envia e-mail ao fornecedor e registra compra (fila SIDI / conferência).",
)
async def pedido_direto_concluir(
    solicitacao_id: uuid.UUID,
    payload: PedidoDiretoConcluirIn,
    _current_user_permission: User = Depends(require_update_daily_buy),
    current_user: User = Depends(get_current_user),
    db_local: AsyncSession = db_local_dependency,
):
    return await concluir_pedido_direto_fornecedor(
        db=db_local,
        solicitacao_id=solicitacao_id,
        fornecedor_id=payload.fornecedor_id,
        observacao=payload.observacao,
        current_user=current_user,
    )
