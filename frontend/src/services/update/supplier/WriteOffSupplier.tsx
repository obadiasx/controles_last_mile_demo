import axios from "axios";
import { api } from "@api";
import { getApiErrorMessage } from "../../../utils/getApiErrorMessage";
import type { ICompraBaixaResponse } from "../../../interfaces/IDailyMission";

export const WriteOffSupplierFn = async (
  token: string,
  itemId: string,
  supplierId: number,
  quantity: number,
  unity: string,
  unitaryValue: number,
  formaPagamentoId: string,
  observacao?: string,
): Promise<ICompraBaixaResponse> => {
  try {
    const response = await api.patch(
      `/solicitacoes-itens/${itemId}/baixa`,
      {
        fornecedor_id: supplierId,
        quantidade_adquirida: quantity,
        unidade_comprada: unity,
        valor_unitario: unitaryValue,
        forma_pagamento_id: formaPagamentoId,
        observacao: observacao?.trim() || undefined,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    if (response.status === 200) {
      return response.data as ICompraBaixaResponse;
    }
    if (response.status == 401) {
      throw new Error("Falha na requisição para a API");
    }
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      throw new Error(
        getApiErrorMessage(err, "Falha ao registrar a compra. Verifique os dados."),
      );
    }
    if (err instanceof Error) {
      throw new Error(err.message);
    }
    throw new Error("Falha ao registrar a compra.");
  }
};
