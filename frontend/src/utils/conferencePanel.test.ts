import { describe, expect, it } from "vitest";
import {
  aplicarFiltroFasePainel,
  resumirPainelConferencia,
} from "./conferencePanel";
import type { IConferenceOrder } from "../interfaces/IConference";

const pedidosBase: IConferenceOrder[] = [
  {
    pedido_id: 1,
    item: 1,
    fornecedor: "Fornecedor A",
    status_conferencia: "PendenteConferencia",
    fase_conferencia: "EmConferencia",
    cancelado: false,
  },
  {
    pedido_id: 1,
    item: 2,
    fornecedor: "Fornecedor A",
    status_conferencia: "Parcial",
    fase_conferencia: "EmConferencia",
    cancelado: false,
  },
  {
    pedido_id: 2,
    item: 1,
    fornecedor: "Fornecedor B",
    status_conferencia: "PendenteDecisaoFinanceiro",
    fase_conferencia: "AguardandoDecisaoFinanceiro",
    cancelado: false,
  },
  {
    pedido_id: 3,
    item: 1,
    fornecedor: "Fornecedor C",
    status_conferencia: "PendenteConferencia",
    fase_conferencia: "EmConferencia",
    cancelado: true,
  },
];

describe("conferencePanel", () => {
  it("resume pendencias por fornecedor e itens abertos", () => {
    const resumo = resumirPainelConferencia(pedidosBase, true);
    expect(resumo.itensPendentes).toBe(3);
    expect(resumo.fornecedoresPendentes).toEqual(["Fornecedor A", "Fornecedor B"]);
    expect(resumo.pendenciasPorFornecedor).toEqual([
      { fornecedor: "Fornecedor A", total: 2 },
      { fornecedor: "Fornecedor B", total: 1 },
    ]);
    expect(resumo.itensAguardandoFinanceiro).toBe(1);
  });

  it("oculta aguardando financeiro quando usuario nao pode visualizar", () => {
    const resumo = resumirPainelConferencia(pedidosBase, false);
    expect(resumo.fornecedoresPendentes).toEqual(["Fornecedor A"]);
    expect(resumo.itensAguardandoFinanceiro).toBe(0);
  });

  it("aplica filtro rapido por fase", () => {
    expect(aplicarFiltroFasePainel(pedidosBase, "todas", true)).toHaveLength(4);
    expect(aplicarFiltroFasePainel(pedidosBase, "abertas", true)).toHaveLength(3);
    expect(
      aplicarFiltroFasePainel(pedidosBase, "aguardando_financeiro", true),
    ).toHaveLength(1);
  });
});
