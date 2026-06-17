import { api } from "@api";
import axios from "axios";

export type FinanceLineAction =
  | "liberar_sidi"
  | "manter_fora"
  | "pendencia_financeira";

export async function applyFinanceLineActionFn(input: {
  token: string;
  pedido_id: number;
  item: number;
  acao: FinanceLineAction;
  observacoes?: string;
}) {
  try {
    const response = await api.patch(
      `/conferencia/financeiro/pedidos/${input.pedido_id}/${input.item}/acao`,
      {
        acao: input.acao,
        observacoes: input.observacoes ?? "",
      },
      {
        headers: { Authorization: `Bearer ${input.token}` },
      },
    );
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const detail = err.response?.data?.detail;
      throw new Error(
        typeof detail === "string"
          ? detail
          : err.message || "Falha na ação financeira da linha.",
      );
    }
    throw new Error("Falha na ação financeira da linha.");
  }
}
