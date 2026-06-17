# Documentação do ERP Sabor da Terra

## Sumário

1. Visão Geral
2. Funcionalidades Básicas
3. Perfis de Usuário e Recursos do Sistema

---

## 1. Visão Geral

O **ERP Sabor da Terra** é um sistema de gestão empresarial desenvolvido para a empresa Sabor da Terra. O sistema possui uma arquitetura moderna composta por:

- **Frontend**: Aplicação web desenvolvida em React com TypeScript, utilizando Vite, Material-UI (MUI) e React Query
- **Backend**: API REST desenvolvida em Python com FastAPI

O sistema é voltado para a gestão de compras, conferência de pedidos e solicitações do dia, integrando processos operacionais da empresa.

---

## 2. Funcionalidades Básicas

### 2.1 Autenticação e Login

- **Tela de Login**: O usuário acessa o sistema informando usuário e senha
- **Autenticação via JWT**: O sistema utiliza tokens JWT para manter a sessão do usuário
- **Redirecionamento**: Após o login, o usuário é direcionado ao menu principal, onde visualiza apenas os módulos aos quais tem permissão de acesso

### 2.2 Menu Principal (MenuRedirect)

- **Tela de Boas-vindas**: Exibe o logo da empresa e mensagem de boas-vindas
- **Menu Dinâmico**: Os cards de navegação são exibidos conforme as permissões do usuário
- **Módulos disponíveis** (conforme perfil):
  - Conferência
  - Solicitações do Dia
  - CEAGESP

### 2.3 Conferência de Pedidos

**Rota**: `/conference`

**Descrição**: Módulo para conferência de pedidos de compra recebidos.

**Funcionalidades**:
- Sincronização de pedidos com o sistema externo
- Listagem de pedidos de compra pendentes ou com divergências
- Filtro por fornecedor e produto
- Visualização de detalhes de cada item (quantidade esperada, quantidade física, status, divergências)
- Atualização de quantidade recebida e status de conferência
- Registro de divergências (avarias, faltas, etc.)
- Paginação dos resultados

### 2.4 Solicitações do Dia

**Rota**: `/dailymission`

**Descrição**: Módulo para gestão das listas de compras do dia.

**Funcionalidades**:
- Busca de solicitações por data
- Visualização das solicitações agrupadas por comprador
- Criação de novas solicitações do dia (com data, comprador e observações)
- Inclusão e edição de itens nas solicitações
- Atualização de valor máximo aceitável dos produtos
- Cadastro e alteração de fornecedores
- Redefinição de senha de usuários (para perfis com permissão)
- Exclusão de itens da lista (antes da finalização)
- Navegação por abas entre compradores

### 2.5 CEAGESP

**Rota**: `/ceagesp`

**Descrição**: Módulo específico para compras no CEAGESP (Centro de Abastecimento).

**Funcionalidades**:
- Visualização das solicitações do dia atual
- Filtro por comprador (administradores e financeiro veem todos; compradores veem apenas suas próprias solicitações)
- Listagem de itens de compra com paginação
- Exclusão e atualização de itens
- Gestão de fornecedores

### 2.6 Lista de Usuários

**Rota**: `/userlist`

**Descrição**: Módulo administrativo para gestão de usuários do sistema.

**Funcionalidades**:
- Listagem completa de usuários
- Busca por usuário
- Visualização de detalhes de cada usuário
- Atualização de dados de usuários
- Exclusão de usuários
- Visualização de roles e permissões

---

## 3. Perfis de Usuário e Recursos do Sistema

O ERP Sabor da Terra utiliza um sistema de controle de acesso baseado em **perfis (roles)** e **permissões**. Cada perfil possui um conjunto específico de permissões que determinam quais recursos e funcionalidades o usuário pode acessar.

### 3.1 Perfis Disponíveis

| Perfil | Descrição |
|--------|-----------|
| **Administrador** | Acesso total ao sistema. Gerencia usuários, permissões e todos os módulos operacionais. |
| **Conferente** | Responsável pela conferência de pedidos de compra recebidos. |
| **Comprador** | Responsável por criar e gerenciar as listas de compras do dia. |
| **Financeiro** | Acesso a gestão financeira, compradores, solicitações e cadastros de produtos/fornecedores. |

### 3.2 Matriz de Permissões por Perfil

#### Permissões de Usuários (exclusivo Administrador)

| Recurso | Descrição | Administrador |
|---------|-----------|:-------------:|
| usuarios:listarUsuarios | Listagem de usuários | ✓ |
| usuarios:redefinirSenha | Redefinição de senha | ✓ |
| usuarios:listarTodos | Visualizar lista completa de usuários | ✓ |
| usuarios:listarRoles | Visualizar roles e permissões | ✓ |
| usuarios:visualizar | Visualizar detalhes de usuário | ✓ |
| usuarios:atualizar | Atualizar dados de usuário | ✓ |
| usuarios:excluir | Excluir usuário | ✓ |

#### Permissões de Conferência

| Recurso | Descrição | Conferente | Administrador |
|---------|-----------|:----------:|:-------------:|
| conferencia:atualizacao | Atualizar recebimento e sincronizar pedidos | ✓ | ✓ |
| conferencia:listar_pedidos | Listar pedidos pendentes/divergentes | ✓ | ✓ |
| conferencia:visualizar_detalhes | Visualizar detalhes de item de conferência | ✓ | ✓ |
| conferencia:listar_divergencias | Listar opções de divergência | ✓ | ✓ |

#### Permissões de Compradores

| Recurso | Descrição | Administrador | Financeiro |
|---------|-----------|:-------------:|:----------:|
| comprador:listarCompradores | Listar usuários com perfil comprador | ✓ | ✓ |
| comprador:listarAtivos | Listar compradores ativos | ✓ | ✓ |

#### Permissões de Solicitações do Dia

| Recurso | Descrição | Comprador | Financeiro | Administrador |
|---------|-----------|:---------:|:----------:|:-------------:|
| solicitacoes_dia:ler | Ler lista de compras do dia | ✓ | ✓ | ✓ |
| solicitacoes_dia:criar | Criar solicitação do dia (missão) | | ✓ | ✓ |
| solicitacoes_dia:atualizar | Atualizar lista e itens (após criada) | ✓ | ✓ | ✓ |
| solicitacoes_dia:excluir | Remover itens (antes da finalização) | | ✓ | ✓ |

#### Permissões de Produtos e Fornecedores

| Recurso | Descrição | Financeiro | Comprador | Administrador |
|---------|-----------|:----------:|:---------:|:-------------:|
| produtos:atualiza_maximo_aceitavel | Atualizar valor máximo aceitável | ✓ | | ✓ |
| fornecedores:atualizar | Incluir/alterar fornecedor | ✓ | ✓ | ✓ |

### 3.3 Acesso aos Módulos por Perfil

| Módulo | Conferente | Comprador | Financeiro | Administrador |
|--------|:----------:|:---------:|:----------:|:-------------:|
| **Conferência** | ✓ | | | ✓ |
| **Solicitações do Dia** | | ✓* | ✓ | ✓ |
| **CEAGESP** | | ✓* | — | ✓ |
| **Lista de Usuários** | | | | ✓ |

*Comprador acessa CEAGESP e Solicitações do Dia com permissões limitadas (ler e atualizar, sem excluir).

### 3.4 Regras de Negócio por Perfil

- **Conferente**: Acessa apenas o módulo de Conferência. Pode sincronizar pedidos, listar, visualizar detalhes e atualizar status de conferência.

- **Comprador**: Acessa Solicitações do Dia e CEAGESP. Não cria a solicitação do dia (o financeiro cria a missão); pode atualizar itens da lista já criada. No CEAGESP, visualiza apenas suas próprias solicitações.

- **Financeiro**: Acessa Solicitações do Dia (sem CEAGESP). Cria as solicitações do dia; pode ler, atualizar e excluir itens; atualizar valor máximo aceitável e fornecedores.

- **Administrador**: Acesso irrestrito a todos os módulos e funcionalidades, incluindo gestão completa de usuários, roles e permissões.

---

*Documento gerado em março de 2025 — ERP Sabor da Terra*
