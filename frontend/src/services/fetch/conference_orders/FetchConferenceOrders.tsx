import axios from "axios";
import type { IConferenceOrder } from "../../../interfaces/IConference";
import { api } from "@api";
import { getApiErrorMessage } from "../../../utils/getApiErrorMessage";

export const conferenceOrdersFn = async (
  token: string,
  supplierFilter: string,
  productFilter: string,
  incluirCancelados: boolean = false,
) => {
  try {
    const hasFilters = supplierFilter.trim() !== "" || productFilter.trim() !== "";

    const baseUrl = "/conferencia/pedidos";
    const incluirPart = incluirCancelados ? "&incluir_cancelados=true" : "";
    const queryParams = hasFilters
      ? `?skip=0&limit=50${incluirPart}&fornecedor_filtro=${supplierFilter}&produto_filtro=${productFilter}`
      : `?skip=0&limit=50${incluirPart}`;

    const response = await api.get<IConferenceOrder[]>(`${baseUrl}${queryParams}`, {
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

    throw new Error("Resposta inesperada do servidor");
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const message = getApiErrorMessage(
        err,
        err.message || "Falha na leitura de pedidos de compra",
      );
      throw new Error(message);
    }

    if (err instanceof Error) {
      throw new Error(err.message);
    }

    throw new Error("Falha na leitura de pedidos de compra desconhecida");
  }
};
