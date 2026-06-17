import axios from "axios";
import { api } from "@api";

export const sincronizeUnitsFn = async (token: string) => {
  try {
    const response = await api.post(
      `/sync/unidades`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (response.status === 200) {
      return response.data;
    }
    if (response.status === 401) {
      throw new Error("Falha na requisição para a API");
    }
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const message =
        err.response?.data?.message || err.message || "Falha na sincronização";
      throw new Error(message);
    }
    if (err instanceof Error) {
      throw new Error(err.message);
    }
    throw new Error("falha na sincronização desconhecida");
  }
};
