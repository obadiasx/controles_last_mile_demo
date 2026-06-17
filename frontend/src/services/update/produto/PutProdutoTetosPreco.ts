import axios from "axios";
import { api } from "@api";
import type { ITetoUnidadeLinha } from "../../../interfaces/IProdutoTeto";

export const putProdutoTetosPrecoFn = async (
  token: string,
  codigo: number,
  tetos: { unidade: string; valor_maximo_aceitavel: number | null }[],
): Promise<ITetoUnidadeLinha[]> => {
  try {
    const response = await api.put(
      `/produtos/${codigo}/tetos-preco-unidade`,
      { tetos },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (response.status === 200) return response.data;
    throw new Error("Falha ao salvar");
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const raw = err.response?.data?.detail;
      const message =
        typeof raw === "string"
          ? raw
          : err.response?.data?.message ||
            err.message ||
            "Falha ao salvar tetos de preço";
      throw new Error(message);
    }
    if (err instanceof Error) throw err;
    throw new Error("Falha ao salvar tetos de preço");
  }
};
