export type FinanceGlobalReleaseStep = "preview" | "confirmacao_final";

export function proximoPassoLiberacaoGlobal(
  passoAtual: FinanceGlobalReleaseStep,
): FinanceGlobalReleaseStep {
  if (passoAtual === "preview") return "confirmacao_final";
  return "confirmacao_final";
}

export function podeConfirmarLiberacaoGlobal(
  passoAtual: FinanceGlobalReleaseStep,
  cienteExclusoes: boolean,
): boolean {
  return passoAtual === "confirmacao_final" && cienteExclusoes;
}
