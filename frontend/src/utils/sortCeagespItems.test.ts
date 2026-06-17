import { describe, expect, it } from "vitest";
import { sortCeagespItemsByPriority } from "./sortCeagespItems";

describe("sortCeagespItemsByPriority", () => {
  it("coloca não comprados antes dos comprados e ordena por descrição", () => {
    const items = [
      {
        id: "1",
        comprado: true,
        produto: { descricao: "Banana" },
      },
      {
        id: "2",
        comprado: false,
        produto: { descricao: "Abacate" },
      },
      {
        id: "3",
        comprado: false,
        produto: { descricao: "Zebra" },
      },
    ];
    const sorted = sortCeagespItemsByPriority(items);
    expect(sorted.map((i) => i.id)).toEqual(["2", "3", "1"]);
  });
});
