from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from typing import Union
from pydantic import validator


# Esquema para representar uma Permissão
class PermissionResponse(BaseModel):
    id: UUID
    name: str

    model_config = ConfigDict(from_attributes=True)

# Esquema Base do Usuário com campos comuns
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="O nome de usuário deve ter 3-50 caracteres")
    name_full: str = Field(..., min_length=1, max_length=100, description="O nome completo é obrigatório")
    email: EmailStr = Field(..., description="Um endereço de e-mail válido é obrigatório")
    enabled: bool = Field(default=True, description="Status da conta do usuário")
    role_id: UUID = Field(default="user", description="Função (role) do usuário")
    first_access: bool = Field(default=True, description="Indicador de primeiro acesso")


class UserBaseRole(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="O nome de usuário deve ter 3-50 caracteres")
    name_full: str = Field(..., min_length=1, max_length=100, description="O nome completo é obrigatório")
    email: EmailStr = Field(..., description="Um endereço de e-mail válido é obrigatório")
    enabled: bool = Field(default=True, description="Status da conta do usuário")
    role_name: str = Field(description="Nome da função do usuário (ex: 'administrador', 'financeiro')")
    first_access: bool = Field(default=True, description="Indicador de primeiro acesso")


# Esquema para criação de um novo usuário
class UserCreate(UserBaseRole):
    password: str = Field(..., min_length=8, max_length=100, description="A senha deve ter pelo menos 8 caracteres")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "username": "johndoe",
                "name_full": "John Doe",
                "email": "john.doe@example.com",
                "password": "securepassword123",
                "enabled": True,
                "role_name": "user"
            }
        }
    )


# Esquema para atualização de um usuário
class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    name_full: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    enabled: Optional[bool] = None
    role_id: Union[UUID, str] = None
    password: Optional[str] = Field(default="", max_length=100, description="Senha nova do usuário (deixe vazio se não quiser alterar)")
    first_access: Optional[bool] = None

    @validator("password")
    def check_password_length(cls, v):
        if v is not None and v != "" and len(v) < 8:
            raise ValueError("Senha deve ter pelo menos 8 caracteres")
        return v

    model_config = ConfigDict(
        extra="forbid",
        populate_by_name=True,
        exclude_none=False,
        json_schema_extra={
            "example": {
                "name_full": "John Smith",
                "email": "john.smith@example.com",
                "enabled": True,
                "role_id": "admin",
                "password": None
            }
        }
    )


# Esquema para a resposta do usuário (o que é retornado ao cliente)
class UserResponse(UserBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    permissions: List[PermissionResponse] = Field(default_factory=list, description="Lista de permissões do usuário")
    password: str = ""
    role_name: Optional[str] = Field(
        default=None,
        description="Nome da role (ex.: comprador, financeiro) para exibição no cliente",
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "username": "johndoe",
                "name_full": "John Doe",
                "email": "john.doe@example.com",
                "enabled": True,
                "role_id": "user",
                "created_at": "2024-01-01T12:00:00Z",
                "updated_at": "2024-01-01T12:00:00Z",
                "permissions": [
                    {
                        "id": "7215b9b7-0432-43a3-bbe1-84110cf01637",
                        "name": "usuarios:listarUsuarios"
                    }
                ]
            }
        }
    )


# Esquema para login de usuário
class UserLogin(BaseModel):
    username: str = Field(..., description="Nome de usuário ou e-mail para login")
    password: str = Field(..., description="Senha do usuário")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "username": "johndoe",
                "password": "securepassword123"
            }
        }
    )


# Esquema para a resposta de autenticação do usuário
class UserAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "user": {
                    "id": "123e4567-e89b-12d3-a456-426614174000",
                    "username": "johndoe",
                    "name_full": "John Doe",
                    "email": "john.doe@example.com",
                    "enabled": True,
                    "role_id": "user",
                    "created_at": "2024-01-01T12:00:00Z",
                    "updated_at": "2024-01-01T12:00:00Z"
                }
            }
        }
    )


# Esquema para alteração de senha
class PasswordChange(BaseModel):
    current_password: str = Field(..., description="Senha atual")
    new_password: str = Field(..., min_length=8, max_length=100,
                              description="A nova senha deve ter pelo menos 8 caracteres")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "current_password": "oldpassword123",
                "new_password": "newpassword123"
            }
        }
    )

class BuyerResponse(BaseModel):
    id: UUID
    username: str
    name_full: str
    email: EmailStr
    enabled: bool

    model_config = ConfigDict(from_attributes=True)

    # Exemplo de uso (Opcional, mas útil para documentação no Swagger)
    model_config["json_schema_extra"] = {
        "example": {
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "username": "comprador_a",
            "name_full": "Comprador A",
            "email": "comprador.a@empresa.com",
            "enabled": True,
        }
    }