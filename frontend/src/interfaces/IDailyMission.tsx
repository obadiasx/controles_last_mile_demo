export interface IDailyMissionModalProps {
  onClose: () => void;
  itemId: number;
  itemDesc: string;
  dailyId: string;
  /** Pedido direto: grava fornecedor e forma no item */
  fornecedorId?: number;
  formaPagamentoRefId?: string;
}

export interface IDailyMission {
  id: string;
  comprador_id: string;
  data: string;
  data_criacao: string;
  data_atualizacao: string;
  observacoes: string;
  comprador: {
    username: string;
    name_full: string;
    email: string;
    enabled: boolean;
    role_id: string;
    first_access: boolean;
    id: string;
    nome: string;
  };
}

export interface IInsertDailyMissionItem {
  solicitacao_id: string;
  produto_codigo: number;
  quantidade: number;
  unidade: string;
  fornecedor_id?: number;
  forma_pagamento_ref_id?: string;
  /** Pedido direto: preço unitário estimado na unidade pedida */
  valor_unitario?: number;
}

export interface IShowDailyMissionItem {
  produto_codigo: number;
  quantidade: number;
  unidade: string;
  id: string;
  solicitacao_id: string;
  valor_maximo_aceitavel: number;
  comprado: boolean;
  valor_liberado: boolean;
  observacoes: string;
  produto: {
    codigo: number;
    descricao: string;
    unidade_compra: string;
    grupo_produto: string;
  };
  peso_total_calculado: number;
  /** Preenchidos quando o item já foi comprado (correção / exibição). */
  nome_fornecedor?: string | null;
  fornecedor_id?: number | null;
  quantidade_adquirida?: number | null;
  unidade_comprada?: string | null;
  valor_unitario?: number | null;
  forma_pagamento_ref_id?: string | null;
  /** Observação do lançamento de compra (API `observacao`). */
  observacao?: string | null;
}

/** Resposta do PATCH /solicitacoes-itens/.../baixa (extras em compra parcial). */
export type ICompraBaixaResponse = IShowDailyMissionItem & {
  mensagem_desdobramento?: string | null;
  saldo_item_id?: string | null;
};

export interface IDailyMissionHeader {
  comprador: string;
  id: string;
  data: string;
  observacoes: string;
}

export interface IDailyMissionHeaderModal {
  onClose: () => void;
  initialDate: string;
  /** Pedido ao fornecedor: comprador técnico fixo (`solicitacao_direta`). */
  modoPedidoDireto?: boolean;
}

export interface IDailyMissionItemCeagesp {
  unidade: string;
  quantidade: number;
  comprado: boolean;
  descricao: string;
  observacoes: string;
}
