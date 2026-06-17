/**
 * Usuário técnico da missão "pedido direto ao fornecedor" (e-mail).
 * Deve existir no cadastro, com perfil de comprador, e aparecer em /users/buyers/active.
 */
export const SOLICITACAO_DIRETA_COMPRADOR_USERNAME = "solicitacao_direta" as const;

/** Rótulo exibido na interface (aba, modal) em vez do login técnico. */
export const SOLICITACAO_DIRETA_EXIBICAO = "Solicitação direta";

export function isSolicitacaoDiretaUsername(
  username: string | null | undefined,
): boolean {
  if (!username) return false;
  return username === SOLICITACAO_DIRETA_COMPRADOR_USERNAME;
}

export function labelCompradorParaExibicao(username: string): string {
  return isSolicitacaoDiretaUsername(username)
    ? SOLICITACAO_DIRETA_EXIBICAO
    : username;
}

/** Mínimo para pedido direto: e-mail de envio + forma de pagamento padrão (Pagamento / e-mail). */
export type FornecedorPedidoDiretoMin = {
  email?: string | null;
  forma_pagamento_padrao?: { id?: string } | null;
};

export function fornecedorAptoPedidoDireto(
  s: FornecedorPedidoDiretoMin,
): boolean {
  const emailOk = (s.email ?? "").trim().length > 0;
  const formaOk = Boolean(s.forma_pagamento_padrao?.id);
  return emailOk && formaOk;
}
