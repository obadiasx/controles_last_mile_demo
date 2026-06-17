import { api } from "@api";
import axios from "axios";
import type { IFinanceQueueItem } from "../../../interfaces/IConference";

export async function fetchFinanceQueueFn(
  token: string,
  fornecedorFiltro: string,
): Promise<IFinanceQueueItem[]> {
  try {
    const filtro = fornecedorFiltro.trim();
    const query = filtro
      ? `?skip=0&limit=100&fornecedor_filtro=${encodeURIComponent(filtro)}`
      : "?skip=0&limit=100";
    const response = await api.get<IFinanceQueueItem[]>(
      `/conferencia/financeiro/pedidos${query}`,
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
          : err.message || "Falha ao carregar fila do financeiro.",
      );
    }
    throw new Error("Falha ao carregar fila do financeiro.");
  }
}
