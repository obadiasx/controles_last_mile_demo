import logging

from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError, DBAPIError
from sqlalchemy.orm import selectinload

from backend.app.core.database import local_engine, async_local_session_maker, Base
from backend.app.repositories.user import UserCRUD
from backend.app.schemas.users import UserCreate
from backend.app.models.roles import Role, Permission
from .data_loader import load_role_assignments

logger = logging.getLogger(__name__)

roles_to_create = [
    ("administrador", "Papel com permissões totais sobre o sistema."),
    ("financeiro", "Papel responsável por gerenciar dados financeiros."),
    ("conferente", "Papel responsável por conferir estoques e pedidos."),
    ("comprador", "Papel responsável por gerenciar a aquisição de produtos e negociar com fornecedores."),
]

# role_assignment = [
#     ('usuarios:listarUsuarios', 'Listagem de usuários', 'administrador'),
#     ('usuarios:redefinirSenha', 'Redefinição de senha', 'administrador'),
#     ('usuarios:redefinirSenha', 'Redefinição de senha', 'financeiro'),
#     ('conferencia:atualizacao', 'Atualizar recebimento de pedido', 'conferente'),
#     ('conferencia:atualizacao', 'Atualizar recebimento de pedido', 'administrador'),
# ]
role_assignment_data = load_role_assignments()


async def seed_formas_pagamento():
    """
    Insere o catálogo inicial de formas de pagamento (4 famílias: pix, dinheiro, boleto N dias, cartão).
    Só executa se a tabela estiver vazia.
    """
    from backend.app.models.forma_pagamento import FormaPagamento

    async with async_local_session_maker() as db:
        r = await db.execute(select(FormaPagamento).limit(1))
        if r.scalar_one_or_none() is not None:
            return
        rows = [
            FormaPagamento(tipo="pix", descricao="PIX", dias_prazo=0, ativo=True),
            FormaPagamento(tipo="dinheiro", descricao="Dinheiro", dias_prazo=0, ativo=True),
            FormaPagamento(tipo="boleto", descricao="Boleto - à vista", dias_prazo=0, ativo=True),
            FormaPagamento(tipo="boleto", descricao="Boleto - 10 dias", dias_prazo=10, ativo=True),
            FormaPagamento(tipo="boleto", descricao="Boleto - 20 dias", dias_prazo=20, ativo=True),
            FormaPagamento(tipo="boleto", descricao="Boleto - 30 dias", dias_prazo=30, ativo=True),
            FormaPagamento(tipo="boleto", descricao="Boleto - 40 dias", dias_prazo=40, ativo=True),
            FormaPagamento(
                tipo="cartao",
                descricao="Cartão de crédito ****1000",
                dias_prazo=0,
                codigo_cartao_4="1000",
                ativo=True,
            ),
            FormaPagamento(
                tipo="cartao",
                descricao="Cartão de crédito ****2000",
                dias_prazo=0,
                codigo_cartao_4="2000",
                ativo=True,
            ),
        ]
        for row in rows:
            db.add(row)
        await db.commit()
    logger.info("Catálogo formas_pagamento semeado.")


async def create_tables():
    """
    Cria todas as tabelas no banco de dados que herdam da classe Base.
    Se tabelas/constraints já existirem (ex.: banco pré-populado), ignora o erro e continua.
    """
    import backend.app.models  # noqa: F401 — garante registro de todos os modelos em Base.metadata

    logger.info("Tentando criar tabelas no banco de dados...")
    try:
        async with local_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Criação de tabelas concluída.")
    except DBAPIError as e:
        err_msg = (str(e.orig) if e.orig else "") + " " + str(e)
        if "already exists" in err_msg.lower():
            logger.info(
                "Tabelas ou constraints já existem no banco (schema pré-existente). "
                "Continuando a inicialização..."
            )
        else:
            raise


async def create_admin_user():
    """Create a default admin user"""
    print("Criando usuário admin padrão...")

    async with async_local_session_maker() as db:
        # Check if admin user already exists
        existing_admin = await UserCRUD.get_user_by_username(db, "admin")
        if existing_admin:
            print("✅ O usuário admin já existe!")
            return

        # Create admin user
        admin_data = UserCreate(
            username="admin",
            name_full="Administrador do sistema",
            email="admin@example.com",
            password="admin123",
            enabled=True,
            role_id="administrador"
        )

        admin_user = await UserCRUD.create_user(db, admin_data)
        print(f"✅ Usuário admin criado com sucesso!")
        print(f"   Nome de usuário: {admin_user.username}")
        print(f"   Email: {admin_user.email}")
        print(f"   Papel: {admin_user.role_id}")
        print("   ⚠️  Por favor, altere a senha padrão na produção!")


async def initialize_default_roles():
    """
    Cria as roles padrão se elas não existirem e retorna a role 'administrador'.
    """
    print("Criando roles padrão...")
    admin_role = None

    async with async_local_session_maker() as db:
        for name, description in roles_to_create:
            # 1. Checa se a role já existe
            stmt = select(Role).filter_by(name=name)
            result = await db.execute(stmt)
            existing_role = result.scalar_one_or_none()

            if existing_role:
                print(f"✅ Role '{name}' já existe.")
                if name == "administrador":
                    admin_role = existing_role
                continue

            # 2. Cria a role
            try:
                role_obj = Role(name=name, description=description)

                db.add(role_obj)
                await db.flush()  # Força a obtenção do ID (UUID) gerado automaticamente

                print(f"➕ Role '{name}' criada com sucesso! ID: {role_obj.id}")
                if name == "administrador":
                    admin_role = role_obj

            except IntegrityError as e:
                await db.rollback()
                print(f"⚠️ Erro de integridade ao criar a role '{name}': {e}")

        # 3. Confirma todas as inserções no banco
        await db.commit()

        # Garante que temos a Role Admin se ela foi criada ou encontrada
        if admin_role is None:
            stmt = select(Role).filter_by(name="administrador")
            result = await db.execute(stmt)
            admin_role = result.scalar_one_or_none()

    return admin_role


async def assign_permissions_to_roles():
    """
    Cria as permissões (se não existirem) e as atribui às roles correspondentes.
    """
    print("Atribuindo permissões padrão às roles...")

    # 1. Carrega os dados do arquivo JSON (ou use a variável role_assignment_data carregada no topo)
    # Aqui, usaremos a variável já carregada:
    # role_assignment_data = load_role_assignments()  # Ou use a variável global já carregada

    async with async_local_session_maker() as db:
        for item in role_assignment_data:  # Itera sobre os objetos do JSON
            permission_name = item['name']
            permission_description = item['description']
            roles_to_assign = item['roles']  # É uma lista de nomes de roles

            # 2. Encontrar ou Criar a Permissão
            stmt_perm = select(Permission).filter_by(name=permission_name)
            # ... (Lógica para encontrar ou criar permission_obj permanece a mesma) ...
            result_perm = await db.execute(stmt_perm)
            permission_obj = result_perm.scalar_one_or_none()

            # Lógica de criação de permissão (idem ao original)
            if not permission_obj:
                # ... (criação e flush da permission_obj) ...
                try:
                    permission_obj = Permission(name=permission_name, description=permission_description)
                    db.add(permission_obj)
                    await db.flush()
                    print(f"  ➕ Permissão '{permission_name}' criada.")
                except IntegrityError:
                    await db.rollback()
                    result_perm = await db.execute(stmt_perm)
                    permission_obj = result_perm.scalar_one_or_none()
                    if not permission_obj:
                        logger.error(f"Falha fatal ao obter ou criar a permissão: {permission_name}")
                        continue

            # 3. Atribuir a Permissão a CADA Role na lista
            for role_name in roles_to_assign:
                # Encontrar a Role (carregando suas permissões)
                stmt_role = select(Role).filter_by(name=role_name).options(selectinload(Role.permissions))
                result_role = await db.execute(stmt_role)
                role_obj = result_role.scalar_one_or_none()

                if not role_obj:
                    print(f"  ⚠️ Role '{role_name}' não encontrada. Pulando atribuição para esta role.")
                    continue

                # Atribuir Permissão à Role (se não estiver já atribuída)
                if permission_obj not in role_obj.permissions:
                    role_obj.permissions.append(permission_obj)
                    print(f"  🔗 Atribuída permissão '{permission_name}' à role '{role_name}'.")
                # else: pass

        # 4. Confirma todas as inserções/associações
        await db.commit()
    print("✅ Atribuição de permissões concluída.")

# async def assign_permissions_to_roles():
#     """
#     Cria as permissões (se não existirem) e as atribui às roles correspondentes.
#     """
#     print("Atribuindo permissões padrão às roles...")
#     async with async_local_session_maker() as db:
#         for permission_name, permission_description, role_name in role_assignment_data:
#
#             # 1. Encontrar ou Criar a Permissão
#             stmt_perm = select(Permission).filter_by(name=permission_name)
#             result_perm = await db.execute(stmt_perm)
#             permission_obj = result_perm.scalar_one_or_none()
#
#             if not permission_obj:
#                 try:
#                     permission_obj = Permission(name=permission_name, description=permission_description)
#                     db.add(permission_obj)
#                     await db.flush()  # Garante que o ID (UUID) é gerado antes de usar
#                     print(f"   ➕ Permissão '{permission_name}' criada.")
#                 except IntegrityError:
#                     await db.rollback()
#                     # Tenta buscar novamente em caso de concorrência (race condition)
#                     result_perm = await db.execute(stmt_perm)
#                     permission_obj = result_perm.scalar_one_or_none()
#                     if not permission_obj:
#                         logger.error(f"Falha fatal ao obter ou criar a permissão: {permission_name}")
#                         continue
#
#             # 2. Encontrar a Role (carregando suas permissões para checagem)
#             # O .options(selectinload(Role.permissions)) evita N+1 queries.
#             stmt_role = select(Role).filter_by(name=role_name).options(selectinload(Role.permissions))
#             result_role = await db.execute(stmt_role)
#             role_obj = result_role.scalar_one_or_none()
#
#             if not role_obj:
#                 print(f"   ⚠️ Role '{role_name}' não encontrada. Pulando atribuição de permissão.")
#                 continue
#
#             # 3. Atribuir Permissão à Role (se não estiver já atribuída)
#             # O SQLAlchemy gerencia a inserção em tb_role_permission via ORM
#             if permission_obj not in role_obj.permissions:
#                 role_obj.permissions.append(permission_obj)
#                 print(f"   🔗 Atribuída permissão '{permission_name}' à role '{role_name}'.")
#             else:
#                 # Caso a permissão já exista na role, não faz nada
#                 pass
#
#         # 4. Confirma todas as inserções/associações de uma vez
#         await db.commit()
#     print("✅ Atribuição de permissões concluída.")
