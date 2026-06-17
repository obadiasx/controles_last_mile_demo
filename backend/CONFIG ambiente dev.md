# Distribuidora de Alimentos
API REST em Python/FastAPI para backend da Distribuidora de Alimentos.

## Passo-a-passo para rodar local com Docker

### ETAPA 1: Instalar o Docker na máquina

A instalação do Docker no Windows é feita através do **Docker Desktop**, que utiliza o **WSL 2 (Subsistema do Windows para Linux)** para rodar o motor do Docker.

#### 1\. Instruções de Instalação (Passo a Passo)

##### Passo 1: Habilitar o WSL 2 (Se Não Estiver Ativado)

Para garantir que o WSL 2 esteja pronto, você pode usar o terminal do Windows:

1.  Abra o **PowerShell** ou **Prompt de Comando** como **Administrador**.
2.  Execute o seguinte comando para instalar o WSL (isso habilitará os recursos necessários e instalará uma distribuição Linux, como o Ubuntu, por padrão):
    ```powershell
    wsl --install
    ```
3.  **Reinicie** o computador, se solicitado.

##### Passo 2: Baixar o Docker Desktop

1.  Acesse o site oficial do Docker e faça o **download do instalador do Docker Desktop for Windows (AMD64)**. O arquivo será um `.exe`.

##### Passo 3: Executar o Instalador

1.  Localize o arquivo **`Docker Desktop Installer.exe`** que você baixou e execute-o com um **duplo clique**.
2.  Na tela de Configuração, **certifique-se** de que a opção **"Use WSL 2 instead of Hyper-V"** (Usar WSL 2 em vez de Hyper-V) esteja **selecionada**.
3.  Clique em **OK** e siga o assistente de instalação, autorizando a instalação com privilégios de administrador quando solicitado.
4.  Ao final, clique em **Fechar** e **reinicie o computador** (obrigatório para que as mudanças do WSL 2 e Hyper-V entrem em vigor).

##### Passo 4: Iniciar e Configurar o Docker Desktop

1.  Após reiniciar, inicie o **Docker Desktop** pesquisando por ele no Menu Iniciar.
2.  Na primeira vez que o Docker Desktop iniciar, ele pode pedir que você **aceite os termos de serviço**. Aceite para continuar.
3.  O Docker Desktop será iniciado e você verá o ícone de uma baleia na área de notificação da barra de tarefas (próximo ao relógio).
4.  Aguarde até que o ícone pare de se mover, indicando que o Docker Engine foi iniciado e está pronto para uso.

##### Passo 5: Testar a Instalação

1.  Abra seu terminal de preferência (PowerShell, Prompt de Comando ou terminal WSL).

2.  Execute os seguintes comandos para verificar se o Docker está funcionando corretamente:

    ```bash
    docker --version
    docker run hello-world
    ```

Se o comando `docker run hello-world` executar com sucesso e exibir uma mensagem de confirmação, sua instalação do Docker Desktop está completa e funcionando\!

### ETAPA 2: Instalar o PostgreSQL no Docker (se essa for a ideia)

#### 1. Inicializar o Docker

Antes de tudo, verifique se o serviço Docker está ativo:

Abra o aplicativo. Aguarde até que o ícone do Docker na barra de tarefas/menu indique que ele está rodando (geralmente, um ícone de baleia verde).

#### 2. Executar o Arquivo YAML

Pelo PowerShell ou CMD, vá até a pasta ..\backend\scripts do projeto e execute o comando abaixo:

```
docker compose up -d
```

#### 3. Checar se o Banco Está Rodando

Use o comando docker ps para listar todos os containers ativos. Procure pelo nome que você definiu (postgres_db):

```
docker ps
```

Se o banco de dados estiver rodando corretamente, você verá uma linha semelhante a esta:


| CONTAINER ID | IMAGE | COMMAND | CREATED | STATUS | PORTS | NAMES |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| (hash) | postgres:17 | "docker-entrypoint.s..." | X seconds ago | **Up X seconds** | 0.0.0.0:5432->5432/tcp | **postgres_db** |

Se a coluna **STATUS** mostrar "**Up**", o seu banco de dados PostgreSQL está ativo e acessível na porta 5432 do seu computador (localhost).



## Arquivo de configuração .ENV

Crie um arquivo .env para a configuração local. Ele não deve ser salvo no git porque refletirá a sua configuração local.

Ele deve ser gravado na pasta backend.

As configurações iniciais do arquivo são as seguintes:

```
# Access Control API Environment Configuration
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=db_system
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Configuration
JWT_SECRET_KEY=your-jwt-secret-key-minimum-32-characters-long
JWT_REFRESH_SECRET_KEY=your-jwt-refresh-secret-key-minimum-32-characters-long
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Security Configuration
CORS_ORIGINS=*
CORS_ALLOW_CREDENTIALS=true
RATE_LIMIT_CALLS_PER_MINUTE=100
SECURITY_HEADERS_ENABLED=true

# Application Configuration
APP_NAME=Access Control API
APP_VERSION=1.0.0
APP_DESCRIPTION=A secure user management and access control API
ENVIRONMENT=development
DEBUG=false
LOG_LEVEL=INFO
```

## Instalação das bibliotecas

Vá até a pasta onde está o requirements.txt e, pela janela de comando, execute o seginte comando:

```
pip install -r requirements.txt
```

Ele instalará as bibliotecas básicas para o funcionamento do aplicativo.