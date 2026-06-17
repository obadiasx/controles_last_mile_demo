# Baseline — módulos críticos com testes automatizados (conferência)

Referência para retrospectiva / Sprint 9 (pirâmide de qualidade). Lista **não exaustiva** do que já possui testes no repositório.

## Backend (pytest)

| Área | Ficheiros de teste (exemplos) |
|------|--------------------------------|
| Fases / domínio conferência | `test_conferencia_fase.py` |
| Financeiro (regras, prévia SIDI) | `test_conferencia_financeiro.py`, `test_conferencia_financeiro_auth.py` |
| Liberação global / exclusões | `test_conferencia_financeiro.py` (preview global) |
| Notificação SIDI / SMTP | `test_conferencia_notificacao_sidi.py` |
| Registro manual SIDI | `test_conferencia_registro_manual.py` |
| Smoke API / OpenAPI | `test_app_smoke.py` |
| Saúde (liveness/readiness) | `test_health.py` |
| Outros domínios | `test_compra_parcial_desdobramento.py`, `test_teto_preco_efetivo.py`, etc. |

## Frontend (Vitest)

| Área | Ficheiros (exemplos) |
|------|----------------------|
| Painel / filtros de fase | `conferencePanel.test.ts` |
| Fluxo liberação global | `financeGlobalReleaseFlow.test.ts` |
| Atualização de pedido conferência | `UpdateConferenceOrder.test.ts` |

## E2E (Playwright)

| Escopo | Local |
|--------|--------|
| Smoke login + redirect conferência | `frontend/e2e/conferencia-smoke.spec.ts` |

Fluxo completo autenticado (doca → financeiro → e-mail) depende de **ambiente de homologação** com dados e usuários de teste; o smoke automatizado cobre apenas rotas públicas e redirecionamento sem sessão.
