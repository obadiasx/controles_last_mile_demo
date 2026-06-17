import axios from "axios";
import { api } from "@api";
import type { ISupplier } from "../../../interfaces/ISupplier";
import { getApiErrorMessage } from "../../../utils/getApiErrorMessage";

export const patchFornecedorFormaPadraoFn = async (
  token: string,
  fornecedorId: number,
  formaPagamentoId: string | null,
): Promise<ISupplier> => {
  try {
    const response = await api.patch<ISupplier>(
      `/fornecedores/${fornecedorId}/forma-pagamento-padrao`,
      { forma_pagamento_id: formaPagamentoId },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (response.status === 200) {
      return response.data;
    }
    throw new Error("Resposta inesperada ao salvar forma de pagamento.");
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      throw new Error(
        getApiErrorMessage(err, "Não foi possível salvar a forma de pagamento."),
      );
    }
    if (err instanceof Error) throw err;
    throw new Error("Não foi possível salvar a forma de pagamento.");
  }
};
