import axios from "axios";
import { api } from "@api";
import type { IShowDailyMissionItem } from "../../../interfaces/IDailyMission";

export const updateDailyitemFn = async (
  { quantidade, unidade, id }: IShowDailyMissionItem,
  token: string
) => {
  try {
    const response = await api.patch(
      `/solicitacoes-itens/${id}`,
      { quantidade, unidade },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (response.status === 200) {
      return response.data;
    }
    if (response.status == 401) {
      throw new Error("Falha na requisição para a API");
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
