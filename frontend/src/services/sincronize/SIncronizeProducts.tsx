import axios from "axios";
import { api } from "@api";

export const sincronizeProductsFn = async (token: string) => {
  try {
    const response = await api.post(
      "/sync/produtos",
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
      throw new Error("Token inválido ou expirado");
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
