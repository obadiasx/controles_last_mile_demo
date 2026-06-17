from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from fastapi import Body

from backend.app.core.database import get_local_db_session
from ..models.users import User
from ..schemas.users import (
    UserCreate, UserUpdate, UserResponse, UserLogin,
    UserAuthResponse, PasswordChange, PermissionResponse, BuyerResponse
)
from ..repositories.user import UserCRUD, get_active_buyers
from ..services.auth import TokenManager
# from ..routers.deps import get_current_user, require_admin, require_financial
from ..routers.deps import (
    get_current_user,
    require_list_all_users,
    require_list_all_roles,
    require_view_user,
    require_update_user_data,
    require_delete_user_data,
    require_list_active_buyers
)
router = APIRouter()


@router.post("/login", response_model=UserAuthResponse)
async def login_user(
        login_data: UserLogin,
        db: AsyncSession = Depends(get_local_db_session)
):
    """Autentica o usuário e retorna o token de acesso"""

    # Autentica o usuário
    user = await UserCRUD.authenticate_user(db, login_data.username, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nome de usuário ou senha incorretos"
        )

    # Cria o token de acesso
    access_token = TokenManager.create_token_for_user(
        user_id=user.id,
        username=user.username,
        role=user.role_id
    )

    return UserAuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=user
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
        user_data: UserCreate,
        db: AsyncSession = Depends(get_local_db_session)
):
    """Registra um novo usuário"""

    # Verifica se o usuário já existe
    if await UserCRUD.user_exists(db, user_data.username, user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nome de usuário ou e-mail já registrado"
        )

    # Cria o usuário
    user = await UserCRUD.create_user(db, user_data)
    return user


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
        current_user: User = Depends(get_current_user)
):
    """Obtém informações do usuário atual"""
    base = UserResponse.model_validate(current_user, from_attributes=True)
    role_nm = (
        current_user.role.name
        if getattr(current_user, "role", None) is not None
        else None
    )
    return base.model_copy(update={"role_name": role_nm})


@router.put("/me", response_model=UserResponse)
async def update_current_user(
        user_data: UserUpdate = Body(
            ...,
            openapi_examples={
                "padrao": {
                    "summary": "Exemplo de atualização",
                    "value": {
                        "name_full": "John Smith",
                        "email": "john.smith@example.com",
                        "enabled": True,
                        "role_id": "admin",
                        "password": "",
                    },
                }
            },
        ),
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_local_db_session)
):
    """Atualiza informações do usuário atual"""

    # Não permite alterar nome de usuário ou e-mail se eles já existirem para outro usuário
    if user_data.username and user_data.username != current_user.username:
        if await UserCRUD.user_exists(db, username=user_data.username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nome de usuário já em uso"
            )

    if user_data.email and user_data.email != current_user.email:
        if await UserCRUD.user_exists(db, email=user_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="E-mail já registrado"
            )

    # Atualiza o usuário
    updated_user = await UserCRUD.update_user(db, current_user.id, user_data)
    return updated_user


@router.post("/me/change-password")
async def change_password(
        password_data: PasswordChange,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_local_db_session)
):
    """Altera a senha do usuário atual"""

    success = await UserCRUD.change_password(
        db,
        current_user.id,
        password_data.current_password,
        password_data.new_password
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A senha atual está incorreta"
        )

    return {"message": "Senha alterada com sucesso"}


# Endpoints apenas para administradores
@router.get("/", response_model=List[UserResponse])
async def get_all_users(
        search: str = '',
        _current_user: User = Depends(require_list_all_users),
        db: AsyncSession = Depends(get_local_db_session)
):
    print("🚀 Entrou no get_all_users - search =", search)
    users = await UserCRUD.get_all_users(db, search=search)
    print("✅ Saiu do get_all_users com", len(users), "usuários")
    return users


@router.get("/roles", response_model=List[PermissionResponse])
async def get_all_roles(
        _current_user: User = Depends(require_list_all_roles),
        db: AsyncSession = Depends(get_local_db_session)):
    """Obtém todas as permissões disponíveis (apenas administrador)"""
    roles = await UserCRUD.get_all_roles(db)
    return roles


@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(
        user_id: UUID,
        _current_user: User = Depends(require_view_user),
        db: AsyncSession = Depends(get_local_db_session)
):
    """Obtém usuário por ID (apenas administrador)"""
    user = await UserCRUD.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user_by_id(
        user_id: UUID,
        user_data: UserUpdate = Body(
            ...,
            openapi_examples={
                "padrao": {
                    "summary": "Exemplo de atualização",
                    "value": {
                        "name_full": "John Smith",
                        "email": "john.smith@example.com",
                        "enabled": True,
                        "role_id": "admin",
                        "password": "",
                    },
                }
            },
        ),
        _current_user: User = Depends(require_update_user_data),
        db: AsyncSession = Depends(get_local_db_session)
):
    """Atualiza usuário por ID (apenas administrador)"""

    # Verifica se o usuário existe
    user = await UserCRUD.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )

    # Não permite alterar nome de usuário ou e-mail se eles já existirem para outro usuário
    if user_data.username and user_data.username != user.username:
        if await UserCRUD.user_exists(db, username=user_data.username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nome de usuário já em uso"
            )

    if user_data.email and user_data.email != user.email:
        if await UserCRUD.user_exists(db, email=user_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="E-mail já registrado"
            )

    # Atualiza o usuário
    updated_user = await UserCRUD.update_user(db, user_id, user_data)
    return updated_user


@router.delete("/{user_id}")
async def delete_user(
        user_id: UUID,
        current_user: User = Depends(require_delete_user_data),
        db: AsyncSession = Depends(get_local_db_session)
):
    """Exclui usuário por ID (apenas administrador)"""

    # Impede que o administrador exclua sua própria conta
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível excluir sua própria conta"
        )

    success = await UserCRUD.delete_user(db, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )

    return {"message": "Usuário excluído com sucesso"}


@router.get(
    "/buyers/active",
    response_model=List[BuyerResponse],
    summary="Obter a lista de compradores ativos",
)
async def read_active_buyers(
        _current_user: User = Depends(require_list_active_buyers),
        db: AsyncSession = Depends(get_local_db_session)  # Usando o seu dependency loader: get_local_db_session
):
    """
    Retorna uma lista de todos os usuários com o papel 'comprador' e estão ativos.
    Acesso restrito a administradores.
    """
    # A exceção para erros de DB será lançada diretamente pelo repository
    buyers = await get_active_buyers(db)
    return buyers
