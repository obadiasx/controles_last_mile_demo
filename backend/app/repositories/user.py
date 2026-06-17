import logging
from typing import Optional, List
from uuid import UUID

from sqlalchemy import select, update, delete, or_, func
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.models.roles import Role

# Certifique-se de que essas classes de exceção estão definidas
from backend.app.core.exceptions import DatabaseException, ConflictException, NotFoundException
from backend.app.models.users import User
from backend.app.schemas.users import UserCreate, UserUpdate
from backend.app.services.auth import PasswordManager

logger = logging.getLogger(__name__)


class UserCRUD:
    """Operações CRUD para o modelo User"""

    @staticmethod
    async def _obter_uuid_role_por_identificador(db: AsyncSession, identificador: str) -> UUID:
        """
        Consulta a tabela tb_role para obter o UUID de uma role,
        se o identificador for um nome (string).
        """
        try:
            # 1. Tenta converter a string diretamente para UUID (caso o dado já seja um UUID)
            return UUID(identificador)
        except ValueError:
            # 2. Se não for um UUID, assume que é o NOME da role (ex: "administrador")
            # Consulta o banco de dados
            stmt = select(Role.id).filter(Role.name == identificador.lower())
            result = await db.execute(stmt)
            role_uuid = result.scalar_one_or_none()

            if role_uuid is None:
                raise NotFoundException(f"Perfil com o nome/id '{identificador}' não encontrado no banco de dados.")

            return role_uuid

    @staticmethod
    async def create_user(db: AsyncSession, user_data: UserCreate) -> User:
        """Cria um novo usuário com senha criptografada, convertendo nomes de roles para UUIDs via consulta ao DB"""
        try:
            hashed_password = PasswordManager.hash_password(user_data.password)

            role_name_input = user_data.role_name

            if role_name_input is None:
                raise ValueError("O nome da função (role_name) é obrigatório, mas não foi fornecido.")

            # O _obter_uuid_role_por_identificador deve procurar pelo 'name' na tabela tb_role
            role_id_real = await UserCRUD._obter_uuid_role_por_identificador(db, role_name_input)

            if role_id_real is None:
                # Retorna uma exceção clara se o nome da role não for encontrado no DB
                raise NotFoundException(f"O perfil (role) com nome '{role_name_input}' não existe.")

            db_user = User(
                username=user_data.username,
                name_full=user_data.name_full,
                email=user_data.email,
                hashed_password=hashed_password,
                enabled=user_data.enabled,
                role_id=role_id_real,
                first_access=user_data.first_access
            )

            db.add(db_user)
            await db.commit()
            await db.refresh(db_user)
            logger.info(f"Usuário criado com sucesso: {db_user.username}")
            return db_user

        except IntegrityError as e:
            await db.rollback()
            logger.error(f"Erro de integridade ao criar usuário: {str(e)}")
            error_msg = str(e).lower()
            if "tb_user_role_id_fkey" in error_msg:
                # Erro de chave estrangeira (o erro original do usuário)
                raise ConflictException("Falha na criação do usuário: O ID do perfil especificado não existe.")
            elif "username" in error_msg and "unique" in error_msg:
                raise ConflictException("Nome de usuário já existe")
            elif "email" in error_msg and "unique" in error_msg:
                raise ConflictException("Email já cadastrado")
            else:
                raise ConflictException("Falha na criação do usuário devido a conflito de dados")

        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Erro de banco de dados ao criar usuário: {str(e)}")
            raise DatabaseException("Falha ao criar usuário")

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: UUID) -> Optional[User]:
        """Obtém usuário por ID"""
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_id_with_role(db: AsyncSession, user_id: UUID) -> Optional[User]:
        """
        Busca um usuário pelo seu ID, carregando a relação 'role' na mesma consulta
        para evitar N+1 e permitir a checagem de role_name no deps.py.
        """
        stmt = (
            select(User)
            .options(selectinload(User.role))
            .where(User.id == user_id)
        )
        result = await db.execute(stmt)
        # Retorna o objeto User, que agora tem o atributo 'role_id' carregado.
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
        """Obtém usuário por nome de usuário"""
        result = await db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
        """Obtém usuário por email"""
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_username_or_email(db: AsyncSession, identifier: str) -> Optional[User]:
        """Obtém usuário por nome de usuário ou email, carregando suas permissões."""
        stmt = (
            select(User)
            .options(
                selectinload(User.role).selectinload(Role.permissions)
            )
            .where(
                (User.username == identifier) | (User.email == identifier)
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_all_users(db: AsyncSession, search: str = ''):
        query = select(User).order_by(User.created_at.desc())

        if search:
            search_lower = f"%{search.lower()}%"
            query = query.where(
                or_(
                    func.lower(User.username).like(search_lower),
                    func.lower(User.name_full).like(search_lower),
                    func.lower(User.email).like(search_lower),
                )
            )

        result = await db.execute(query)
        users = result.scalars().all()

        return users

    @staticmethod
    async def get_all_roles(db: AsyncSession) -> List[dict]:
        """Obtém todos os roles (id e nome) disponíveis no sistema"""
        stmt = select(Role.id, Role.name)
        result = await db.execute(stmt)
        roles = result.all()

        return [{"id": r.id, "name": r.name} for r in roles]

    @staticmethod
    async def update_user(db: AsyncSession, user_id: UUID, user_data: UserUpdate) -> Optional[User]:
        """Atualiza dados do usuário"""
        try:
            if hasattr(user_data, "model_dump"):
                update_data = user_data.model_dump(exclude_unset=True)
            else:
                update_data = user_data

            # Criptografa a senha se ela estiver sendo atualizada
            if "password" in update_data and update_data["password"]:
                update_data["hashed_password"] = PasswordManager.hash_password(update_data.pop("password"))
            else:
                update_data.pop("password", None)  # remove do dict para não atualizar

            # Se role_id estiver sendo atualizado e for uma string (nome), resolve para UUID
            if "role_id" in update_data and isinstance(update_data["role_id"], str):
                update_data["role_id"] = await UserCRUD._obter_uuid_role_por_identificador(db, update_data["role_id"])

            if not update_data:
                return await UserCRUD.get_user_by_id(db, user_id)

            await db.execute(
                update(User).where(User.id == user_id).values(**update_data)
            )
            await db.commit()

            updated_user = await UserCRUD.get_user_by_id(db, user_id)
            if updated_user:
                logger.info(f"Usuário atualizado com sucesso: {updated_user.username}")
            return updated_user

        except IntegrityError as e:
            await db.rollback()
            logger.error(f"Erro de integridade ao atualizar usuário {user_id}: {str(e)}")
            error_msg = str(e).lower()
            if "username" in error_msg and "unique" in error_msg:
                raise ConflictException("Nome de usuário já existe")
            elif "email" in error_msg and "unique" in error_msg:
                raise ConflictException("Email já cadastrado")
            else:
                raise ConflictException("Falha na atualização do usuário devido a conflito de dados")

        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Erro de banco de dados ao atualizar usuário {user_id}: {str(e)}")
            raise DatabaseException("Falha ao atualizar usuário")

        except Exception as e:
            await db.rollback()
            logger.error(f"Erro inesperado ao atualizar usuário {user_id}: {str(e)}")
            raise DatabaseException("Ocorreu um erro inesperado ao atualizar o usuário")

    @staticmethod
    async def delete_user(db: AsyncSession, user_id: UUID) -> bool:
        """Exclui um usuário"""
        try:
            result = await db.execute(delete(User).where(User.id == user_id))
            await db.commit()

            if result.rowcount > 0:
                logger.info(f"Usuário excluído com sucesso: {user_id}")
                return True
            else:
                logger.warning(f"Usuário não encontrado para exclusão: {user_id}")
                return False

        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Erro de banco de dados ao excluir usuário {user_id}: {str(e)}")
            raise DatabaseException("Falha ao excluir usuário")

        except Exception as e:
            await db.rollback()
            logger.error(f"Erro inesperado ao excluir usuário {user_id}: {str(e)}")
            raise DatabaseException("Ocorreu um erro inesperado ao excluir o usuário")

    @staticmethod
    async def authenticate_user(db: AsyncSession, username: str, password: str) -> Optional[User]:
        """Autentica usuário com nome de usuário/email e senha"""
        user = await UserCRUD.get_user_by_username_or_email(db, username)
        if not user:
            return None

        if not PasswordManager.verify_password(password, user.hashed_password):
            return None

        if not user.enabled:
            return None

        return user

    @staticmethod
    async def user_exists(db: AsyncSession, username: str = None, email: str = None) -> bool:
        """Verifica se o usuário existe por nome de usuário ou email"""
        if username:
            user = await UserCRUD.get_user_by_username(db, username)
            if user:
                return True

        if email:
            user = await UserCRUD.get_user_by_email(db, email)
            if user:
                return True

        return False

    @staticmethod
    async def change_password(db: AsyncSession, user_id: UUID, current_password: str, new_password: str) -> bool:
        """Altera a senha do usuário"""
        user = await UserCRUD.get_user_by_id(db, user_id)
        if not user:
            return False

        # Verifica a senha atual
        if not PasswordManager.verify_password(current_password, user.hashed_password):
            return False

        # Criptografa e atualiza a nova senha
        hashed_new_password = PasswordManager.hash_password(new_password)
        await db.execute(
            update(User).where(User.id == user_id).values(hashed_password=hashed_new_password)
        )
        await db.commit()
        return True

async def get_active_buyers(db: AsyncSession) -> List[User]:
    """
    Retorna a lista de usuários ativos que possuem o papel 'comprador'.
    """
    # Consulta que junta User com Role para filtrar pelo nome do papel e se o usuário está ativo
    stmt = (
        select(User)
        .join(Role, User.role_id == Role.id)
        .where(
            Role.name == "comprador",
            User.enabled == True
        )
    )
    result = await db.execute(stmt)
    return result.scalars().all()