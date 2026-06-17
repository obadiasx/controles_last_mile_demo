import axios from "axios";
import { api } from "@api";
import { getApiErrorMessage } from "../../../utils/getApiErrorMessage";

export type ConcluirPedidoDiretoPayload = {
  token: string;
  solicitacaoId: string;
  fornecedorId: number;
  observacao?: string;
};

export type ConcluirPedidoDiretoResponse = {
  solicitacao_id: string;
  fornecedor_id: number;
  fornecedor_nome: string;
  total_itens: number;
  enviado_por: string;
  mensagem: string;
  email_enviado?: boolean;
  aviso_email?: string | null;
};

export async function concluirPedidoDiretoFn(
  payload: ConcluirPedidoDiretoPayload,
): Promise<ConcluirPedidoDiretoResponse> {
  const { token, solicitacaoId, fornecedorId, observacao } = payload;
  try {
    const response = await api.post<ConcluirPedidoDiretoResponse>(
      `/solicitacoes/${solicitacaoId}/pedido-direto/concluir`,
      {
        fornecedor_id: fornecedorId,
        observacao: observacao?.trim() || null,
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (response.status >= 200 && response.status < 300) {
      return response.data;
    }
    throw new Error("Resposta inesperada ao concluir pedido direto.");
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      throw new Error(
        getApiErrorMessage(
          err,
          "Falha ao concluir pedido direto (e-mail e registro de compra).",
        ),
      );
    }
    if (err instanceof Error) throw err;
    throw new Error("Falha ao concluir pedido direto (e-mail e registro de compra).");
  }
}
