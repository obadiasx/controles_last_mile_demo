import axios from "axios";
import { api } from "@api";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";

export const deleteDailyMissionItemFn = async (token: string, id: string) => {
  try {
    const response = await api.delete(`/solicitacoes-itens/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (response.status === 200 || response.status === 204) {
      return response.data;
    }
    if (response.status === 401) {
      throw new Error("Falha na requisição para a API");
    }
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      throw new Error(
        getApiErrorMessage(err, "Falha ao excluir o item. Tente novamente."),
      );
    }

    if (err instanceof Error) {
      throw new Error(err.message);
    }

    throw new Error("Falha ao excluir o item.");
  }
};
