import axios from "axios";
import { api } from "@api";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";

type DeleteDailyMissionPayload = {
  token: string;
  solicitacaoId: string;
};

export type DeleteDailyMissionResponse = {
  solicitacao_id: string;
  itens_excluidos: number;
  mensagem: string;
};

export async function deleteDailyMissionFn(
  payload: DeleteDailyMissionPayload,
): Promise<DeleteDailyMissionResponse> {
  const { token, solicitacaoId } = payload;
  try {
    const response = await api.delete<DeleteDailyMissionResponse>(
      `/solicitacoes/${solicitacaoId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (response.status >= 200 && response.status < 300) {
      return response.data;
    }
    throw new Error("Resposta inesperada ao excluir solicitação.");
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      throw new Error(
        getApiErrorMessage(err, "Falha ao excluir a solicitação do dia."),
      );
    }
    if (err instanceof Error) throw err;
    throw new Error("Falha ao excluir a solicitação do dia.");
  }
}
