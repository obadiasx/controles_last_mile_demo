import type { MenuItem } from "../config/menuConfig";
import type { User } from "../interfaces/IAuth";

/** Rótulo exibido no menu (ex.: comprador vê "Ordens de Compra" no lugar de CEAGESP). */
export function getMenuItemDisplayLabel(
  item: MenuItem,
  user: User | undefined,
): string {
  if (item.id === "ceagesp" && user?.role_name === "comprador") {
    return "Ordens de Compra";
  }
  return item.label;
}
