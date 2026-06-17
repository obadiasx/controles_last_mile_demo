import axios from "axios";
import { api } from "@api";

export const UpdateDailyNotes = async (
  id: string,
  notes: string,
  token: string
) => {
  try {
    const response = await api.patch(
      `/solicitacoes/${id}`,
      {
        observacoes: notes,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (response.data === 200) {
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
