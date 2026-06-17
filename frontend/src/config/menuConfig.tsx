import type { ReactNode } from "react";
import {
  Inventory2,
  Assignment,
  Store,
  People,
  Security,
  Sync,
  Payment,
  PriceChange,
  ChecklistRtl,
  ForwardToInbox,
  Email,
  WarningAmber,
} from "@mui/icons-material";

export type MenuSection = "operacional" | "admin";

export interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon: ReactNode;
  permission?: string;
  adminOnly?: boolean;
  /** Só financeiro e administrador (ver `shouldShowMenuItem`). */
  financeTeamOnly?: boolean;
  /** Perfis que nunca veem o item (ex.: comprador não acessa Solicitações do dia). */
  hideForRoles?: string[];
  section: MenuSection;
}

export const MENU_ITEMS: MenuItem[] = [
  {
    id: "conference",
    label: "Conferência",
    path: "/conference",
    icon: <Inventory2 />,
    permission: "conferencia:listar_pedidos",
    section: "operacional",
  },
  {
    id: "dailymission",
    label: "Solicitações do Dia",
    path: "/dailymission",
    icon: <Assignment />,
    permission: "solicitacoes_dia:ler",
    hideForRoles: ["comprador"],
    section: "operacional",
  },
  {
    id: "pedido-fornecedor-email",
    label: "Pedido ao fornecedor (e-mail)",
    path: "/pedido-fornecedor",
    icon: <ForwardToInbox />,
    permission: "solicitacoes_dia:atualizar",
    financeTeamOnly: true,
    hideForRoles: ["comprador"],
    section: "operacional",
  },
  {
    id: "ceagesp",
    label: "CEAGESP",
    path: "/ceagesp",
    icon: <Store />,
    permission: "ceagesp:acessar",
    section: "operacional",
  },
  {
    id: "fornecedor-forma-pagamento",
    label: "Pagamento / e-mail",
    path: "/fornecedores-forma-pagamento",
    icon: <Payment />,
    permission: "fornecedores:atualizar",
    financeTeamOnly: true,
    section: "operacional",
  },
  {
    id: "produtos-teto-preco",
    label: "Tetos de preço (produtos)",
    path: "/produtos-teto-preco",
    icon: <PriceChange />,
    permission: "produtos:atualiza_maximo_aceitavel",
    financeTeamOnly: true,
    section: "operacional",
  },
  {
    id: "pendencias-dia",
    label: "Pendências do dia",
    path: "/pendencias-dia",
    icon: <ChecklistRtl />,
    permission: "solicitacoes_dia:ler",
    financeTeamOnly: true,
    section: "operacional",
  },
  {
    id: "pendencias-email-sidi",
    label: "Pendências e-mail SIDI",
    path: "/pendencias-email-sidi",
    icon: <WarningAmber />,
    permission: "solicitacoes_dia:atualizar",
    financeTeamOnly: true,
    section: "operacional",
  },
  {
    id: "usuarios",
    label: "Usuários",
    path: "/usuarios",
    icon: <People />,
    adminOnly: true,
    section: "admin",
  },
  {
    id: "roles",
    label: "Roles e Permissões",
    path: "/roles",
    icon: <Security />,
    permission: "usuarios:listarRoles",
    section: "admin",
  },
  {
    id: "sync",
    label: "Sincronização",
    path: "/sync",
    icon: <Sync />,
    adminOnly: true,
    section: "admin",
  },
  {
    id: "smtp-envio",
    label: "SMTP de envio (e-mail)",
    path: "/smtp-envio",
    icon: <Email />,
    adminOnly: true,
    section: "admin",
  },
];

export const MENU_SECTIONS: Record<MenuSection, string> = {
  operacional: "Operacional",
  admin: "Administrativo",
};
