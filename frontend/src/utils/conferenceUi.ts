/**
 * Rótulos em pt-BR para estados de item e fase de pedido (Sprint 4 / domínio v2).
 * Mantém valor técnico do backend separado do texto exibido ao usuário.
 */

const STATUS_ITEM_LABELS: Record<string, string> = {
  PendenteConferencia: "Pendente conferência",
  RecebidoConforme: "Recebido conforme",
  Parcial: "Parcial",
  NaoRecebido: "Não recebido",
  RejeitadoConferencia: "Rejeitado na conferência",
  RecebidoComDivergencia: "Recebido com divergência",
  PendenteDecisaoFinanceiro: "Pendente decisão financeiro",
  FinalizadoParaIntegracao: "Finalizado para integração",
  IntegradoSIDI: "Integrado SIDI",
  Pendente: "Pendente (legado)",
  Divergente: "Divergente (legado)",
  Concluido: "Concluído (legado)",
};

const FASE_PEDIDO_LABELS: Record<string, string> = {
  AguardandoRecebimento: "Aguardando recebimento",
  EmConferencia: "Em conferência",
  AguardandoDecisaoFinanceiro: "Aguardando decisão financeiro",
  ProntoParaIntegracao: "Pronto para integração",
  IntegradoSIDI: "Integrado SIDI",
};

export function labelStatusItemConferencia(status: string | undefined): string {
  if (!status) return "—";
  return STATUS_ITEM_LABELS[status] ?? status;
}

export function labelFaseConferenciaPedido(fase: string | undefined): string {
  if (!fase) return "—";
  return FASE_PEDIDO_LABELS[fase] ?? fase;
}

export function conferentePodeEditarItem(
  cancelado: boolean | undefined,
  status: string | undefined,
): boolean {
  if (cancelado) return false;
  const s = status ?? "";
  if (
    s === "IntegradoSIDI" ||
    s === "FinalizadoParaIntegracao" ||
    s === "Concluido"
  ) {
    return false;
  }
  return true;
}
