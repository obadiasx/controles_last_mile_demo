/**
 * Ordem da lista de Ordens de Compra: não comprados primeiro, depois comprados; A–Z por descrição.
 */
export type ItemComStatusCompra = {
  comprado: boolean;
  produto: { descricao: string };
};

export function sortCeagespItemsByPriority<T extends ItemComStatusCompra>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    if (a.comprado !== b.comprado) {
      return a.comprado ? 1 : -1;
    }
    return a.produto.descricao.localeCompare(b.produto.descricao, "pt-BR", {
      sensitivity: "base",
    });
  });
}
