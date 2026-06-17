import type { IConferenceOrder } from "../interfaces/IConference";
import { itemAbertoNaFilaConferencia } from "./conferenceStatus";

export type FasePainelFiltro = "todas" | "abertas" | "aguardando_financeiro";

export interface PainelConferenciaResumo {
  fornecedoresPendentes: string[];
  itensPendentes: number;
  pendenciasPorFornecedor: Array<{ fornecedor: string; total: number }>;
  itensAguardandoFinanceiro: number;
}

export function resumirPainelConferencia(
  pedidos: IConferenceOrder[],
  incluirAguardandoFinanceiro: boolean,
): PainelConferenciaResumo {
  const pedidosVisiveis = incluirAguardandoFinanceiro
    ? pedidos
    : pedidos.filter((o) => o.fase_conferencia !== "AguardandoDecisaoFinanceiro");

  const itensAbertos = pedidosVisiveis.filter(
    (o) => itemAbertoNaFilaConferencia(o.status_conferencia) && !o.cancelado,
  );

  const fornecedoresPendentes = Array.from(
    new Set(itensAbertos.map((o) => (o.fornecedor ?? "").trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const pendenciasPorFornecedor = fornecedoresPendentes.map((fornecedor) => ({
    fornecedor,
    total: itensAbertos.filter((o) => (o.fornecedor ?? "").trim() === fornecedor).length,
  }));

  const itensAguardandoFinanceiro = pedidosVisiveis.filter(
    (o) => o.fase_conferencia === "AguardandoDecisaoFinanceiro" && !o.cancelado,
  ).length;

  return {
    fornecedoresPendentes,
    itensPendentes: itensAbertos.length,
    pendenciasPorFornecedor,
    itensAguardandoFinanceiro,
  };
}

export function aplicarFiltroFasePainel(
  pedidos: IConferenceOrder[],
  filtro: FasePainelFiltro,
  incluirAguardandoFinanceiro: boolean,
): IConferenceOrder[] {
  const pedidosVisiveis = incluirAguardandoFinanceiro
    ? pedidos
    : pedidos.filter((o) => o.fase_conferencia !== "AguardandoDecisaoFinanceiro");

  if (filtro === "todas") return pedidosVisiveis;
  if (filtro === "aguardando_financeiro") {
    return pedidosVisiveis.filter(
      (o) =>
        o.fase_conferencia === "AguardandoDecisaoFinanceiro" && !o.cancelado,
    );
  }
  return pedidosVisiveis.filter(
    (o) => itemAbertoNaFilaConferencia(o.status_conferencia) && !o.cancelado,
  );
}
