import axios from "axios";
import { api } from "@api";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";

export const cancelCompraSolicitacaoItemFn = async (
  token: string,
  itemId: string,
) => {
  try {
    const response = await api.post(
      `/solicitacoes-itens/${itemId}/cancelar-compra`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    if (response.status === 200) {
      return response.data;
    }
    if (response.status === 401) {
      throw new Error("Falha na requisição para a API");
    }
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      throw new Error(
        getApiErrorMessage(
          err,
          "Não foi possível cancelar a compra. Tente novamente.",
        ),
      );
    }

    if (err instanceof Error) {
      throw new Error(err.message);
    }

    throw new Error("Não foi possível cancelar a compra.");
  }
};
