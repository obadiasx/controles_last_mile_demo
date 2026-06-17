from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from backend.app.core.database import get_local_db_session
from backend.app.models.users import User
from backend.app.repositories.user import UserCRUD
from backend.app.repositories.roles import RoleCRUD
from backend.app.services.auth import TokenManager
from backend.app.services.conferencia_financeiro_auth import pode_decidir_financeiro

# Security scheme
security = HTTPBearer()


# --- Funções de Autenticação (get_current_user) ---

async def get_current_user(
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: AsyncSession = Depends(get_local_db_session)
) -> User:
    """Obtém o usuário autenticado atual a partir do token JWT"""

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Verifique o token
    payload = TokenManager.verify_token(credentials.credentials)
    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")

    if user_id is None:
        raise credentials_exception

    # Obter usuário do banco de dados
    try:
        # ATENÇÃO: É VITAL que esta função do CRUD carregue a Role (com seu NOME)
        # junto com o usuário (ex: usando selectinload) para que 'user.role.name' funcione.
        user = await UserCRUD.get_user_by_id_with_role(db, UUID(user_id))
    except ValueError:  # Caso o user_id não seja um UUID válido
        raise credentials_exception

    if user is None:
        raise credentials_exception

    if not user.enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A conta do usuário está desabilitada"
        )

    # Adicionando uma checagem de segurança e para evitar erros de atributo
    if not hasattr(user, 'role') or user.role is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro de configuração: A role do usuário não foi carregada corretamente."
        )

    return user


# --- Funções de Autorização (Baseadas em Role e Permissão) ---

def require_roles(*roles: str):
    """Factory de dependência para controle de acesso baseado em roles"""

    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        # Checa o NOME da Role (current_user.role.name) contra os nomes requeridos.
        # Isso resolve o problema de usar UUIDs desconhecidos.
        current_role_name = current_user.role.name

        if current_role_name not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permissões insuficientes. Roles requeridas: {', '.join(roles)}"
            )
        return current_user

    return role_checker


def require_permission(permission_name: str):
    """
    Factory de dependência para controle de acesso baseado em permissão.
    Checa se a role do usuário atual possui a permissão com o nome especificado.
    """

    async def permission_checker(
            current_user: User = Depends(get_current_user),
            db: AsyncSession = Depends(get_local_db_session)
    ) -> User:
        """
        Checa se o usuário atual possui a permissão necessária.
        Lança HTTPException 403 caso não possua.
        """

        # 1. Regra de Ouro: Administrador sempre tem permissão.
        if current_user.role.name == "administrador":
            return current_user

        # 2. Checa se a role do usuário tem a permissão (A checagem de DB)
        has_permission = await RoleCRUD.check_role_permission(
            db,
            role_id=current_user.role.id,
            permission_name=permission_name  # Usa a variável da factory
        )

        # 3. Se não tem permissão (e não é Administrador), lança 403.
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Permissão '{permission_name}' não concedida ao usuário. "
                    f"Role do usuário: '{current_user.role.name}'"
                ),
            )

        return current_user

    return permission_checker


def require_any_permission(*permission_names: str):
    """
    Autoriza se o usuário tiver ao menos uma das permissões listadas.
    Administrador continua com acesso total (mesma regra de require_permission).
    """

    async def permission_checker(
            current_user: User = Depends(get_current_user),
            db: AsyncSession = Depends(get_local_db_session)
    ) -> User:
        if current_user.role.name == "administrador":
            return current_user
        for name in permission_names:
            if await RoleCRUD.check_role_permission(
                    db,
                    role_id=current_user.role.id,
                    permission_name=name,
            ):
                return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Requer ao menos uma das permissões: {', '.join(permission_names)}"
            ),
        )

    return permission_checker


# Leitura de solicitações do dia: tela financeira (ler) ou fluxo CEAGESP (comprador)
require_read_daily_buy_or_ceagesp = require_any_permission(
    "solicitacoes_dia:ler",
    "ceagesp:acessar",
)

# Listagem de itens da solicitação: edição na tela financeira ou consumo no CEAGESP
require_list_solicitacao_itens_or_ceagesp = require_any_permission(
    "solicitacoes_dia:atualizar",
    "ceagesp:acessar",
)


# Dependências baseadas em permissão
require_list_users = require_permission("usuarios:listarUsuarios")
require_reset_password = require_permission("usuarios:redefinirSenha")
require_list_all_users = require_permission("usuarios:listarTodos")
require_list_all_roles = require_permission("usuarios:listarRoles")
require_view_user = require_permission("usuarios:visualizar")
require_update_user_data = require_permission("usuarios:atualizar")
require_delete_user_data = require_permission("usuarios:excluir")
require_list_active_buyers = require_permission("comprador:listarAtivos")
require_sync_and_update = require_permission("conferencia:atualizacao")
require_list_conference_items = require_permission("conferencia:listar_pedidos")
require_view_conference_details = require_permission("conferencia:visualizar_detalhes")
require_list_divergences = require_permission("conferencia:listar_divergencias")
async def require_finance_decision(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_local_db_session),
) -> User:
    if pode_decidir_financeiro(
        current_user.role.name,
        lambda: False,
    ):
        return current_user
    has_permission = await RoleCRUD.check_role_permission(
        db,
        role_id=current_user.role.id,
        permission_name="solicitacoes_dia:atualizar",
    )
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Permissão 'solicitacoes_dia:atualizar' não concedida ao usuário. "
                f"Role do usuário: '{current_user.role.name}'"
            ),
        )
    return current_user
require_create_daily_solicitation = require_permission("solicitacoes_dia:criar")
require_update_daily_buy = require_permission("solicitacoes_dia:atualizar")
require_delete_daily_buy = require_permission("solicitacoes_dia:excluir")
require_read_daily_buy = require_permission("solicitacoes_dia:ler")
require_ceagesp_access = require_permission("ceagesp:acessar")
require_products_update_maximum_acceptable = require_permission("produtos:atualiza_maximo_aceitavel")
require_update_supplier = require_permission("fornecedores:atualizar")
require_cancelar_compra = require_permission("compras:cancelar")