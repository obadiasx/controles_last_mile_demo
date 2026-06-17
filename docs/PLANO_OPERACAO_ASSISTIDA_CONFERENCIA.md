# Plano de operação assistida — Conferência unificada

Documento operacional para go-live e primeiros dias úteis (Sprint 9). Complementa `PLANO_SPRINT_CONFERENCIA_UNIFICADA.md`.

## 1. Antes do corte

- Confirmar variáveis de ambiente (API, CORS, PostgreSQL, credenciais SMTP se e-mail estiver ativo).
- Validar `GET /health` (liveness) e `GET /health/ready` (readiness com banco) no ambiente-alvo.
- Homologação: executar suíte `python -m pytest` (raiz do repositório) e `npm test` + `npm run test:e2e` no `frontend` (após `npx playwright install chromium` na primeira vez).
- Revisar permissões de perfis: conferente, financeiro (ex.: `conferencia:visualizar_detalhes`, `solicitacoes_dia:atualizar`, admin de destinatários conforme política interna).

## 2. Dia D (go-live)

- Janela acordada com operação (baixo volume ou pausa curta se necessário).
- Um responsável técnico online para **rollback de configuração** (não código): desligar SMTP, reverter flags ou apontar frontend para API estável, conforme runbook da infraestrutura.
- Monitorar erros HTTP 5xx e latência na API; checar logs de aplicação e falhas de conexão ao banco.

## 3. Primeiros 5 dias úteis

- **Daily curta** (15 min) com operação: bloqueios, dúvidas de regra, falsos positivos na fila financeira.
- Registrar incidentes (hora, usuário, pedido, captura de tela ou mensagem de erro). Mensagens da API FastAPI (`detail`) passam a aparecer com mais clareza na tela de conferência após a Sprint 9.
- **Registro manual SIDI** (Sprint 8.1): usar quando o e-mail automático não refletir a realidade; segundo registro exige observação.

## 4. Escalação

1. Conferência / doca — checar filtros, fornecedor ambíguo, cancelados.
2. Financeiro — fila, decisão por linha, liberação global (duas etapas + ciência de exclusões).
3. TI — health/readiness, banco, SMTP (porta, SPF/DKIM, credenciais).

## 5. Pós-estabilização

- Retrospectiva: ajustar checklist e este plano conforme o que ocorreu na prática.
- Manter E2E smoke (`frontend/e2e`) verde no pipeline ou antes de releases.
