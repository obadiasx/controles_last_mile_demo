export interface IFormaPagamento {
    id: string;
    tipo: string;
    descricao: string;
    dias_prazo: number;
    codigo_cartao_4?: string | null;
    ativo: boolean;
}

export interface ISupplier {
    fantasia: string;
    box_complemento: string;
    contato: string;
    id: number;
    /** E-mail para envio de pedido ao fornecedor (cadastro local). */
    email?: string | null;
    forma_pagamento_padrao?: IFormaPagamento | null;
}

export interface IWriteOffSupplier {
    itemId: string;
    supplierId: number;
    quantity: number;
    unity: string;
    unitaryValue: number;
    formaPagamentoId: string;
    observacao?: string;
}