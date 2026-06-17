import { api } from "@api";
import axios from "axios";
import type {
  ISidiDestinatario,
  ISidiEnvioManualRegistro,
  ISidiNotificacaoResultado,
  ISidiSmtpConfig,
} from "../../interfaces/IConference";

function extractMsg(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
    return err.message || fallback;
  }
  return fallback;
}

export async function getSidiSmtpConfigFn(token: string): Promise<ISidiSmtpConfig> {
  try {
    const r = await api.get<ISidiSmtpConfig>("/conferencia/admin/notificacao-sidi/smtp", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return r.data;
  } catch (err) {
    throw new Error(extractMsg(err, "Falha ao carregar SMTP."));
  }
}

export async function saveSidiSmtpConfigFn(
  token: string,
  payload: ISidiSmtpConfig,
): Promise<ISidiSmtpConfig> {
  try {
    const r = await api.put<ISidiSmtpConfig>(
      "/conferencia/admin/notificacao-sidi/smtp",
      payload,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return r.data;
  } catch (err) {
    throw new Error(extractMsg(err, "Falha ao salvar SMTP."));
  }
}

export async function listSidiDestinatariosFn(token: string): Promise<ISidiDestinatario[]> {
  try {
    const r = await api.get<ISidiDestinatario[]>(
      "/conferencia/admin/notificacao-sidi/destinatarios",
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return r.data;
  } catch (err) {
    throw new Error(extractMsg(err, "Falha ao carregar destinatários."));
  }
}

export async function createSidiDestinatarioFn(
  token: string,
  payload: Omit<ISidiDestinatario, "id">,
): Promise<ISidiDestinatario> {
  try {
    const r = await api.post<ISidiDestinatario>(
      "/conferencia/admin/notificacao-sidi/destinatarios",
      payload,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return r.data;
  } catch (err) {
    throw new Error(extractMsg(err, "Falha ao criar destinatário."));
  }
}

export async function toggleSidiDestinatarioFn(
  token: string,
  id: number,
  ativo: boolean,
): Promise<ISidiDestinatario> {
  try {
    const r = await api.patch<ISidiDestinatario>(
      `/conferencia/admin/notificacao-sidi/destinatarios/${id}`,
      { ativo },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return r.data;
  } catch (err) {
    throw new Error(extractMsg(err, "Falha ao atualizar destinatário."));
  }
}

export async function dispararNotificacaoPedidoSidiFn(
  token: string,
  pedidoId: number,
): Promise<ISidiNotificacaoResultado> {
  try {
    const r = await api.post<ISidiNotificacaoResultado>(
      `/conferencia/financeiro/pedidos/${pedidoId}/notificar-sidi`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return r.data;
  } catch (err) {
    throw new Error(extractMsg(err, "Falha ao disparar e-mail de contingência."));
  }
}

export async function listRegistrosEnvioManualSidiFn(
  token: string,
  pedidoId: number,
): Promise<ISidiEnvioManualRegistro[]> {
  try {
    const r = await api.get<ISidiEnvioManualRegistro[]>(
      `/conferencia/financeiro/pedidos/${pedidoId}/registro-envio-manual`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return r.data;
  } catch (err) {
    throw new Error(extractMsg(err, "Falha ao carregar histórico de envio manual."));
  }
}

export async function registrarEnvioManualSidiFn(
  token: string,
  pedidoId: number,
  payload: { protocolo?: string; observacao?: string },
): Promise<ISidiEnvioManualRegistro> {
  try {
    const r = await api.post<ISidiEnvioManualRegistro>(
      `/conferencia/financeiro/pedidos/${pedidoId}/registro-envio-manual`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return r.data;
  } catch (err) {
    throw new Error(extractMsg(err, "Falha ao registrar envio manual do SIDI."));
  }
}
