import { api } from "@api";
import axios from "axios";
import type { IFinanceOrderSummary } from "../../../interfaces/IConference";

export async function fetchFinanceOrderSummaryFn(
  token: string,
  pedidoId: number,
): Promise<IFinanceOrderSummary> {
  try {
    const response = await api.get<IFinanceOrderSummary>(
      `/conferencia/financeiro/pedidos/${pedidoId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const detail = err.response?.data?.detail;
      throw new Error(
        typeof detail === "string"
          ? detail
          : err.message || "Falha ao carregar pedido do financeiro.",
      );
    }
    throw new Error("Falha ao carregar pedido do financeiro.");
  }
}
