from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class RoleCRUD:
    """
    Classe para operações CRUD relacionadas a Roles e Permissões.
    """

    @staticmethod
    async def get_roles_with_permission(db: AsyncSession, permission_name: str) -> list[str]:
        sql_query = text("""
            SELECT r.name
            FROM tb_role r
            JOIN tb_role_permission trp ON r.id = trp.role_id
            JOIN tb_permission tp ON tp.id = trp.permission_id
            WHERE tp.name = :permission_name
        """)
        result = await db.execute(sql_query, {"permission_name": permission_name})
        return [row[0] for row in result.fetchall()]

    @staticmethod
    async def check_role_permission(
            db: AsyncSession,
            role_id: UUID,
            permission_name: str
    ) -> bool:
        """
        Verifica se uma Role específica possui uma Permissão específica.
        Porque, se não existir, o usuário daquela role não terá permissão de acesso
        """
        sql_query = text("""
            SELECT 1 
            FROM tb_role_permission trp
            JOIN tb_permission tp ON tp.id = trp.permission_id
            WHERE trp.role_id = :role_id AND tp.name = :permission_name
        """)

        result = await db.execute(
            sql_query,
            {
                "role_id": role_id,
                "permission_name": permission_name
            }
        )

        # Se houver pelo menos um resultado (1), a permissão existe, retorna True.
        return result.scalar_one_or_none() is not None
