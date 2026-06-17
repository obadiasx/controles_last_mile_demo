import { describe, expect, it } from "vitest";
import {
  conferentePodeEditarItem,
  labelFaseConferenciaPedido,
  labelStatusItemConferencia,
} from "./conferenceUi";

describe("conferenceUi", () => {
  it("rotula status canônicos em pt-BR", () => {
    expect(labelStatusItemConferencia("PendenteConferencia")).toBe(
      "Pendente conferência",
    );
    expect(labelStatusItemConferencia("NaoRecebido")).toBe("Não recebido");
    expect(labelStatusItemConferencia("DesconhecidoX")).toBe("DesconhecidoX");
  });

  it("rotula fases de pedido em pt-BR", () => {
    expect(labelFaseConferenciaPedido("EmConferencia")).toBe("Em conferência");
    expect(labelFaseConferenciaPedido("AguardandoDecisaoFinanceiro")).toBe(
      "Aguardando decisão financeiro",
    );
  });

  it("conferentePodeEditarItem bloqueia cancelado e estados finais", () => {
    expect(conferentePodeEditarItem(true, "PendenteConferencia")).toBe(false);
    expect(conferentePodeEditarItem(false, "IntegradoSIDI")).toBe(false);
    expect(conferentePodeEditarItem(false, "FinalizadoParaIntegracao")).toBe(
      false,
    );
    expect(conferentePodeEditarItem(false, "PendenteConferencia")).toBe(true);
  });
});
