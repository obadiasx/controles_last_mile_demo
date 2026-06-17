import { beforeEach, describe, expect, it, vi } from "vitest";

const { patchMock } = vi.hoisted(() => ({
  patchMock: vi.fn(),
}));

vi.mock("@api", () => ({
  api: {
    patch: patchMock,
  },
}));

import { updateConferenceOrderFn } from "./UpdateConferenceOrder";

describe("updateConferenceOrderFn", () => {
  beforeEach(() => {
    patchMock.mockReset();
  });

  it("envia payload com campos de financeiro direto", async () => {
    patchMock.mockResolvedValue({ data: { ok: true } });

    await updateConferenceOrderFn({
      pedido_id: 10,
      item: 2,
      token: "token-x",
      conferenceStatus: "Parcial",
      qtdPhysical: 5,
      notes: "Conferido",
      origem_compra: "financeiro",
      quantidade_esperada: 9,
      unidade: "KG",
      divergenceId: 3,
    });

    expect(patchMock).toHaveBeenCalledTimes(1);
    expect(patchMock).toHaveBeenCalledWith(
      "/conferencia/pedidos/10/2",
      {
        status_conferencia: "Parcial",
        quantidade_fisica: 5,
        observacoes: "Conferido",
        divergencia_id: null,
        quantidade_esperada: 9,
        unidade: "KG",
      },
      {
        headers: {
          Authorization: "Bearer token-x",
        },
      },
    );
  });

  it("nao envia quantidade esperada/unidade para origem comprador", async () => {
    patchMock.mockResolvedValue({ data: { ok: true } });

    await updateConferenceOrderFn({
      pedido_id: 11,
      item: 4,
      token: "token-y",
      conferenceStatus: "RecebidoConforme",
      qtdPhysical: 3,
      notes: "",
      origem_compra: "comprador",
      quantidade_esperada: 12,
      unidade: "CX",
    });

    const chamada = patchMock.mock.calls[0];
    const body = chamada[1] as Record<string, unknown>;
    expect(body.status_conferencia).toBe("RecebidoConforme");
    expect(body.quantidade_fisica).toBe(3);
    expect(body).not.toHaveProperty("quantidade_esperada");
    expect(body).not.toHaveProperty("unidade");
  });

  it("retorna erro amigavel quando token nao existe", async () => {
    await expect(
      updateConferenceOrderFn({
        pedido_id: 1,
        item: 1,
        conferenceStatus: "PendenteConferencia",
        qtdPhysical: 0,
        notes: "",
      }),
    ).rejects.toThrow("Sessão inválida. Faça login novamente.");

    expect(patchMock).not.toHaveBeenCalled();
  });

  it("propaga detalhe textual de erro da API", async () => {
    patchMock.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 400",
      response: {
        data: {
          detail: "Alteração não permitida para esta origem.",
        },
      },
    });

    await expect(
      updateConferenceOrderFn({
        pedido_id: 22,
        item: 1,
        token: "token-z",
        conferenceStatus: "Parcial",
        qtdPhysical: 1,
        notes: "x",
      }),
    ).rejects.toThrow("Alteração não permitida para esta origem.");
  });
});
