import { describe, expect, it } from "vitest";
import {
  podeConfirmarLiberacaoGlobal,
  proximoPassoLiberacaoGlobal,
} from "./financeGlobalReleaseFlow";

describe("financeGlobalReleaseFlow", () => {
  it("avanca de preview para confirmacao final", () => {
    expect(proximoPassoLiberacaoGlobal("preview")).toBe("confirmacao_final");
  });

  it("so permite confirmar no passo final com ciencia marcada", () => {
    expect(podeConfirmarLiberacaoGlobal("preview", true)).toBe(false);
    expect(podeConfirmarLiberacaoGlobal("confirmacao_final", false)).toBe(false);
    expect(podeConfirmarLiberacaoGlobal("confirmacao_final", true)).toBe(true);
  });
});
