import axios from "axios";
import { api } from "@api";
import type { ISupplier } from "../../../interfaces/ISupplier";

export const fetchSupplierByIdFn = async (
  token: string,
  fornecedorId: number,
): Promise<ISupplier> => {
  try {
    const response = await api.get<ISupplier>(`/fornecedores/${fornecedorId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (response.status === 200) {
      return response.data;
    }
    if (response.status === 401) {
      throw new Error("Token inválido ou expirado");
    }
    throw new Error("Resposta inesperada ao carregar fornecedor");
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        "Falha ao carregar fornecedor";
      throw new Error(
        typeof message === "string" ? message : "Falha ao carregar fornecedor",
      );
    }
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Falha ao carregar fornecedor");
  }
};
