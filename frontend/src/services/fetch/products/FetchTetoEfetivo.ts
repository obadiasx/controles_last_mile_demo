import axios from "axios";
import { api } from "@api";
import type { ITetoEfetivoResponse } from "../../../interfaces/IProdutoTeto";

export const fetchTetoEfetivoFn = async (
  token: string,
  codigo: number,
  unidade: string,
): Promise<ITetoEfetivoResponse> => {
  try {
    const response = await api.get(`/produtos/${codigo}/teto-efetivo`, {
      params: { unidade: unidade.trim() },
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 200) return response.data;
    throw new Error("Falha ao calcular teto");
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        "Falha ao calcular teto efetivo";
      throw new Error(
        typeof message === "string" ? message : "Falha ao calcular teto efetivo",
      );
    }
    if (err instanceof Error) throw err;
    throw new Error("Falha ao calcular teto efetivo");
  }
};
