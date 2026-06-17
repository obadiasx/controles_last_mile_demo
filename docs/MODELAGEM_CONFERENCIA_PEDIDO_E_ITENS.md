# Modelagem — conferência: pedido × itens (desenho alvo)

Este documento fixa o **modelo conceitual e de dados** para a conferência unificada.  
**Não há compromisso com compatibilidade** com implementações anteriores: o que estiver obsoleto pode ser removido no código.

---

## 1) Por que dois níveis (pedido e item)

| Nível | Pergunta que responde | Quem consome |
|--------|------------------------|--------------|
| **Pedido** | Fase macro: chegou? já começaram a conferir? o lote já pode seguir para integração? | Financeiro, gestão, acompanhamento em tempo quase real |
| **Item** | O que aconteceu com **cada linha** (qtd, divergência, substituição, decisão)? | Conferente, estoque, auditoria, SIDI linha a linha |

Um **único** estado no pedido não substitui o detalhe dos itens; um **monte** de estados só nos itens dificulta o painel do financeiro. Por isso: **fase no pedido** + **estado operacional no item** + **indicadores derivados** (pendências).

---

## 2) Estado do pedido — fase operacional (`pedido.fase_conferencia`)

Valores sugeridos (nomes podem ser ajustados ao enum no código):

| Valor | Significado |
|--------|-------------|
| `AguardandoRecebimento` | Pedido já existe na plataforma (ex.: CEAGESP / app); **ainda não há** conferência registrada que satisfaça a regra de “já começou” (ver §5). |
| `EmConferencia` | **Pelo menos um** item já entrou no fluxo de conferência (primeira ação relevante do conferente). |
| `AguardandoDecisaoFinanceiro` | **Doca já processou todas as linhas** (nenhum item em `PendenteConferencia`), mas **ainda há** decisão financeira pendente **ou** política exige validação financeira antes de integrar (ver §5.4 e §6). Fase explícita para filtros e painéis (“pedidos parados no financeiro”). |
| `ProntoParaIntegracao` | Regra de agregação atendida: **todos** os itens não cancelados estão em estados que permitem fechar o lote e seguir para integração / e-mail / fila SIDI, **sem** bloqueio financeiro pendente (ver §5). |
| `IntegradoSIDI` | Pedido (ou lote) tratado como **concluído no SIDI** no sentido de negócio (confirmação manual ou job). |

**Observação:** `ProntoParaIntegracao` e `IntegradoSIDI` são **fases de pedido**. Não confundir com o mesmo nome no item, quando existir homonímia: no item significa “esta linha” na fila; no pedido significa “o conjunto”. O homônimo no item é `PendenteDecisaoFinanceiro` (**linha**); no pedido, `AguardandoDecisaoFinanceiro` é a **fase do lote** aguardando a área financeira.

---

## 3) Estado do item — operação e exceções (`item.status_conferencia`)

Estados **por linha** (cada par `pedido` + `sequência_item`):

| Valor | Significado |
|--------|-------------|
| `PendenteConferencia` | Linha ainda **não** foi tratada pelo conferente (equivalente a “está na fila da doca” para aquela linha). |
| `RecebidoConforme` | Recebido em linha com o esperado, dentro da política (tolerância, etc.). |
| `Parcial` | Recebido em quantidade menor (ou parcialmente atendido), sem fechar o caso no financeiro. |
| `NaoRecebido` | Nada recebido para a linha no momento relevante. |
| `RecebidoComDivergencia` | Divergência registrada (qualidade, NF, troca, etc.) ainda no âmbito operacional. |
| `PendenteDecisaoFinanceiro` | **Bloqueio explícito**: requer decisão do financeiro (reagendar, cancelar, contestar, aceitar exceção, etc.). |
| `FinalizadoParaIntegracao` | Linha **encerrada** do ponto de vista operacional e **apta** a entrar no pacote de integração / contingência. |
| `IntegradoSIDI` | Linha confirmada como integrada no SIDI (ou marcada manualmente até API). |

**Removido do desenho anterior nos itens:** `AguardandoRecebimento` e `EmConferencia` como estado de **item** — esses conceitos passam a ser **só do pedido** (fase), evitando duplicidade semântica. O item “não começado” é `PendenteConferencia`.

**Opcional futuro:** `EmConferencia` no item só se existir **lock** / sessão por linha; não é obrigatório para o painel financeiro.

---

## 4) Indicadores derivados (para painel financeiro — dois sinais)

O financeiro precisa ver **ao mesmo tempo**:

1. **Fase do pedido** (`fase_conferencia`) — “já chegou / já estão conferindo / **aguardando financeiro** / já pode integrar / já integrou”.
2. **Pendência** — existe algum item (ou o pedido como um todo) que **exige** ação financeira?

### 4.1 Flags recomendadas (todas derivadas, salvo decisão futura de persistir cache)

| Indicador | Regra sugerida |
|-----------|----------------|
| `pedido.tem_pendencia_financeira` | `EXISTS item WHERE status_conferencia = 'PendenteDecisaoFinanceiro'` e item não cancelado. |
| `pedido.quantidade_itens_pendentes_conferencia` | Contagem de itens em `PendenteConferencia` (ou equivalente à “fila do conferente”). |
| `pedido.quantidade_itens_pendencia_financeira` | Contagem em `PendenteDecisaoFinanceiro`. |

Quando `fase_conferencia = 'AguardandoDecisaoFinanceiro'`, em geral `tem_pendencia_financeira` continua **true** (a fase **nomeia** o gargalo); a flag ainda é útil para consultas transversais e para o caso em que o pedido está `EmConferencia` com pendência parcial (§4.2).

### 4.2 Comportamento desejado (dois cenários)

**A) Conferência ainda em andamento na doca**

- O pedido pode estar **`EmConferencia`** e, ao mesmo tempo, **`tem_pendencia_financeira = true`** porque **um** item foi escalado para `PendenteDecisaoFinanceiro` enquanto **outros** itens seguem em conferência normal.

**Isso é desejável:** o painel mostra **dois sinais**:

- Chip / coluna **fase**: `EmConferencia`
- Alerta / coluna **pendência**: “Exige financeiro” (com contagem de itens ou link)

**B) Doca terminou; falta só o financeiro**

- Quando **não** houver mais linhas em `PendenteConferencia` e ainda houver pendência financeira (ou política equivalente), `fase_conferencia` deve passar a **`AguardandoDecisaoFinanceiro`** (§5.4). Aqui a fase do pedido já comunica **sozinha** o gargalo; o alerta por item continua útil no detalhe.

Fase no pedido descreve **macrofluxo**; a pendência por item continua sendo o **detalhe** auditável.

---

## 5) Regras de agregação (pedido ← itens)

Definir no domínio funções puras recalculadas a cada alteração de item:

### 5.1 Quando `pedido.fase_conferencia` vira `EmConferencia`

Quando existir **pelo menos um** item não cancelado tal que:

- passou de `PendenteConferencia` para qualquer outro estado **operacional** (primeira gravação válida do conferente), **ou**
- política explícita: primeira leitura de quantidade física / primeiro “salvar” no fluxo.

Enquanto **todos** os itens estiverem `PendenteConferencia`, o pedido permanece `AguardandoRecebimento` (se ainda não houver regra alternativa de “chegada física” modelada).

### 5.2 Quando o pedido vira `ProntoParaIntegracao`

Quando **todos** os itens não cancelados estiverem em um **conjunto terminal permitido**, por exemplo:

`{ RecebidoConforme, Parcial, NaoRecebido, RecebidoComDivergencia, FinalizadoParaIntegracao, IntegradoSIDI }`

**excluindo** explicitamente:

- `PendenteConferencia`
- `PendenteDecisaoFinanceiro` (enquanto existir ao menos um item neste estado, o pedido **não** deve ir para `ProntoParaIntegracao`, salvo regra de negócio explícita de “fechar com pendência” — não recomendado no desenho padrão).

**Pedido com um único item:** quando esse item atinge o estado que fecha a linha (`FinalizadoParaIntegracao` ou política que já considere pronto), o pedido pode subir direto para `ProntoParaIntegracao` no mesmo evento.

### 5.3 Integração SIDI no pedido

Transição de `ProntoParaIntegracao` → `IntegradoSIDI` quando o processo de integração (manual ou automático) **confirmar** o pedido (ou lote) como integrado.

### 5.4 Quando `pedido.fase_conferencia` vira `AguardandoDecisaoFinanceiro`

Quando **todos os itens** não cancelados já tiverem sido tratados no fluxo operacional (**nenhum** em `PendenteConferencia`) **e** ainda existir **pelo menos uma linha** em `PendenteDecisaoFinanceiro` **ou** a política de negócio exigir passo financeiro antes de integrar:

- `pedido.fase_conferencia` ← **`AguardandoDecisaoFinanceiro`**.

Assim, listagens e filtros (“pedidos parados no financeiro”) não dependem só de flag derivada. Ver §4.2-B e §6.

### 5.5 Saída de `AguardandoDecisaoFinanceiro` → `ProntoParaIntegracao`

Quando o financeiro **resolver** as pendências (linha a linha ou fluxo global, §6) de forma que **não** reste bloqueio para integrar conforme a política:

- `pedido.fase_conferencia` deixa `AguardandoDecisaoFinanceiro` e passa a **`ProntoParaIntegracao`** assim que as regras de §5.2 forem satisfeitas (incluindo itens elegíveis ao envio SIDI e ausência de `PendenteDecisaoFinanceiro` onde exigido).

Se ainda existir linha em `PendenteConferencia` (reabertura excepcional), o pedido **não** deve permanecer só em `AguardandoDecisaoFinanceiro`; recalcular para `EmConferencia` conforme §5.1.

### 5.6 Referência rápida — itens → fase do pedido (implementação)

Esta subseção resume **como o sistema calcula** `fase_conferencia` a partir dos itens **não cancelados**, na ordem em que a regra é avaliada no domínio (`backend/app/domain/conferencia_fase.py`, função `calcular_fase_pedido`). Serve para **alinhamento com cliente e QA** e para bater com os testes unitários do mesmo módulo.

**Normalização:** status vazio vira `PendenteConferencia`. Valores legados ainda aceitos na entrada: `Pendente` → `PendenteConferencia`, `Divergente` → `RecebidoComDivergencia`, `Concluido` → `FinalizadoParaIntegracao`.

**Conjunto “terminal OK” para fechar o pedido** (quando não há mais `PendenteConferencia` nem `PendenteDecisaoFinanceiro` e todos os ativos estão neste conjunto, o pedido pode ir a `ProntoParaIntegracao`):

`RecebidoConforme`, `Parcial`, `NaoRecebido`, `RecebidoComDivergencia`, `FinalizadoParaIntegracao`, `IntegradoSIDI`.

**Ordem de decisão (prioridade de cima para baixo):**

| Ordem | Situação dos itens ativos (após normalizar) | `fase_conferencia` resultante |
|------:|---------------------------------------------|-------------------------------|
| 1 | Nenhum item ativo (lista vazia ou só cancelados) | `AguardandoRecebimento` |
| 2 | **Todos** em `PendenteConferencia` | `AguardandoRecebimento` |
| 3 | **Todos** em `IntegradoSIDI` | `IntegradoSIDI` |
| 4 | **Nenhum** `PendenteConferencia` **e** existe **pelo menos um** `PendenteDecisaoFinanceiro` | `AguardandoDecisaoFinanceiro` |
| 5 | **Nenhum** `PendenteConferencia`, **nenhum** `PendenteDecisaoFinanceiro` **e** **cada** linha está no conjunto “terminal OK” acima | `ProntoParaIntegracao` |
| 6 | Demais casos (ex.: ainda há linha na doca; ou status fora do conjunto “OK”) | `EmConferencia` |

**Exemplos frequentes:**

| Itens ativos (resumo) | Fase |
|------------------------|------|
| Só `PendenteConferencia` | `AguardandoRecebimento` |
| `PendenteConferencia` + qualquer outro estado | `EmConferencia` |
| `PendenteConferencia` + `PendenteDecisaoFinanceiro` | `EmConferencia` (doca ainda não zerou a fila) |
| Sem `PendenteConferencia`, com `PendenteDecisaoFinanceiro` | `AguardandoDecisaoFinanceiro` |
| Só estados do conjunto “OK”, sem `PendenteDecisaoFinanceiro` (ex.: `RecebidoConforme` + `Parcial`) | `ProntoParaIntegracao` |
| Todos `IntegradoSIDI` | `IntegradoSIDI` |

**Indicadores derivados** (mesmo arquivo de domínio): `tem_pendencia_financeira` é verdadeiro se existir algum item ativo em `PendenteDecisaoFinanceiro`; contagens de pendentes de conferência e de pendência financeira seguem os mesmos status.

---

## 6) Decisão financeira e liberação para o SIDI

Objetivo: dar ao **usuário financeiro** poder explícito para **destravar** a integração quando houver linhas aguardando decisão, com **transparência total** sobre o que entra e o que fica de fora do envio ao SIDI.

### 6.1 Pré-condição

- Todos os itens não cancelados estão **fora** de `PendenteConferencia` (fluxo do conferente concluído para todas as linhas).
- Existe **ao menos um** item em `PendenteDecisaoFinanceiro` **ou** o negócio exige validação financeira antes de integrar (política configurável).

### 6.2 Ações do financeiro (duas granularidades)

1. **Por linha (recomendado como fluxo principal)**  
   O financeiro pode alterar o **status de cada item** (ou usar ações equivalentes: “liberar para integração neste pedido SIDI”, “manter fora”, “encaminhar para outro fluxo”) até que cada linha esteja coerente com a decisão tomada. Itens **liberados** passam a compor o conjunto **elegível** para integração no pedido SIDI daquele lote.

2. **Global no pedido (ação de alto impacto)**  
   O sistema pode oferecer uma ação do tipo **“Liberar integração do pedido para o SIDI”** aplicando uma regra padrão a todas as linhas elegíveis (ex.: integrar todas que estiverem em estados “OK” e excluir explicitamente as demais). Essa ação deve exigir **confirmação em duas etapas** e **texto de atenção** (não apenas um clique), porque o erro afeta faturamento e estoque.

### 6.3 Regra de integração no SIDI (pedido vs linhas)

- Na **integração deste pedido** no SIDI entram **somente** as linhas que o financeiro **liberou** como aptas (estados e flags definidos no domínio, ex.: `FinalizadoParaIntegracao` com inclusão no lote).
- As linhas **não liberadas** ou explicitamente **excluídas** **não** entram neste envio ao SIDI; o desenho prevê que possam ser tratadas depois (outro pedido SIDI, cancelamento, nova solicitação, etc.), sem misturar no mesmo envio sem decisão clara.

### 6.4 UX obrigatória: alerta do que fica de fora

O financeiro deve ver, **antes de confirmar** qualquer liberação relevante:

- **Lista explícita** das linhas **excluídas** do pedido SIDI (produto, quantidade, motivo/resumo, status atual).
- **Resumo numérico** (ex.: “3 de 10 linhas não serão integradas neste envio”).
- Em ação **global**, repetir o resumo e exigir confirmação que deixa claro: *“Estou ciente de que as linhas listadas abaixo não serão enviadas neste pedido SIDI.”*

Isso reduz erro involuntário: a tela não pode depender só de cor ou de um ícone discreto para esse corte.

### 6.5 Relação com §5.2 e §5.5

A transição do pedido para `ProntoParaIntegracao` / fila de integração só deve ocorrer quando **não** houver bloqueio financeiro pendente **ou** quando o financeiro tiver **explicitamente** concluído as liberações necessárias (linha a linha ou fluxo global validado). Enquanto o pedido estiver em **`AguardandoDecisaoFinanceiro`**, não deve avançar para `ProntoParaIntegracao` até as condições de §5.5. Regras exatas ficam no serviço de domínio e nos estados finais permitidos por item após a decisão financeira.

---

## 7) Origem da compra (`comprador` × `financeiro`)

Continua válido:

- **Comprador:** dados do pedido na UI mais **estáticos**; foco do conferente em recebimento e classificação por item.
- **Financeiro direto:** mesma máquina de estados; **validações e campos editáveis** mais amplos na linha (unidade, quantidade esperada, etc.), conforme estratégia já documentada.

A origem **não** duplica estados; altera **permissões e formulário**.

---

## 8) O que descartar na refatoração (sem nostalgia)

- Enum antigo de **três** valores no item (`Pendente` / `Divergente` / `Concluido`) como modelo de domínio.
- Tratar `EmConferencia` e `AguardandoRecebimento` como estado de **item** (passam para **pedido** + `PendenteConferencia` no item).
- Qualquer lógica de migração v1→v2 **enquanto** não houver dado real de produção a preservar — preferir **substituir** modelo e endpoints pelo desenho acima.

---

## 9) Próximo passo de implementação (referência)

1. Tabela ou entidade de **pedido de conferência** com `fase_conferencia` incluindo **`AguardandoDecisaoFinanceiro`** (§2, §5.4–5.5) **ou** derivar só em leitura até estabilizar performance.
2. Itens com `status_conferencia` conforme §3.
3. Serviço de domínio: `recalcular_pedido_apos_mudanca_item(pedido_id)` e regras de **elegibilidade ao SIDI** por linha após decisão financeira (§6).
4. API de listagem para financeiro: retornar `fase_conferencia`, `tem_pendencia_financeira`, contagens, e **payload** para montar o resumo “incluídos / excluídos do envio SIDI”.
5. UI conferência: dois sinais visuais conforme §4.2.
6. UI financeiro: fluxo **linha a linha**; ação **global** com confirmação reforçada; telas de pré-confirmação conforme §6.4.

Este arquivo é a referência de produto/arquitetura para alinhar backend e frontend **sem** amarrar a migrações legadas.
