from typing import Annotated

from fastapi import Header, HTTPException, status

# Importe o TokenManager da sua nova classe de serviço
from backend.app.services.auth import TokenManager


# ... (outras dependências, como get_db_session, se aplicável)

async def get_current_user_id(
        authorization: Annotated[str, Header(..., description="Token JWT no formato 'Bearer <token>'")],
) -> str:
    """
    Verifica a autenticação JWT usando a lógica do TokenManager.
    Retorna o 'user_id' do payload.
    """

    # 1. Checagem básica do formato (Bearer token)
    if not authorization or not authorization.startswith("Bearer "):
        # Erro 401: Token ausente ou formato incorreto (falha de autenticação)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token JWT ausente ou mal formatado."
        )

    # 2. Extrai o token
    token = authorization.split(" ")[1]

    # 3. VALIDAÇÃO REAL usando a classe TokenManager
    payload = TokenManager.verify_token(token, is_refresh=False)

    # 4. Verifica se a validação falhou (expiração, assinatura inválida, etc.)
    if payload is None:
        # Erro 403: Token inválido (assinatura, expiração) ou acesso proibido
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso não autorizado ou token inválido."
        )

    # 5. Extrai o ID do payload (ajuste a chave conforme seu payload)
    # Se o seu login usa 'create_tokens_for_user', a chave será 'user_id'.
    # Se usar 'create_token_for_user', a chave será 'sub'.
    user_id = payload.get("user_id") or payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token válido, mas sem identificação de usuário."
        )

    return str(user_id)  # Retorna o ID do usuário
