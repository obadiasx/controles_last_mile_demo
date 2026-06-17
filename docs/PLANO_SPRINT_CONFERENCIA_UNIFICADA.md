# Plano de Sprint — Conferência Unificada

Documento vivo: alinhar com `MODELAGEM_CONFERENCIA_PEDIDO_E_ITENS.md` e com a `ESTRATEGIA_CONFERENCIA_UNIFICADA.md` quando houver divergência, prevalece a **modelagem** + o que for acordado em retrospectiva.

## 1) Objetivo do plano

Organizar a implementação da conferência unificada de forma **incremental e orgânica**, com entregas semanais, **mitigando risco** (domínio antes de UI sensível, financeiro linha antes de global, e-mail por último na cadeia crítica) e mantendo **testes unitários no núcleo de domínio** como critério de qualidade contínuo (ver §2.3 e cada sprint).

### Índice

| § | Conteúdo |
|---|----------|
| **2** | Visão do roadmap, princípios, dependências, testes, pirâmide de qualidade |
| **3** | Cronologia das Sprints 0–9 (com bloco **Testes** em cada uma) |
| **4** | Épicos |
| **5** | Cadência (cerimônias) |
| **6** | Riscos e mitigação |
| **7** | Resultado esperado |
| **8** | Saneamento técnico final |

---

## 2) Estrutura do plano (evolução)

O roadmap foi **estendido** com **sprints intermediárias** após a Sprint 2, para acomodar o modelo descrito em `MODELAGEM_CONFERENCIA_PEDIDO_E_ITENS.md` (fases no **pedido**, estados nos **itens**, decisão **financeira** e integração **SIDI** com transparência).

- **Sprints 0–3:** histórico, base, recepção e **fundação de domínio** (pedido × itens); **Sprints 0, 1, 2 e 3 concluídas** (ver status em cada sprint).
- **Sprints 3–5:** conferência — **domínio**, **UI do conferente** e **painel da doca**.
- **Sprints 6–7:** **financeiro** — fila, decisão por linha, liberação global e alertas de exclusão no SIDI.
- **Sprints 8–9:** encerramento do ciclo (e-mail / admin) e estabilização.

Cadência sugerida: **1 sprint = 1 semana** (ajustar conforme capacidade).

### 2.1 Princípios da reorganização (processo orgânico + risco)

1. **Domínio antes de telas arriscadas** — regras de fase do pedido e de item ficam em serviços testáveis **antes** (Sprint 3) de multiplicar superfícies de UI no financeiro (Sprints 6–7).
2. **Fatias verticais finas** — cada sprint entrega algo **demonstrável**; evitar “Sprint só de modelagem” sem critério de aceite verificável (API + testes contam como entrega).
3. **Caminho de menor risco no financeiro** — decisão **por linha** (Sprint 6) antes da ação **global** (Sprint 7), para reduzir blast radius e validar regras de elegibilidade ao SIDI.
4. **Integração e e-mail por último na cadeia crítica** — SMTP e disparo (Sprint 8) dependem de gatilhos estáveis; estabilização dedicada (Sprint 9).
5. **Qualidade não é sprint à parte** — testes unitários do núcleo de domínio são **contínuos**; definição de pronto exige cobertura mínima acordada (ver §2.4).

### 2.2 Dependências entre sprints (ordem para mitigar risco)

```mermaid
flowchart LR
  S0[S0 Alinhamento] --> S1[S1 Base]
  S1 --> S2[S2 Recepção UX]
  S2 --> S3[S3 Domínio + testes]
  S3 --> S4[S4 Conferente UI]
  S4 --> S5[S5 Painel doca]
  S3 --> S6[S6 Financeiro I]
  S5 --> S6
  S6 --> S7[S7 Financeiro II]
  S7 --> S8[S8 E-mail SMTP]
  S8 --> S9[S9 Go-live]
```

- **S3 é bloqueante** para S4–S7 em tudo que depender dos novos estados e da API.
- **S6 bloqueia S7** conceitualmente (a global presupõe regras já validadas na linha).
- **S8** só depois de **S7** para não acoplar e-mail a regras ainda mutáveis.

### 2.3 Testes unitários — obrigatórios em todo o núcleo

| Camada | O que testar (exemplos) | Onde priorizar |
|--------|-------------------------|----------------|
| **Domínio** | `recalcular_pedido_apos_mudanca_item`, transições de `fase_conferencia`, invariantes por origem de compra | Sprints 3, 6, 7 (regras novas = testes novos ou atualizados) |
| **Serviços / use cases** | Elegibilidade ao pacote SIDI, montagem do payload “incluídos / excluídos” | Sprints 6–7 |
| **Frontend** | Funções puras (mapeamento de status → rótulo/cor), hooks de formulário, validações | Sprints 4–5 |
| **Integração SMTP** | Envio com adapter mockado; **não** substitui unitário do domínio | Sprint 8 |

**Definição de pronto (mínimo):** alteração em regra de negócio de conferência **sem** teste unitário correspondente **não** mergeia, salvo exceção explícita registrada em retrospectiva.

### 2.4 Pirâmide de qualidade (referência)

- **Base:** muitos testes **unitários** rápidos (domínio, utilitários).
- **Meio:** testes de **integração** (API + banco em ambiente de teste) nas transições críticas.
- **Topo:** E2E pontual (Sprint 9), sem tentar cobrir tudo em E2E.

---

## 3) Cronologia das sprints (detalhamento)

## Sprint 0 — Preparação e alinhamento (3-5 dias)

**Objetivo:** reduzir risco antes do desenvolvimento.

**Status:** **Finalizada (OK)**.

### Escopo

- Revisão final do fluxo unificado com Mara e Otniel.
- Definição final dos status de conferência e pendência.
- Mapeamento técnico dos dados obrigatórios para e-mail e lançamento manual no SIDI.

### Entregáveis

- Checklist funcional validado.
- Critérios de aceite por fluxo.
- Backlog quebrado em histórias menores.

### Critério de pronto

- Não há dúvidas de regra de negócio para conferente e financeiro.

### Registro de conclusão

- Fluxo unificado revisado e validado para continuidade.
- Regras-base de conferência e pendências consolidadas em documentação.
- Backlog inicial estruturado para execução da Sprint 1.

### Testes (obrigatório)

- Acordo de equipe sobre **ferramenta e pasta** de testes; lista dos **primeiros cenários de domínio** a cobrir quando a Sprint 3 iniciar.

---

## Sprint 1 — Base unificada de conferência

**Objetivo:** garantir um único fluxo operacional no APP SabordaTerra.

**Status:** **Finalizada (OK)**.

### Escopo

- Unificar entrada de pedidos no APP SabordaTerra (sem dependência inicial do SIDI para conferência).
- Garantir origem da compra no dado (`comprador` vs `financeiro`).
- Ajustar estados do item/pedido para suportar conclusão por último item.

### Entregáveis

- Modelo de dados e endpoints consolidados.
- Regras de transição de status validadas.

### Critérios de aceite

- Pedido pode ser conferido integralmente no APP SabordaTerra.
- Conclusão do último item conclui o pedido.

### Registro de conclusão

- Sincronização da conferência passou a operar com base nos pedidos do APP SabordaTerra por padrão.
- Origem da compra registrada explicitamente no dado de conferência (`origem_compra`).
- API de conferência passou a retornar `origem_compra` e `pedido_concluido`.
- Regra de conclusão por último item implementada e validada.

### Testes (obrigatório)

- Onde houver lógica extraída (ex.: helpers de permissão ou formatação), **testes unitários** retroativos ao tocar nesses arquivos nas sprints seguintes.

---

## Sprint 2 — UX da recepção inteligente (conferente)

**Objetivo:** acelerar conferência em cenário real de doca com carga mista.

**Status:** **Finalizada (OK)**.

### Escopo

- Busca por produto com foco em fornecedor.
- Regra automática: se há 1 fornecedor possível para o produto, selecionar automaticamente.
- Regra de ambiguidade: se há mais de 1 fornecedor possível, pedir confirmação do conferente.
- Exibir apenas candidatos que tenham o mesmo produto do item em conferência.
- Identificação visual por origem (cor + chip/ícone/texto).

### Entregáveis

- Nova experiência de conferência.
- Fluxo de confirmação de fornecedor funcional.

### Critérios de aceite

- Em caso simples, conferente registra item com no máximo 2 interações.
- Em ambiguidade, sistema exige confirmação antes de salvar.

### Registro de conclusão

- Busca por produto e fornecedor com fluxo de **“Atualizar busca”** e detecção de fornecedor único ou ambíguo alinhada à operação na doca.
- **Painel** de pendências por fornecedor e contadores (fornecedores / itens pendentes), com filtro e opção de exibir cancelados.
- **Identificação visual por origem** da compra no card (comprador vs financeiro: cor lateral, chip e hierarquia de informação).
- **Diálogo de ambiguidade** quando o produto pode vir de mais de um fornecedor, exigindo confirmação antes de aplicar o filtro.

### Testes (obrigatório)

- **Unitários** para funções puras (ex.: resolução de fornecedor candidato, normalização de filtros). Smoke manual da tela não substitui teste de lógica extraída.

---

## Sprint 3 — Domínio pedido × itens (fundação)

**Objetivo:** alinhar backend ao modelo canônico antes de telas completas de financeiro.

**Status:** **Finalizada (OK)**.

### Escopo

- Entidade ou agregado de **pedido de conferência** com `fase_conferencia` (incl. `AguardandoDecisaoFinanceiro`, ver documentação de modelagem).
- Novos **estados por item** (`PendenteConferencia`, resultados de recebimento, `PendenteDecisaoFinanceiro`, etc.) substituindo o enum legado de três valores no fluxo novo.
- Serviço de domínio `recalcular_pedido_apos_mudanca_item` e regras de agregação (§5 da modelagem).
- Endpoints de leitura com `fase_conferencia`, indicadores derivados e itens; testes de unidade nas transições principais.

### Entregáveis

- Migração de dados de desenvolvimento/homologação alinhada ao novo modelo (sem obrigação de migração de produção enquanto não houver go-live).
- API estável para as Sprints 4–7 consumirem.

### Critérios de aceite

- Dado um conjunto de itens, a fase do pedido recalcula de forma determinística.
- Documentação de API atualizada (OpenAPI ou equivalente).

### Registro de conclusão

- **Domínio:** estados canônicos por item e fases de pedido em `backend/app/domain/conferencia_fase.py` (`calcular_fase_pedido`, `recalcular_pedido_apos_mudanca_item`, `indicadores_pedido`), com normalização de status legados (`Pendente` / `Divergente` / `Concluido`).
- **Persistência:** agregado `ConferenciaPedido` (`fase_conferencia` por `pedido_id`) alinhado ao recálculo a partir dos itens em `conferencia_itens`; repositório passa a usar o serviço de domínio como fonte única dos agregados por pedido.
- **API:** resposta de itens enriquecida com `fase_conferencia`, `pedido_concluido` e indicadores derivados; endpoint `GET /conferencia/pedidos/{pedido_id}` com resumo do pedido (fase, flags, contagens e lista de itens) para consumo pelas sprints seguintes.
- **Documentação para cliente/QA:** matriz de referência itens → fase do pedido em `MODELAGEM_CONFERENCIA_PEDIDO_E_ITENS.md` (§5.6), alinhada ao código.
- **Testes:** suíte unitária em `backend/tests/test_conferencia_fase.py` cobrindo transições principais e o agregado de recálculo; regressão verde no `pytest` do repositório.

### Testes (obrigatório) — *critério de pronto desta sprint*

- **Cobertura unitária obrigatória** do serviço de recálculo de fase do pedido e das transições de estado de item cobertas nesta entrega (matriz de casos: doca zerada, primeiro item conferido, `AguardandoDecisaoFinanceiro`, caminho para `ProntoParaIntegracao` quando aplicável).
- Testes de **repositório em memória ou fakes** para invariantes que não dependam de I/O externo.
- Nenhum merge de regra nova de domínio **sem** teste correspondente (exceção só com registro explícito de débito técnico).

---

## Sprint 4 — Conferente: estados, modal e origem (comprador × financeiro)

**Objetivo:** experiência do conferente coerente com o modelo v2.

**Status:** **Finalizada (OK)**.

### Escopo

- Substituir fluxo de edição (modal/cards) para usar **novos status de item** e exibir **fase do pedido** quando relevante.
- **Comprador:** campos de pedido em leitura; foco em quantidade física e classificação do resultado.
- **Financeiro direto:** campos adicionais editáveis conforme modelagem (unidade, quantidades, validações).
- Chips/cores por origem mantidos; mensagens de erro e validação em pt-BR.

### Entregáveis

- Tela de conferência integrada ao backend da Sprint 3.
- Critérios de aceite por origem documentados no QA.

### Critérios de aceite

- Conferente conclui fluxo feliz sem depender de telas financeiras para itens sem `PendenteDecisaoFinanceiro`.

### Testes (obrigatório)

- **Frontend:** testes unitários de mapeamento estado → UI (cores, rótulos, desabilitar campo por `origem_compra`); testes de hook ou handler de submit com mocks da API da Sprint 3.
- **Backend:** regressão dos testes da Sprint 3 ao alterar contratos; novos casos se novas validações forem adicionadas nos endpoints.

### Registro de conclusão

- **Fluxo da tela do conferente:** card e modal atualizados para o modelo v2, com exibição de `fase_conferencia`, sinalização de pendência financeira e estados canônicos por linha.
- **Regras por origem aplicadas no formulário:** para `origem_compra=comprador`, campos de pedido ficam somente leitura; para `origem_compra=financeiro`, `quantidade_esperada` e `unidade` ficam editáveis com validação.
- **Submit alinhado à API da Sprint 3:** handler de atualização envia payload por origem e apresenta mensagens de erro vindas da API em pt-BR.
- **Cobertura de testes frontend:** testes unitários de mapeamento de UI (`conferenceStatus` e `conferenceUi`) e teste de submit com mock da API (`UpdateConferenceOrder.test.ts`), cobrindo cenários de comprador, financeiro e erro.
- **Regressão backend da trilha:** suíte `backend/tests/test_conferencia_fase.py` executada verde após alterações de contrato e regras.

---

## Sprint 5 — Painel da doca + pendências visíveis

**Objetivo:** visibilidade operacional alinhada às novas fases (evolução do que era “painel discreto”).

**Status:** **Finalizada (OK)**.

### Escopo

- Painel: fornecedores pendentes, itens pendentes, destaque para fase do pedido quando aplicável (`EmConferencia`, etc.).
- Filtros e lista rápida coerentes com `fase_conferencia` (incl. leitura de pedidos em `AguardandoDecisaoFinanceiro` apenas como informação para quem tiver permissão, ou ocultar da doca — definir na UX).
- Onde couber sem conflito com as Sprints 6–7: regras de **pendências do dia** (reagendar, cancelar, não repetir) desde que não dependam da decisão financeira linha a linha do §6 da modelagem.

### Entregáveis

- Painel atualizado consumindo API da Sprint 3.
- Comportamento em tempo quase real (refetch após ações).

### Critérios de aceite

- Conferente enxerga carga de trabalho e fase macro sem ambiguidade.

### Testes (obrigatório)

- Unitários para **agregações exibidas no painel** (contagens por fornecedor, filtros) quando implementadas como funções puras.
- Testes de componente leves para estados de carregamento/erro, sem depender de E2E para tudo.

### Registro de conclusão

- **Painel operacional da doca:** cards da conferência passam a operar com resumo de pendências por fornecedor, total de itens pendentes e leitura macro por fase de pedido.
- **Filtros rápidos por fase:** inclusão de filtros “Todos”, “Abertos na conferência” e “Aguardando decisão financeiro”, mantendo coerência com `fase_conferencia`.
- **Permissão por perfil:** quando o usuário não possui `conferencia:visualizar_detalhes`, pedidos em `AguardandoDecisaoFinanceiro` ficam ocultos do painel e da lista rápida.
- **Quase tempo real:** listagem de conferência com `refetch` periódico (20s), além da atualização já disparada após ações de edição.
- **Testes unitários de agregação/filtro:** cobertura em `frontend/src/utils/conferencePanel.test.ts` para contagem por fornecedor, visibilidade por permissão e filtros rápidos por fase.

---

## Sprint 6 — Financeiro I: fila, pedido e decisão por linha

**Objetivo:** primeira fatia da interação financeira (maior valor, menor risco que ação global).

**Status:** **Finalizada (OK)**.

### Escopo

- Lista/fila de pedidos em **`AguardandoDecisaoFinanceiro`** (e filtros auxiliares).
- Tela de **detalhe do pedido** para o financeiro: todas as linhas, status, origem da compra.
- Ações **por linha**: alterar status / liberar para integração no lote SIDI / manter fora, conforme modelagem §6.
- **Pré-visualização** do que será incluído no envio SIDI daquele pedido (somente linhas elegíveis).

### Entregáveis

- Permissões: papel financeiro (ou equivalente) distinto do conferente.
- Auditoria mínima (quem alterou linha e quando), se já disponível na stack.

### Critérios de aceite

- Nenhuma linha entra no pacote SIDI sem estar explicitamente elegível após ação do financeiro.

### Testes (obrigatório)

- **Unitários** para montagem da lista “elegíveis ao SIDI” e para a regra “linha só entra após ação explícita”.
- Testes de permissão em nível de serviço (financeiro vs conferente) com **doubles**, não só na UI.

### Registro de conclusão

- **Backend financeiro dedicado:** endpoints `/conferencia/financeiro/pedidos`, `/conferencia/financeiro/pedidos/{pedido_id}` e `/conferencia/financeiro/pedidos/{pedido_id}/{item}/acao` para fila, detalhe do pedido e decisão por linha.
- **Regra de elegibilidade SIDI por linha:** função pura de domínio para preview de incluídos/excluídos e mapeamento de ação financeira (`liberar_sidi`, `manter_fora`, `pendencia_financeira`) para status canônicos.
- **Ação explícita do financeiro:** status de integração (`FinalizadoParaIntegracao`/`IntegradoSIDI`) bloqueado no fluxo padrão da conferência e reservado ao endpoint financeiro com permissão específica.
- **Permissão financeira separada:** guarda de acesso dedicada em serviço (`require_finance_decision`) baseada em permissão de atualização financeira e bypass administrativo.
- **Frontend integrado:** painel financeiro dentro da tela de conferência com fila por pedido, detalhe por linhas, preview numérico de incluídos/excluídos e botões de ação com refetch após operação.
- **Cobertura de testes:** unitários para elegibilidade/preview e mapeamento de ação (`test_conferencia_financeiro.py`), além de teste de autorização com doubles (`test_conferencia_financeiro_auth.py`).

---

## Sprint 7 — Financeiro II: liberação global, confirmação e alertas de exclusão

**Objetivo:** completar §6.2–6.4 da modelagem (ação global de alto impacto + UX obrigatória).

**Status:** **Finalizada (OK)**.

### Escopo

- Ação **global no pedido** (“liberar integração”) com **confirmação em duas etapas** e texto de atenção.
- **Lista explícita** das linhas **excluídas** do pedido SIDI, resumo numérico e frase de ciência antes de confirmar.
- Harmonizar com `ProntoParaIntegracao` / fila de integração: pedido só avança quando §5.5 da modelagem for satisfeito.

### Entregáveis

- Fluxo de erro e bloqueio se tentativa de integrar com pendência financeira inconsistente.
- Cópias de interface claras e não ambíguas (pt-BR).

### Critérios de aceite

- Financeiro não consegue confirmar integração global sem ver o que fica de fora.
- Testes manuais ou automatizados do cenário “10 linhas, 3 excluídas”.

### Testes (obrigatório)

- **Unitários** para o motor de “excluídos vs incluídos” no pacote (cenário 10/3 e bordas: zero excluídos, todos excluídos).
- Testes de componente do **fluxo de confirmação em duas etapas** (não avança sem estado intermediário correto).
- Integração/API opcional para PATCH em lote, mas **domínio coberto por unitário antes**.

### Registro de conclusão

- **Ação global de alto impacto:** endpoint financeiro dedicado para prévia e confirmação da liberação global (`POST /conferencia/financeiro/pedidos/{pedido_id}/liberacao-global`).
- **Confirmação em duas etapas na UI:** fluxo obrigatório “Gerar prévia” → “Avançar para confirmação” → “Confirmar liberação global”, com bloqueio sem ciência explícita.
- **Alerta obrigatório de exclusão:** lista detalhada das linhas fora do envio com resumo numérico de incluídos/excluídos antes da confirmação.
- **Regra de elegibilidade global no domínio:** motor separado para liberação global por estados terminais (`STATUS_TERMINAIS_PEDIDO_OK`) e manutenção dos cenários linha a linha da Sprint 6.
- **Proteção de consistência:** backend exige `ciente_exclusoes=true` para confirmar e mantém o preview como etapa obrigatória.
- **Cobertura de testes:** unitários de domínio com cenário 10/3, zero excluídos e todos excluídos; teste de fluxo de confirmação em duas etapas em utilitário frontend.

---

## Sprint 8 — E-mail operacional + administração (contingência SIDI)

**Objetivo:** fechar ciclo operacional até integração automática com SIDI existir.

**Status:** **Finalizada (OK)**.

**Nota:** depende de **pedido pronto para disparo** conforme novas regras (`ProntoParaIntegracao` / último item tratado + decisões financeiras). Ajustar gatilho de e-mail em relação ao antigo “último item concluído” se o modelo de fases exigir.

### Escopo

- Disparo de e-mail quando o pedido atingir critério de encerramento operacional acordado (alinhado às Sprints 3 e 7).
- Tela admin para configuração SMTP do remetente (`compras@sabordaterraalimentos.com.br`).
- Tela admin para lista de destinatários que receberão dados para digitação no SIDI.
- Template de e-mail com dados mínimos para lançamento manual.

### Entregáveis

- Configuração SMTP via tela.
- Gestão de destinatários via tela.
- E-mail automático por pedido elegível.

### Critérios de aceite

- Sem SMTP configurado, sistema alerta de forma clara.
- Com SMTP configurado, e-mail chega para todos os destinatários ativos.

### Testes (obrigatório)

- **Unitários** do **conteúdo do template** (renderização com dados fictícios) e do **gatilho** “só dispara quando pedido atende critério X” (função pura ou serviço isolado).
- **Mock** do cliente SMTP em testes de integração; não enviar e-mail real em CI.

### Registro de conclusão

- **Administração SMTP via API e UI:** configuração central de host, porta, credenciais, TLS, remetente e flag de ativação (`/conferencia/admin/notificacao-sidi/smtp`) com diálogo administrativo na tela de conferência.
- **Gestão de destinatários:** listagem, criação e ativação/inativação de destinatários da contingência SIDI (`/conferencia/admin/notificacao-sidi/destinatarios`).
- **Template operacional de contingência:** corpo do e-mail com pedido, fornecedor, fase, totais e linhas incluídas no envio manual para o SIDI.
- **Gatilho de disparo:** envio só quando pedido está `ProntoParaIntegracao` e há linhas incluídas; integração do disparo após liberação global e endpoint manual de reenvio (`/conferencia/financeiro/pedidos/{pedido_id}/notificar-sidi`).
- **Tratamento de ausência de configuração:** mensagens claras para SMTP ausente/inativo ou ausência de destinatários ativos.
- **Cobertura de testes:** unitários para template, gatilho e envio com mock SMTP em `backend/tests/test_conferencia_notificacao_sidi.py`.

---

## Sprint 8.1 — Registro manual do envio SIDI (pós-contingência)

**Objetivo:** garantir rastreabilidade explícita quando o envio ao SIDI for manual/assistido.

**Status:** **Finalizada (OK)**.

### Escopo

- Ação financeira/admin “Registrar envio manual ao SIDI” por pedido.
- Persistência de auditoria mínima: `enviado_manual`, `enviado_em`, `enviado_por`, `canal_envio`, `protocolo`/observação opcional.
- Bloqueios de consistência: evitar duplicidade de marcação sem justificativa.
- Exibição do histórico na tela de detalhe do pedido financeiro.

### Entregáveis

- API de registro manual e consulta de histórico.
- UI de confirmação do registro com campo de observação/protocolo.
- Logs/auditoria para suporte operacional.

### Testes (obrigatório)

- Unitários de regra de idempotência e transições de estado do registro.
- Testes de serviço para gravação de auditoria (usuário, timestamp e canal).
- Teste de componente da confirmação de registro manual.

### Registro de conclusão

- **Persistência de auditoria:** nova tabela `sidi_envio_manual_registro` com `pedido_id`, `enviado_em`, `enviado_por`, `canal_envio`, `protocolo` e `observacao`.
- **API financeira:** endpoints `GET/POST /conferencia/financeiro/pedidos/{pedido_id}/registro-envio-manual` para histórico e registro manual.
- **Regra de idempotência:** bloqueio de duplicidade sem justificativa; novo registro adicional permitido apenas com observação explícita.
- **UI no painel financeiro:** formulário para protocolo/observação e lista cronológica dos registros manuais por pedido.
- **Cobertura de testes:** regra de idempotência validada em `backend/tests/test_conferencia_registro_manual.py`.

---

## Sprint 9 — Estabilização e go-live assistido

**Objetivo:** entrada em operação com segurança e previsibilidade.

**Status:** **Finalizada (OK)** — entregáveis técnicos implementáveis no repositório concluídos; critério operacional “5 dias úteis” permanece validação em campo.

### Escopo

- Testes E2E dos cenários críticos (doca + financeiro + e-mail).
- Ajustes finos de UX e mensagens de erro.
- Monitoramento de falhas e indicadores básicos.
- Treinamento rápido dos usuários-chave (conferente e financeiro).

### Entregáveis

- Plano de operação assistida.
- Guia rápido de uso.
- Correções de alta prioridade aplicadas.

### Critérios de aceite

- Fluxo roda 5 dias úteis sem bloqueio crítico.
- Pendências, decisão financeira e e-mails funcionando de ponta a ponta.

### Testes (obrigatório)

- **E2E** mínimo dos fluxos críticos (doca → financeiro → gatilho de e-mail em ambiente de homologação).
- **Não reduzir** a suíte de unitários das Sprints 3–8; corrigir falhas antes do go-live.
- Baseline de **cobertura** ou lista explícita de módulos críticos 100% cobertos por teste (acordo na retrospectiva).

### Registro de conclusão

- **Monitoramento básico:** endpoints `GET /health` (liveness) e `GET /health/ready` (readiness com `SELECT 1` no PostgreSQL local); testes em `backend/tests/test_health.py`.
- **E2E pontual:** Playwright em `frontend/e2e/conferencia-smoke.spec.ts` (login + redirect sem sessão); scripts `npm run test:e2e` e `playwright.config.ts` com `webServer` na porta do Vite (3000).
- **UX / erros:** uso de `getApiErrorMessage` nas mutações financeiras, na listagem de pedidos e nas queries de fila/resumo financeiro; `FetchConferenceOrders` passa a propagar `detail` do FastAPI.
- **Documentação:** `docs/PLANO_OPERACAO_ASSISTIDA_CONFERENCIA.md`, `docs/GUIA_RAPIDO_USO_CONFERENCIA.md`, `docs/MODULOS_CRITICOS_TESTES_CONFERENCIA.md`.
- **Treinamento:** material de apoio = guia rápido + plano assistido; sessões presenciais/remotas ficam a cargo da operação.

---

## 4) Backbone de histórias (épicos)

- `Épico A`: Conferência unificada no APP SabordaTerra.
- `Épico B`: Recepção inteligente por fornecedor/produto.
- `Épico C`: Gestão de pendências (painel doca / operação).
- `Épico D`: Conclusão de pedido e notificação por e-mail.
- `Épico E`: Administração SMTP e destinatários.
- `Épico F`: **Domínio pedido × itens** — fases no pedido, estados nos itens, recálculo e API (Sprint 3).
- `Épico G`: **Conferente v2** — modal por origem, novos status, integração com domínio (Sprint 4–5).
- `Épico H`: **Financeiro na conferência** — fila, decisão por linha, liberação global, alertas de exclusão SIDI (Sprint 6–7).

---

## 5) Cadência recomendada por sprint

- Planejamento: 1h30 no início da sprint.
- Daily: 15 minutos.
- Refinamento: 45 minutos no meio da sprint (incluir **estimativa de testes** para histórias de domínio).
- Review: 1h com Mara e Otniel.
- Retrospectiva: 45 minutos.
- **Pull requests:** tempo reservado para **escrever/ajustar testes unitários** antes do merge; CI executando suíte em branch.

### Definição de pronto (resumo)

- Funcionalidade atende critério de aceite **e** cumpre o bloco **Testes (obrigatório)** da sprint em curso (§3).
- Regressão: suíte existente **verde** no branch de integração.

---

## 6) Riscos e mitigação

### Riscos principais

- Ambiguidade de fornecedor em carga mista.
- **Regressão de estado** ao evoluir enum de item e fase de pedido (efeitos colaterais em listagens e integração).
- **Erro humano no financeiro** ao liberar integração global sem perceber exclusões.
- Mudanças de regra durante a operação piloto.
- Dependência externa da integração automática com SIDI e de **SMTP** (credenciais, bloqueio de porta, SPF/DKIM).
- **Débito técnico em testes** se o time aceitar merge sem unitário sob pressão de prazo.

### Mitigação

- Confirmador de fornecedor em caso ambíguo (Sprint 2).
- Domínio e API **com testes unitários** antes de telas financeiras complexas (Sprint 3); decisão por linha antes da ação global (Sprint 6 antes da 7).
- UX de confirmação e listagem de excluídos obrigatória antes da liberação global (Sprint 7).
- Operação assistida e ajustes rápidos (Sprint 9).
- Contingência de e-mail para lançamento manual no SIDI (Sprint 8).
- **Política de PR:** definição de pronto com teste unitário no núcleo (§2.3); CI falhando = não mergear em `main`/`develop` conforme acordo da equipe.

---

## 7) Resultado esperado ao final

- Processo de conferência unificado e mais simples para a operação.
- Melhor rastreabilidade por fornecedor e por pedido.
- **Fases de pedido** e **estados de item** alinhados à modelagem; **financeiro** com fila explícita, decisão por linha e liberação global consciente (exclusões visíveis antes do SIDI).
- Pendências tratadas com decisão explícita do financeiro.
- Continuidade operacional garantida mesmo sem API automática do SIDI.

---

## 8) Etapa final de saneamento técnico

- Remover definitivamente referências à tabela `ITENSC` do fluxo de conferência no APP SabordaTerra.
- Manter a conferência alimentada apenas por dados de compra do próprio app.
- Limpar dependências técnicas de leitura da base de origem que não sejam mais necessárias para conferência.
