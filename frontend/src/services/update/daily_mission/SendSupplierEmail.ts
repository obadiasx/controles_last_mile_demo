import axios from "axios";
import { api } from "@api";
import { getApiErrorMessage } from "../../../utils/getApiErrorMessage";

export type SendSupplierEmailPayload = {
  token: string;
  solicitacaoId: string;
  fornecedorId: number;
  observacao?: string;
};

export async function sendSupplierEmailFn(payload: SendSupplierEmailPayload) {
  const { token, solicitacaoId, fornecedorId, observacao } = payload;
  try {
    const response = await api.post(
      `/solicitacoes/${solicitacaoId}/enviar-email-fornecedor`,
      { fornecedor_id: fornecedorId, observacao: observacao?.trim() || null },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      throw new Error(
        getApiErrorMessage(err, "Falha ao enviar pedido por e-mail para o fornecedor."),
      );
    }
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Falha ao enviar pedido por e-mail para o fornecedor.");
  }
}
