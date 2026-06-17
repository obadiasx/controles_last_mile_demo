import { describe, expect, it } from "vitest";
import { corChipFasePedido, corChipStatusConferencia } from "./conferenceStatus";

describe("corChipStatusConferencia", () => {
  it("retorna cores distintas para estados principais", () => {
    const p = corChipStatusConferencia("PendenteConferencia");
    const fin = corChipStatusConferencia("PendenteDecisaoFinanceiro");
    expect(p.bg).not.toBe(fin.bg);
    expect(corChipStatusConferencia("Parcial").bg).toBeTruthy();
  });
});

describe("corChipFasePedido", () => {
  it("retorna cores para fases macro", () => {
    expect(corChipFasePedido("EmConferencia").color).toBeTruthy();
    expect(corChipFasePedido("ProntoParaIntegracao").bg).toBeTruthy();
  });
});
