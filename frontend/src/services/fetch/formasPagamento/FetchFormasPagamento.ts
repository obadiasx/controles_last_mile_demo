import axios from "axios";
import { api } from "@api";
import type { IFormaPagamento } from "../../../interfaces/ISupplier";
import { getApiErrorMessage } from "../../../utils/getApiErrorMessage";

export const fetchFormasPagamentoFn = async (
  token: string,
): Promise<IFormaPagamento[]> => {
  try {
    const response = await api.get<IFormaPagamento[]>("/formas-pagamento/", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 200) {
      return response.data;
    }
    throw new Error("Resposta inesperada ao listar formas de pagamento.");
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      throw new Error(
        getApiErrorMessage(err, "Falha ao carregar formas de pagamento."),
      );
    }
    if (err instanceof Error) throw err;
    throw new Error("Falha ao carregar formas de pagamento.");
  }
};
