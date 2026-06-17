import axios from "axios";
import { api } from "@api";

export const FetchDailyMissionItensFn = async (token: string, id: string) => {
  try {
    const response = await api.get(`/solicitacoes-itens/solicitacao/${id}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })

    if(response.status === 200) {
        return response.data
    }
    if(response.status === 401) {
        throw new Error("Falha na requisição da API")
    }
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Falha na leitura de pedidos de compra";
      throw new Error(message);
    }

    if (err instanceof Error) {
      throw new Error(err.message);
    }

    throw new Error("Falha na leitura de pedidos de compra desconhecida");
  }
};
