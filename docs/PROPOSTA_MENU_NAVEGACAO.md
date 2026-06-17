# Proposta de Menu e Navegação — ERP Sabor da Terra

## Sumário

1. [Contexto e Estado Atual](#1-contexto-e-estado-atual)
2. [Princípios de UX Aplicados](#2-princípios-de-ux-aplicados)
3. [Proposta de Layout e Estrutura](#3-proposta-de-layout-e-estrutura)
4. [Esquema de Menus Detalhado](#4-esquema-de-menus-detalhado)
5. [Itens Exclusivos do Administrador](#5-itens-exclusivos-do-administrador)
6. [Especificação Técnica](#6-especificação-técnica)
7. [Wireframes e Fluxos](#7-wireframes-e-fluxos)

---

## 1. Contexto e Estado Atual

### 1.1 Situação Atual

O frontend utiliza um esquema simples de navegação:

- **Tela de Login** → redireciona para **MenuRedirect** após autenticação
- **MenuRedirect**: tela central com logo e cards clicáveis (grid 1–2 colunas)
- Cada card leva a uma página isolada (Conferência, Solicitações do Dia, CEAGESP)
- Não há barra de navegação persistente; o usuário depende do botão voltar do navegador
- **Lista de Usuários** (`/userlist`) existe como rota, mas não aparece no menu (falta em `Menu_Rules`)

### 1.2 Problemas Identificados

| Problema | Impacto |
|---------|---------|
| Ausência de navegação global | Usuário não consegue trocar de módulo sem voltar ao menu |
| Menu como tela intermediária | Fluxo Login → Menu → Página gera cliques desnecessários |
| UserList fora do menu | Administradores não têm acesso direto à gestão de usuários |
| Sem área administrativa | Endpoints de admin (usuários, roles, sync) não têm interface dedicada |
| Layout sem hierarquia | Cards em grid não refletem a estrutura operacional do sistema |

---

## 2. Princípios de UX Aplicados

### 2.1 Padrões de Mercado (ERP / Dashboards)

- **App Shell**: barra superior + sidebar lateral fixa
- **Navegação persistente**: menu sempre visível para troca rápida de contexto
- **Agrupamento por domínio**: Operacional vs Administrativo
- **Responsividade**: drawer em mobile, sidebar em desktop
- **Hierarquia visual**: ícones + labels, seções colapsáveis

### 2.2 Boas Práticas

- **Proximidade**: itens relacionados agrupados
- **Consistência**: mesma estrutura em todas as telas
- **Feedback**: indicação clara da página atual
- **Acessibilidade**: contraste, tamanhos de toque adequados
- **Progressive disclosure**: itens administrativos visíveis apenas para admin

---

## 3. Proposta de Layout e Estrutura

### 3.1 App Shell

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Logo]  ERP Sabor da Terra          [Busca global?]  [🔔] [Avatar ▼]   │  ← AppBar (64px)
├──────────┬──────────────────────────────────────────────────────────────┤
│          │                                                              │
│  📋 Menu │                                                              │
│          │           Área de Conteúdo (Outlet)                         │
│  Oper.   │                                                              │
│  - Conf. │                                                              │
│  - Sol.  │                                                              │
│  - CEAG. │                                                              │
│          │                                                              │
│  Admin   │                                                              │
│  - Usuár.│                                                              │
│  - Roles │                                                              │
│  - Sync  │                                                              │
│          │                                                              │
├──────────┴──────────────────────────────────────────────────────────────┤
│  Breadcrumb: Início > Conferência > Pedido #123                         │  ← Opcional
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Componentes Principais

| Componente | Descrição | Comportamento |
|------------|------------|----------------|
| **AppBar** | Barra superior fixa | Logo, título, ações globais, menu do usuário |
| **Sidebar (Drawer)** | Menu lateral | Navegação principal, agrupada por seção |
| **Content Area** | Área central | Renderiza a rota atual (Outlet) |
| **Breadcrumb** | Navegação contextual | Opcional, para telas profundas |

### 3.3 Responsividade

| Breakpoint | Sidebar | Comportamento |
|------------|---------|---------------|
| **xs/sm** (< 960px) | Drawer (oculto) | Ícone hambúrguer abre drawer por overlay |
| **md+** (≥ 960px) | Drawer fixo (240px) | Sempre visível, colapsável para 72px (só ícones) |

---

## 4. Esquema de Menus Detalhado

### 4.1 Estrutura do Menu Lateral

```
┌─────────────────────────────────────┐
│  OPERACIONAL                        │
├─────────────────────────────────────┤
│  📦 Conferência         /conference │  ← Conferente, Admin
│  📋 Solicitações do Dia /dailymission│  ← Comprador, Financeiro, Admin
│  🏪 CEAGESP             /ceagesp    │  ← Comprador, Financeiro, Admin
├─────────────────────────────────────┤
│  ADMINISTRATIVO         (só admin)   │
├─────────────────────────────────────┤
│  👥 Usuários            /usuarios   │  ← Admin
│  🔐 Roles e Permissões  /roles     │  ← Admin
│  🔄 Sincronização       /sync      │  ← Admin
└─────────────────────────────────────┘
```

### 4.2 Regras de Exibição por Perfil

| Item de Menu | Conferente | Comprador | Financeiro | Administrador |
|--------------|:----------:|:---------:|:----------:|:-------------:|
| Conferência | ✓ | — | — | ✓ |
| Solicitações do Dia | — | ✓ | ✓ | ✓ |
| CEAGESP | — | ✓ | ✓ | ✓ |
| **— Divisor —** | | | | |
| Usuários | — | — | — | ✓ |
| Roles e Permissões | — | — | — | ✓ |
| Sincronização | — | — | — | ✓ |

### 4.3 Lógica de Permissão (Revisada)

**Situação atual**: `hasAllPermissions` exige todas as permissões de um menu. Isso pode ser restritivo.

**Proposta**: usar `hasAnyPermission` para itens operacionais e `hasAllPermissions` apenas quando fizer sentido. Ou manter `hasAnyPermission` por item, com lista mínima:

| Menu | Permissão mínima para exibir |
|------|------------------------------|
| Conferência | `conferencia:listar_pedidos` |
| Solicitações do Dia | `solicitacoes_dia:ler` |
| CEAGESP | `solicitacoes_dia:ler` |
| Usuários | `usuarios:listarTodos` |
| Roles e Permissões | `usuarios:listarRoles` |
| Sincronização | `usuarios:listarTodos` (admin) ou permissão dedicada futura |

---

## 5. Itens Exclusivos do Administrador

### 5.1 Mapeamento Backend → Frontend

Com base nos endpoints e em `role_assignments.json`:

| Recurso Backend | Endpoint | Permissão | Proposta de Menu |
|-----------------|----------|-----------|------------------|
| Listar usuários | `GET /users` | `usuarios:listarTodos` | **Usuários** — listagem, busca, CRUD |
| Visualizar usuário | `GET /users/{id}` | `usuarios:visualizar` | Modal ou página de detalhes |
| Atualizar usuário | `PUT /users/{id}` | `usuarios:atualizar` | Formulário de edição |
| Excluir usuário | `DELETE /users/{id}` | `usuarios:excluir` | Botão excluir com confirmação |
| Redefinir senha | (implícito em update) | `usuarios:redefinirSenha` | Botão "Redefinir senha" |
| Listar roles | `GET /users/roles` | `usuarios:listarRoles` | **Roles e Permissões** — visualização |
| Sincronizar produtos | `POST /sync/produtos` | (qualquer autenticado) | **Sincronização** — botões por entidade |
| Sincronizar unidades | `POST /sync/unidades` | (qualquer autenticado) | Idem |
| Sincronizar fornecedores | `POST /sync/fornecedores` | (qualquer autenticado) | Idem |

**Nota**: Os endpoints de sync hoje não exigem permissão específica. A proposta é expô-los apenas na área administrativa, restrita ao perfil administrador.

### 5.2 Páginas Administrativas Propostas

#### 5.2.1 Usuários (`/usuarios`)

- Listagem com busca (reutilizar/evoluir `UserList`)
- Filtros: ativo/inativo, role
- Ações: Editar, Excluir, Redefinir senha
- Botão "Novo usuário" (se houver `POST /users/register` ou equivalente)

#### 5.2.2 Roles e Permissões (`/roles`)

- Tela de consulta (read-only)
- Lista de roles com suas permissões
- Baseada em `GET /users/roles`
- Útil para auditoria e documentação interna

#### 5.2.3 Sincronização (`/sync`)

- Cards ou botões por entidade:
  - Sincronizar Produtos
  - Sincronizar Unidades
  - Sincronizar Fornecedores
- Feedback de sucesso/erro e loading
- Opcional: histórico ou log de última sincronização

---

## 6. Especificação Técnica

### 6.1 Novas Rotas

```tsx
// routes.tsx (proposto)
<Route path="/" element={<AppLayout />}>
  <Route index element={<Navigate to="/menuredirect" replace />} />
  <Route path="menuredirect" element={<MenuRedirect />} />  // ou redirecionar para /conference como default
  <Route path="conference" element={<Conference />} />
  <Route path="dailymission" element={<DailyMission />} />
  <Route path="ceagesp" element={<Ceagesp />} />
  {/* Admin only */}
  <Route path="usuarios" element={<UserList />} />
  <Route path="roles" element={<RolesList />} />
  <Route path="sync" element={<SyncPanel />} />
</Route>
<Route path="/login" element={<Login />} />
```

### 6.2 Estrutura de Dados do Menu

```tsx
// Menu structure proposal
interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  permission?: string;           // exibe se tiver esta permissão
  adminOnly?: boolean;            // atalho: só admin
  section: "operacional" | "admin";
}

const MENU_ITEMS: MenuItem[] = [
  { id: "conference", label: "Conferência", path: "/conference", icon: <Inventory2 />, permission: "conferencia:listar_pedidos", section: "operacional" },
  { id: "dailymission", label: "Solicitações do Dia", path: "/dailymission", icon: <Assignment />, permission: "solicitacoes_dia:ler", section: "operacional" },
  { id: "ceagesp", label: "CEAGESP", path: "/ceagesp", icon: <Store />, permission: "solicitacoes_dia:ler", section: "operacional" },
  { id: "usuarios", label: "Usuários", path: "/usuarios", icon: <People />, adminOnly: true, section: "admin" },
  { id: "roles", label: "Roles e Permissões", path: "/roles", icon: <Security />, permission: "usuarios:listarRoles", section: "admin" },
  { id: "sync", label: "Sincronização", path: "/sync", icon: <Sync />, adminOnly: true, section: "admin" },
];
```

### 6.3 AppBar — Menu do Usuário

- Avatar + nome (ou username)
- Dropdown:
  - **Meu perfil** → `/perfil` (dados do usuário, alterar senha)
  - **Sair** → `clearToken()` + navigate("/login")

---

## 7. Wireframes e Fluxos

### 7.1 Fluxo de Navegação Proposto

```
Login
  │
  ▼
App Shell (Sidebar + AppBar)
  │
  ├─► Conferência
  ├─► Solicitações do Dia
  ├─► CEAGESP
  │
  └─► [Admin] Usuários / Roles / Sincronização
```

### 7.2 Desktop (≥ 960px)

- Sidebar fixa à esquerda (240px ou 72px colapsada)
- Conteúdo à direita com padding
- AppBar full width

### 7.3 Mobile

- AppBar com ícone hambúrguer
- Drawer abre por overlay ao toque
- Conteúdo em full width

### 7.4 Paleta e Estilo (Consistente com o Atual)

- Cor primária: `#8542F9` (roxo)
- Background: `hsl(0, 0%, 96%)`
- Cards: borda `#8542F960`, sombra leve
- Fonte: Rhodium Libre para títulos

---

## Resumo da Proposta

| Aspecto | Proposta |
|---------|----------|
| **Layout** | App Shell com AppBar + Sidebar (Drawer) |
| **Navegação** | Menu lateral persistente, agrupado (Operacional / Administrativo) |
| **Admin** | Seção "Administrativo" com Usuários, Roles, Sincronização |
| **Responsivo** | Drawer overlay em mobile, sidebar fixa em desktop |
| **Rotas** | `/usuarios`, `/roles`, `/sync` para admin |
| **User menu** | Avatar no AppBar com Perfil e Sair |

---

*Documento de proposta — ERP Sabor da Terra — Março 2025*
