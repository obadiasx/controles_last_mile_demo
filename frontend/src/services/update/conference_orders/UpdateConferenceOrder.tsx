import { api } from "@api";
import axios from "axios";
import type { IModalConferenceOrder } from "../../../interfaces/IConference";

function mensagemErroApi(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const raw = err.response?.data as { detail?: unknown; message?: string };
    const d = raw?.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) {
      return d
        .map((x: { msg?: string }) => x?.msg)
        .filter(Boolean)
        .join(" ");
    }
    if (raw?.message) return String(raw.message);
    return err.message || "Falha na atualização";
  }
  if (err instanceof Error) return err.message;
  return "Falha na atualização";
}

export const updateConferenceOrderFn = async (data: IModalConferenceOrder) => {
  const token = data.token;
  if (!token) {
    throw new Error("Sessão inválida. Faça login novamente.");
  }

  const body: Record<string, unknown> = {
    status_conferencia: data.conferenceStatus,
    quantidade_fisica: data.qtdPhysical,
    observacoes: data.notes ?? "",
    divergencia_id: null,
  };

  const origem = (data.origem_compra || "financeiro").toLowerCase();
  if (origem === "financeiro") {
    if (data.quantidade_esperada != null) {
      body.quantidade_esperada = data.quantidade_esperada;
    }
    if (data.unidade !== undefined) {
      body.unidade = data.unidade === "" ? null : data.unidade;
    }
  }

  try {
    const response = await api.patch(
      `/conferencia/pedidos/${data.pedido_id}/${data.item}`,
      body,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return response.data;
  } catch (err: unknown) {
    throw new Error(mensagemErroApi(err));
  }
};
