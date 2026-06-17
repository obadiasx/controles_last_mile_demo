import { describe, expect, it } from "vitest";
import { fornecedorAptoPedidoDireto } from "./solicitacaoDireta";

describe("fornecedorAptoPedidoDireto", () => {
  it("exige e-mail não vazio e forma padrão", () => {
    expect(
      fornecedorAptoPedidoDireto({
        email: "a@b.com",
        forma_pagamento_padrao: { id: "uuid" },
      }),
    ).toBe(true);
    expect(fornecedorAptoPedidoDireto({ email: "", forma_pagamento_padrao: { id: "x" } })).toBe(
      false,
    );
    expect(fornecedorAptoPedidoDireto({ email: "a@b.com", forma_pagamento_padrao: null })).toBe(
      false,
    );
    expect(fornecedorAptoPedidoDireto({ email: "   ", forma_pagamento_padrao: { id: "x" } })).toBe(
      false,
    );
  });
});
