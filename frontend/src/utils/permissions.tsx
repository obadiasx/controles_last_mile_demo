import type { User } from "../interfaces/IAuth";

export const hasPermission = (
  user: User | undefined,
  permission: string,
): boolean => {
  if (!user) return false;

  return user.permissions.some((p) => p.name === permission);
};

export const hasAllPermissions = (user: User, permissions: string[]) =>
  permissions.every((permission) => hasPermission(user, permission));

export const hasAnyPermission = (user: User | undefined, permissions: string[]) =>
  permissions.some((permission) => hasPermission(user, permission));

/** Retorna true se o usuário é administrador (possui permissão exclusiva de admin) */
export const isAdmin = (user: User | undefined): boolean =>
  hasPermission(user, "usuarios:listarTodos");

/** Verifica se o item de menu deve ser exibido para o usuário */
export const shouldShowMenuItem = (
  user: User | undefined,
  item: {
    permission?: string;
    adminOnly?: boolean;
    /** Restringe a financeiro e administrador (além de `permission` / admin). */
    financeTeamOnly?: boolean;
    hideForRoles?: string[];
  },
): boolean => {
  if (!user) return false;
  const role = user.role_name?.toLowerCase();
  if (
    item.hideForRoles?.length &&
    role &&
    item.hideForRoles.map((r) => r.toLowerCase()).includes(role)
  ) {
    return false;
  }
  if (item.adminOnly) return isAdmin(user);
  if (item.financeTeamOnly) {
    const r = user.role_name?.toLowerCase();
    if (
      !isAdmin(user) &&
      r !== "financeiro" &&
      r !== "administrador"
    ) {
      return false;
    }
  }
  if (item.permission) return hasPermission(user, item.permission) || isAdmin(user);
  return false;
};
