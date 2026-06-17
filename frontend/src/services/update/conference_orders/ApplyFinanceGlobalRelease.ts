import { api } from "@api";
import axios from "axios";
import type { IFinanceGlobalReleasePreview } from "../../../interfaces/IConference";

export async function applyFinanceGlobalReleaseFn(input: {
  token: string;
  pedido_id: number;
  confirmar: boolean;
  ciente_exclusoes: boolean;
}): Promise<IFinanceGlobalReleasePreview> {
  try {
    const response = await api.post<IFinanceGlobalReleasePreview>(
      `/conferencia/financeiro/pedidos/${input.pedido_id}/liberacao-global`,
      {
        confirmar: input.confirmar,
        ciente_exclusoes: input.ciente_exclusoes,
      },
      {
        headers: { Authorization: `Bearer ${input.token}` },
      },
    );
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const detail = err.response?.data?.detail;
      throw new Error(
        typeof detail === "string"
          ? detail
          : err.message || "Falha na liberação global do pedido.",
      );
    }
    throw new Error("Falha na liberação global do pedido.");
  }
}
