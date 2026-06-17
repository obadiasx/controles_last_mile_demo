import axios from "axios";
import { api } from "@api";

export const FetchDailyMissionsFn = async (
  token: string,
  data: string,
  comprador?: string
) => {
  try {
    // Barra final obrigatória: sem ela o FastAPI responde 307 e o Location pode apontar ao host interno do Docker.
    const response = await api.get(`/solicitacoes/`, {
      params: {
        data: data,
        comprador_id: comprador,
      },
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
