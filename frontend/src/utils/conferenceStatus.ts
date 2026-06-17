/**
 * Status de item que encerram a linha na fila padrão do conferente (alinhado ao backend).
 */
export const STATUS_ITEM_ENCERRADO_FILA = new Set([
  "Concluido",
  "RecebidoConforme",
  "RejeitadoConferencia",
  "FinalizadoParaIntegracao",
  "IntegradoSIDI",
]);

export function itemAbertoNaFilaConferencia(status: string | undefined): boolean {
  if (!status) return true;
  return !STATUS_ITEM_ENCERRADO_FILA.has(status);
}

export function statusEhDivergencia(status: string | undefined): boolean {
  return status === "Divergente" || status === "RecebidoComDivergencia";
}

export function corChipStatusConferencia(status: string | undefined): {
  bg: string;
  color: string;
} {
  const s = status ?? "";
  if (s === "Pendente" || s === "PendenteConferencia") {
    return { bg: "#FFF3CD", color: "#856404" };
  }
  if (
    s === "Concluido" ||
    s === "FinalizadoParaIntegracao" ||
    s === "RecebidoConforme"
  ) {
    return { bg: "#E8F5E9", color: "#1B5E20" };
  }
  if (s === "Parcial") {
    return { bg: "#E8EAF6", color: "#283593" };
  }
  if (s === "NaoRecebido") {
    return { bg: "#FCE4EC", color: "#880E4F" };
  }
  if (s === "RejeitadoConferencia") {
    return { bg: "#FBE9E7", color: "#BF360C" };
  }
  if (s === "RecebidoComDivergencia" || s === "Divergente") {
    return { bg: "#FFF8E1", color: "#E65100" };
  }
  if (s === "PendenteDecisaoFinanceiro") {
    return { bg: "#F3E5F5", color: "#6A1B9A" };
  }
  if (s === "IntegradoSIDI") {
    return { bg: "#E3F2FD", color: "#0D47A1" };
  }
  return { bg: "#F5F5F5", color: "#424242" };
}

export function corChipFasePedido(fase: string | undefined): {
  bg: string;
  color: string;
} {
  const f = fase ?? "";
  if (f === "AguardandoRecebimento") {
    return { bg: "#ECEFF1", color: "#37474F" };
  }
  if (f === "EmConferencia") {
    return { bg: "#E3F2FD", color: "#1565C0" };
  }
  if (f === "AguardandoDecisaoFinanceiro") {
    return { bg: "#F3E5F5", color: "#6A1B9A" };
  }
  if (f === "ProntoParaIntegracao") {
    return { bg: "#E8F5E9", color: "#2E7D32" };
  }
  if (f === "IntegradoSIDI") {
    return { bg: "#E0F2F1", color: "#00695C" };
  }
  return { bg: "#F5F5F5", color: "#616161" };
}
