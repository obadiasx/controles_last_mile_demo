import axios from "axios";
import { api } from "@api";
import type { ITetoUnidadeLinha } from "../../../interfaces/IProdutoTeto";

export const fetchProdutoTetosPrecoFn = async (
  token: string,
  codigo: number,
): Promise<ITetoUnidadeLinha[]> => {
  try {
    const response = await api.get(`/produtos/${codigo}/tetos-preco-unidade`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 200) return response.data;
    throw new Error("Falha ao carregar tetos");
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        "Falha ao carregar tetos de preço";
      throw new Error(
        typeof message === "string" ? message : "Falha ao carregar tetos de preço",
      );
    }
    if (err instanceof Error) throw err;
    throw new Error("Falha ao carregar tetos de preço");
  }
};
