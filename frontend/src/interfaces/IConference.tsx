import type React from "react";

export interface IConferenceOrder {
  pedido_id: number;
  item: number;
  fornecedor?: string;
  produto?: string;
  quantidade_esperada?: number;
  observacoes?: React.ReactNode;
  quantidade_fisica?: number;
  status_conferencia?: string;
  token?: string
  divergencia_id?: number
  descricao?: string
  data_criacao?: string
  /** Presente quando a listagem inclui itens cancelados na sincronização. */
  cancelado?: boolean
  origem_compra?: "comprador" | "financeiro"
  pedido_concluido?: boolean
  /** Fase macro do pedido (domínio Sprint 3). */
  fase_conferencia?: string
  tem_pendencia_financeira?: boolean
  quantidade_itens_pendentes_conferencia?: number
  quantidade_itens_pendencia_financeira?: number
  /** Unidade esperada (ex.: KG, CX) — principalmente origem financeiro. */
  unidade?: string | null
}

export interface IModalConferenceOrder extends IConferenceOrder {
  qtdPhysical: number
  notes: string
  conferenceStatus: string
  divergenceId?: number
}

export interface IConferenceOrderModal extends IConferenceOrder {
  onClose: () => void;
}

export interface IFinanceQueueItem {
  pedido_id: number;
  fase_conferencia: string;
  fornecedor_principal?: string | null;
  total_itens: number;
  total_itens_elegiveis_sidi: number;
  total_itens_excluidos_sidi: number;
}

export interface IFinanceOrderSummary {
  pedido_id: number;
  fase_conferencia: string;
  pedido_concluido: boolean;
  tem_pendencia_financeira: boolean;
  quantidade_itens_pendentes_conferencia: number;
  quantidade_itens_pendencia_financeira: number;
  itens: IConferenceOrder[];
  itens_incluidos_sidi: number[];
  itens_excluidos_sidi: number[];
  total_itens_incluidos_sidi: number;
  total_itens_excluidos_sidi: number;
}

export interface IFinanceGlobalExclusionLine {
  item: number;
  produto: string;
  quantidade_esperada: number;
  status_atual: string;
  motivo: string;
}

export interface IFinanceGlobalReleasePreview {
  pedido_id: number;
  itens_incluidos_sidi: number[];
  itens_excluidos_sidi: number[];
  total_itens_incluidos_sidi: number;
  total_itens_excluidos_sidi: number;
  linhas_excluidas: IFinanceGlobalExclusionLine[];
  confirmacao_obrigatoria: boolean;
  mensagem: string;
}

export interface ISidiSmtpConfig {
  id?: number;
  host: string;
  port: number;
  username: string;
  password: string;
  use_tls: boolean;
  remetente_email: string;
  ativo: boolean;
  /** Quando true, o e-mail de contingência SIDI é enviado ao concluir a conferência (fase Pronto para integração), sem liberação manual do financeiro. */
  modo_contingencia_email_automatico?: boolean;
}

export interface ISidiDestinatario {
  id: number;
  nome: string;
  email: string;
  ativo: boolean;
}

export interface ISidiNotificacaoResultado {
  pedido_id: number;
  enviado: boolean;
  mensagem: string;
}

export interface ISidiEnvioManualRegistro {
  id: number;
  pedido_id: number;
  enviado_em: string;
  enviado_por: string;
  canal_envio: string;
  protocolo?: string | null;
  observacao?: string | null;
}