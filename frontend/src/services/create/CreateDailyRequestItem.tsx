import axios from "axios";
import { api } from "@api";
import type { IInsertDailyMissionItem } from "../../interfaces/IDailyMission";

export const CreateDailyRequestItemFn = async (
  token: string,
  payload: IInsertDailyMissionItem,
) => {
  const {
    produto_codigo,
    quantidade,
    solicitacao_id,
    unidade,
    fornecedor_id,
    forma_pagamento_ref_id,
    valor_unitario,
  } = payload;

  const body: Record<string, unknown> = {
    produto_codigo,
    quantidade,
    solicitacao_id,
    unidade,
  };
  if (fornecedor_id != null) {
    body.fornecedor_id = fornecedor_id;
  }
  if (forma_pagamento_ref_id != null) {
    body.forma_pagamento_ref_id = forma_pagamento_ref_id;
  }
  if (valor_unitario != null && Number.isFinite(valor_unitario)) {
    body.valor_unitario = valor_unitario;
  }

  try {
    const response = await api.post(`/solicitacoes-itens/`, body, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status >= 200 && response.status < 300) {
      return response.data;
    }
    if (response.status === 401) {
      throw new Error("Falha na requisição para a API!");
    }
    throw new Error("Resposta inesperada ao incluir item.");
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
