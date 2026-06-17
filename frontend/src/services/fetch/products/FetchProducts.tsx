import axios from "axios";
import { api } from "@api";

export const FetchProductsFn = async (token: string, search: string) => {
  try {
    const response = await api.get("/produtos/search", {
      params: { q: search },
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
        "Falha na leitura de produtos";
      throw new Error(message);
    }
    if (err instanceof Error) {
      throw new Error(err.message);
    }
    throw new Error("Falha na leitura de produtos desconhecida");
  }
};
