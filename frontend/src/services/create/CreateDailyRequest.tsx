import axios from "axios";
import { api } from "@api";

export const CreateDailyRequestFn = async (data: {
  data: string;
  comprador_id: string;
  observacoes: string;
  permitir_multiplas_no_dia?: boolean;
}, token: string) => {
  try {
    const response = await api.post("/solicitacoes/", data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
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
