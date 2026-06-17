import axios from "axios";
import { api } from "@api";
import type { ISupplier } from "../../../interfaces/ISupplier";
import { getApiErrorMessage } from "../../../utils/getApiErrorMessage";

export const patchFornecedorEmailEnvioFn = async (
  token: string,
  fornecedorId: number,
  email: string | null,
): Promise<ISupplier> => {
  try {
    const response = await api.patch<ISupplier>(
      `/fornecedores/${fornecedorId}/email-envio`,
      { email: email === "" ? null : email },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (response.status === 200) {
      return response.data;
    }
    throw new Error("Resposta inesperada ao salvar e-mail do fornecedor.");
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      throw new Error(
        getApiErrorMessage(err, "Não foi possível salvar o e-mail do fornecedor."),
      );
    }
    if (err instanceof Error) throw err;
    throw new Error("Não foi possível salvar o e-mail do fornecedor.");
  }
};
