# Documento de Decisao - Pedidos CEAGESP no sabordaterraDB

## Objetivo
Definir como o backend registra compras do CEAGESP **apenas no banco do app** (`DB_NAME` / `sabordaterraDB`), em tabelas **inspiradas** no legado SIDI (`CPEDIDOS` / `ITENSC`), **sem gravar** no banco do SIDI (`dbDadosSbT` / `DB_ORIGEM_*`).

Para este app, o SIDI e **somente leitura do ponto de vista de escrita**: o app **nao** executa `INSERT`/`UPDATE` em `CPEDIDOS` nem `ITENSC` no servidor do SIDI. A carga no sistema legado fica a cargo do **proprio SIDI**, consumindo os dados expostos pelo app (contrato em `docs/integracao_sidi_get_patch_api.md`).

## Contexto consolidado
- No legado existem **cabecalho** (`CPEDIDOS`) e **itens** (`ITENSC`) no `dbDadosSbT`; servem como **referencia de modelo**, nao como destino de escrita do app.
- No app, o equivalente operacional e a fila de integracao:
  - **`integracao_sidi_pedidos`** (cabecalho exportavel).
  - **`integracao_sidi_pedido_itens`** (itens exportaveis).
- A regra desejada para o app e:
  - No primeiro item salvo de um **fornecedor X** em um **dia D**, criar um novo pedido (cabecalho).
  - Os proximos itens do mesmo fornecedor e mesmo dia entram nesse mesmo pedido.
  - Se houver item de outro fornecedor no mesmo dia, criar outro pedido.
- Em resumo, o criterio minimo de agrupamento de pedido e: **(data da compra, fornecedor, comprador)**.
- A **transferencia** para o sistema SIDI ocorre **depois**: o SIDI consulta o app via `GET`, grava localmente no banco dele e devolve o resultado via `PATCH` (ver `docs/integracao_sidi_get_patch_api.md`).

## Leitura de dados atuais (insumos)
- `CPEDIDOS` concentra totais e metadados do pedido (`VALOR`, `ITENS`, `KGTOTAL`, `UNTOTAL`, `DTVENCTO`, `COMPRADOR`, etc.) — **referencia** para o desenho do JSON do GET e para o que o SIDI preenche internamente.
- `ITENSC` concentra itens com ligacao por `NUMPED` + `ITEM`, com campos de quantidade, peso, unidade, preco e observacoes — **referencia** para o desenho dos itens no GET.
- `columns_dbDadosSbT.csv` confirma tipos/defaults e mostra muitos campos legados que podem ou nao ser necessarios no **payload minimo** do app.

## Premissa principal a validar
No `sabordaterraDB`, o pedido deve ser **do app** (identidade propria em UUID), e **nao** depender de numeracao legada (`NUMPED`) no momento da compra. O `NUMPED` so existe no mundo SIDI e e **devolvido ao app** apos confirmacao bem-sucedida (`PATCH` com `sidi_numped`), para correlacao.

---

## Perguntas criticas para decisao

### 1) Identificacao do fornecedor
- Qual campo do app representa fornecedor de forma estavel? `fornecedor_id` interno, CNPJ, codigo legado (`NUMERO`) ou apenas nome/fantasia?
- Se nome/fantasia mudar, como manter o vinculo historico?
- Ha risco de fornecedor duplicado por grafia diferente (ex.: espacos, acentos)?

### 2) Definicao de "dia"
- O "dia" e baseado em:
  - data local do dispositivo?
  - data/hora do servidor?
  - fuso fixo (America/Sao_Paulo)?
- Pedido pode atravessar meia-noite (operacao noturna)? Se sim, qual regra prevalece?

### 3) Escopo da chave de agrupamento
- Agrupamento deve ser somente `(data, fornecedor)` ou tambem incluir:
  - comprador?
  - filial/unidade?
  - rota/setor?
  - tipo de compra (boleto/credito/fiado)?
- Dois compradores diferentes no mesmo fornecedor e dia compartilham pedido ou nao?

### 4) Janela de edicao do pedido
- Ate quando um pedido fica "aberto" para receber itens?
- Pode reabrir pedido fechado no mesmo dia/fornecedor?
- O que acontece se usuario remover o ultimo item (pedido vira vazio)?

### 5) Concorrencia e idempotencia
- Se dois requests gravarem o "primeiro item" quase ao mesmo tempo, como evitar criar dois pedidos para mesmo fornecedor/dia?
- Reenvio do mesmo request (timeout/retry) deve criar item duplicado ou ser idempotente?
- Precisamos de chave idempotente por item (ex.: `request_id`)?

### 6) Numeracao dos pedidos
- No app, `NUMPED` sera:
  - sequencial global?
  - UUID?
  - sequencial por dia?
- O numero do app sera mantido no SIDI ou havera mapeamento `pedido_app -> numped_sidi`?

### 7) Campos realmente necessarios no app
- O app precisa espelhar 100% dos campos legados de `CPEDIDOS/ITENSC`?
- Quais campos sao obrigatorios agora vs. apenas na integracao futura?
- Totais (`VALOR`, `ITENS`, `KGTOTAL`, etc.) serao persistidos ou calculados sob demanda?

### 8) Estado de sincronizacao com SIDI
- Quais status o pedido/item deve ter? (ex.: `PENDENTE_ENVIO`, `ENVIADO`, `ERRO`, `REPROCESSAR`)
- Como registrar tentativas e erros de transferencia?
- Reenvio parcial por item e permitido ou sincronizacao e sempre por pedido?

### 9) Regras fiscais/financeiras
- Quais campos fiscais sao obrigatorios no momento do cadastro no app?
- `DTVENCTO` e calculado na hora ou preenchido depois?
- Campos de pagamento (`DOCPAG`, `CDPG`, `PZO`, etc.) entram agora ou so na fase de sincronizacao?

### 10) Auditoria e rastreabilidade
- Quais campos de auditoria serao obrigatorios? (`created_at`, `updated_at`, `usuario`, `origem`, `device_id`)
- E necessario trilha de alteracoes (quem mudou preco/qtde/obs)?

## Checklist de respostas (controle de pendencias)
Use esta secao para responder em cima de cada item. Enquanto nao houver resposta validada, manter marcador `[PENDENTE]`.

- [DEFINIDO] Qual e o identificador canonico do fornecedor no app? (`fornecedor_id`, CNPJ, codigo legado, etc.)
  - Decisao: usar `fornecedores.id` no app (integer), que na sincronizacao recebe `CADFORN.NUMERO` da origem.
  - Validacao no codigo:
    - `FornecedorSC.numero` mapeia `CADFORN.NUMERO`.
    - `Fornecedor.id` e preenchido com `forn_sc.numero` durante sync.
  - Observacao: em `CPEDIDOS`, a coluna `NUMERO` referencia o codigo do fornecedor (`CADFORN.NUMERO`). Ja `FANTASIA` representa o nome fantasia (texto), nao o codigo numerico.
- [DEFINIDO] Como tratar fornecedor duplicado por nome/fantasia diferente? (normalizacao/regra de deduplicacao)
  - Encerrada como obsoleta para a regra de pedido.
  - Justificativa: o backend deve relacionar pedido por identificador canonico (`fornecedores.id` = `CADFORN.NUMERO`), e nao por `FANTASIA`.
  - Impacto: variacoes de grafia em nome/fantasia nao afetam a chave de agrupamento do pedido.
- [DEFINIDO] Qual e a regra oficial de "dia da compra"? (fuso e origem da data: servidor/dispositivo)
  - Decisao: usar a data/hora do proprio dispositivo do comprador como origem do "dia da compra".
  - Justificativa: operacao no CEAGESP ocorre sempre entre 07:00 e 17:00, reduzindo risco de cruzamento de data.
- [DEFINIDO] O agrupamento do pedido e so `(data + fornecedor)` ou inclui mais dimensoes? (comprador, filial, tipo de compra etc.)
  - Decisao: agrupamento oficial para criacao/reuso de pedido = `(data_compra + fornecedor_id + comprador_id)`.
  - Justificativa: pode haver mais de um comprador no CEAGESP ao mesmo tempo, inclusive comprando no mesmo fornecedor.
- [DEFINIDO] Dois compradores diferentes podem compartilhar o mesmo pedido no mesmo fornecedor/dia?
  - Decisao: nao. Cada comprador tera seu proprio pedido, mesmo no mesmo fornecedor e dia.
- [DEFINIDO] Quando um pedido deixa de estar "aberto" para receber itens?
  - Regra operacional:
    - Todos os pedidos da sessao CEAGESP do comprador permanecem abertos durante as compras do dia.
    - Ao finalizar as compras do dia, o sistema fecha todos os pedidos do comprador automaticamente.
    - Deve existir acao geral "fechar compras do dia" para o comprador, com confirmacao explicita mesmo havendo itens pendentes.
    - Usuario do financeiro tambem pode executar o fechamento geral das compras do comprador (ex.: comprador esqueceu de fechar).
- [DEFINIDO] Pode reabrir pedido fechado no mesmo dia/fornecedor?
  - Regra para novo item no mesmo dia/fornecedor/comprador quando ja existe pedido fechado:
    - Se pedido estiver com status "JA RECEPCIONADO", nao pode reabrir; criar novo pedido automaticamente.
    - Se pedido estiver "AINDA NAO RECEPCIONADO", app deve perguntar: reabrir pedido fechado ou criar novo.
  - Observacao: a criacao de novo pedido nao depende apenas de `(data + fornecedor + comprador)`, mas tambem do status do pedido existente.
- [DEFINIDO] Se excluir o ultimo item, o cabecalho do pedido deve ser removido ou mantido vazio?
  - Decisao: remover o cabecalho (nao manter pedido vazio).
- [DEFINIDO] Qual estrategia para evitar pedido duplicado em concorrencia? (salvamentos simultaneos)
  - Decisao: nao permitir duplicidade de pedido aberto para a mesma chave de agrupamento.
  - Justificativa: embora o risco pratico seja baixo (normalmente um comprador/dispositivo), deve seguir boas praticas de consistencia.
  - Diretriz tecnica para futura implementacao:
    - restricao unica para pedido aberto na chave `(data_compra, fornecedor_id, comprador_id, status_aberto)`;
    - criacao de pedido em operacao atomica (transacao) para evitar corrida de concorrencia.
- [DEFINIDO] Qual estrategia de idempotencia para nao duplicar item em retry? (ex.: `request_id`)
  - Decisao: opcao A, usando `request_id` unico por acao de salvar item.
  - Regra: retries com o mesmo `request_id` devem retornar o resultado anterior e nao criar item duplicado.
- [DEFINIDO] Como sera a identidade do pedido no app? (UUID, sequencial global, sequencial por dia)
  - Decisao: usar UUID como identidade do pedido no app, mantendo padrao ja adotado em outros casos.
- [DEFINIDO] Havera mapeamento entre pedido do app e `NUMPED` do SIDI? (campo de correlacao)
  - Decisao: sim, havera correlacao app <-> SIDI.
  - Regra de integracao (contrato em `docs/integracao_sidi_get_patch_api.md`):
    - O SIDI consulta via **GET** os pedidos/itens pendentes no app (fila `integracao_sidi_pedidos` / `integracao_sidi_pedido_itens`).
    - O SIDI grava **no proprio banco** (`CPEDIDOS` / `ITENSC`) em transacao local.
    - O SIDI retorna ao app via **PATCH** a confirmacao com `pedido_uuid`, `sidi_numped` e lista `item_uuid` -> `sidi_item`.
  - Objetivo: manter rastreabilidade bidirecional entre identificador UUID do app e identificador numerico do SIDI (`NUMPED` / `ITEM`).
- [DEFINIDO] Quais campos sao obrigatorios no app agora? (minimo viavel)
  - Decisao: adotar conjunto minimo obrigatorio orientado a operacao CEAGESP no app, com complementaridade posterior na integracao SIDI.
  - Base da proposta: dinamica de negocio definida neste documento + comparacao com `CPEDIDOS` e `ITENSC` (amostras em CSV).
  - Observacao: esta e uma proposta inicial para validacao com SIDI; ajustes de mapeamento podem ocorrer depois.

  - Cabecalho de pedido na fila do app (`integracao_sidi_pedidos`) — implementado:
    - `id` (UUID = `pedido_uuid` no GET)
    - `data_compra` (date; na pratica alinhada a `solicitacoes_dia.data`)
    - `comprador_id` (FK `tb_user`)
    - `comprador_codigo_sidi` (texto exportado no GET; override opcional por env `SIDI_COMPRADOR_CODIGO_PADRAO`)
    - `fornecedor_id` (int = `fornecedores.id` = `CADFORN.NUMERO`)
    - `fornecedor_fantasia` (snapshot para o GET)
    - `valor_total`, `itens_total`, `kg_total`, `un_total` (totais atualizados a cada item)
    - `hora_pedido` (time, America/Sao_Paulo)
    - `status` da fila: `pendente_sidi` | `integrado_sidi` | `erro_sidi` (MVP; evoluir para matriz mais rica se necessario)
    - `sidi_numped`, `ultimo_erro`, `ultimo_codigo_erro` (pos-PATCH)
    - `created_at`, `updated_at`

  - Item de pedido (`integracao_sidi_pedido_itens`) — implementado:
    - `id` (UUID = `item_uuid` no GET)
    - `pedido_id` (FK cabecalho)
    - `solicitacao_dia_item_id` (FK unica para `solicitacoes_dia_itens.id` — um registro de fila por linha de missao comprada)
    - `item_seq`, `produto_id`, `qtde`, `preco`, `un`, `peso`, `totkg`, `obs`, `dtmovim`
    - `sidi_item` (pos-PATCH, equivalente a `ITENSC.ITEM` no lado SIDI)
    - `created_at`, `updated_at`
    - **Pendente de evolucao**: `request_id` por requisicao (idempotencia de rede) ainda nao implementado no fluxo de baixa.

  - Campos recomendados (nao obrigatorios no MVP, mas fortemente uteis):
    - Pedido: ja persistimos totais e `sidi_numped`.
    - Item: correlacao `sidi_item` apos PATCH.

  - Campos legados de `CPEDIDOS/ITENSC` que podem ficar fora do MVP:
    - Financeiro/fiscal detalhado (`DTVENCTO`, `DOCPAG`, `CDPG`, `PZO`, `NOTA`, `REGNFE/REGNFD`, etc.)
    - Campos de apoio legado sem impacto imediato na captura da compra (`MARCAX`, `GF`, `UNC`, `XTAB`, `NUMROTA`, etc.)
  - Regra de ouro: se o campo nao e necessario para capturar compra no CEAGESP, controlar fluxo no app, ou correlacionar sincronizacao com SIDI, ele nao entra como obrigatorio no MVP.
- [DEFINIDO] Totais serao persistidos no cabecalho ou calculados sob demanda?
  - Decisao: persistir totais no cabecalho.
  - Campos alvo: `valor_total`, `itens_total`, `kg_total`, `un_total`.
- [DEFINIDO] Quais status de sincronizacao com SIDI existirao? (`PENDENTE_ENVIO`, `ENVIADO`, `ERRO`, etc.)
  - Decisao original: fila assincrona com retentativa e granularidade fina.
  - **Implementacao atual (MVP)**: status no cabecalho `integracao_sidi_pedidos.status`:
    - `pendente_sidi`: apto a aparecer no **GET** `pedidos-pendentes`.
    - `integrado_sidi`: SIDI confirmou gravacao (`PATCH` com sucesso); `sidi_numped` preenchido.
    - `erro_sidi`: SIDI confirmou falha (`PATCH` com `sucesso=false`); mensagem codigo em `ultimo_codigo_erro` / `ultimo_erro`.
  - Evolucoes possiveis (ainda nao no modelo): `em_processamento_sidi`, contadores de tentativa, `pedido_sync_log` dedicado.
- [DEFINIDO] Sincronizacao sera por pedido inteiro ou pode ser parcial por item?
  - Decisao: no **SIDI**, a gravacao em `CPEDIDOS` + `ITENSC` deve ser **uma transacao por pedido** (regra do time SIDI; ver `docs/integracao_sidi_get_patch_api.md`).
  - No **app**, a fila `integracao_sidi_pedidos` **cresce** a cada baixa CEAGESP (novos itens entram no mesmo `pedido_uuid` enquanto `pendente_sidi`). O GET sempre devolve o **pedido com a lista completa de itens** naquele momento; o SIDI decide quando consumir (idealmente quando o comprador encerrar o dia ou por politica operacional deles).
  - Observacao: a regra antiga "somente pedido finalizado pode ser enviado" pode ser **refinada** com status de missao/fechamento do dia; no MVP atual, **pendente_sidi** ja e listavel no GET.
- [DEFINIDO] Quais campos fiscais/financeiros entram ja no cadastro do app?
  - Decisao: desconsiderar no MVP (nao entram no cadastro inicial do app).
  - Regra: manter somente o conjunto minimo ja definido; campos fiscais/financeiros ficam para fase posterior de integracao/validacao com SIDI.
- [PENDENTE] Como definir `DTVENCTO` no app? (na criacao, regra posterior, ou na integracao)
  - Status: em aberto para validacao com cliente.
  - Direcionamento atual: ha indicio de que vencimento faz mais sentido no cabecalho do pedido (nao no item), mas depende de confirmacao de regra de negocio.
- [DEFINIDO] Quais campos de auditoria sao obrigatorios? (`created_at`, `updated_at`, usuario, device, origem)
  - Decisao: adotar auditoria obrigatoria em todos os registros de pedido e item, com foco em rastreabilidade de autoria, dispositivo e integracao.
  - Campos obrigatorios (pedido e item):
    - `created_at` (timestamp com timezone): data/hora de criacao.
    - `updated_at` (timestamp com timezone): data/hora da ultima alteracao.
    - `created_by_user_id` (FK usuario): autor da criacao.
    - `updated_by_user_id` (FK usuario): autor da ultima alteracao.
    - `origem_registro` (enum/string): origem da acao (`APP_COMPRADOR`, `APP_FINANCEIRO`, `INTEGRACAO_SIDI`, `SISTEMA`).
    - `device_id` (string): identificador do dispositivo que originou a operacao (quando aplicavel).
    - `request_id` (string/UUID): correlacao de requisicao para idempotencia e trilha tecnica.
  - Campos recomendados (fortemente uteis):
    - `session_id` (string/UUID): correlacao de sessao de compra CEAGESP.
    - `ip_origem` (string): IP da requisicao (backend/API).
    - `app_version` (string): versao do app cliente.
  - Diretriz: alteracoes de status critico (fechamento, reabertura, envio/erro de sync, recepcao) devem gerar evento em log de auditoria/sincronizacao.
- [DEFINIDO] E necessario historico de alteracoes de item/pedido? (trilha detalhada)
  - Decisao: nao neste momento.
  - Escopo atual: manter auditoria basica obrigatoria (`created_at`, `updated_at`, usuario, origem, device, request_id) sem trilha detalhada campo-a-campo.

---

## Decisoes arquiteturais sugeridas (para refletir)

### A) Modelo de dados no app
1. **Modelo minimo em producao (fila de exportacao)**
   - `integracao_sidi_pedidos` (cabecalho)
   - `integracao_sidi_pedido_itens` (itens)
   - Mantem campos alinhados ao contrato GET em `docs/integracao_sidi_get_patch_api.md` + referencia `solicitacao_dia_item_id` para rastreio da origem CEAGESP.
2. **`pedido_sync_log` (historico)**
   - Ainda nao implementado; opcional para auditoria fina de tentativas.
3. **Espelhamento completo do legado**
   - Nao e o objetivo: o app **nao** replica `CPEDIDOS`/`ITENSC` integralmente; o SIDI completa campos fiscais/financeiros ao gravar no banco dele.

### B) Chave de unicidade operacional
- Criar restricao unica para pedido "aberto" no criterio definido (data + fornecedor + comprador).
- Exemplo conceitual: `UNIQUE(data_compra, fornecedor_id, comprador_id, status_aberto)` ou regra equivalente.

### C) Politica de totais
- Opcao escolhida: persistir totais e atualizar a cada item (mais performatico para leitura, exige consistencia transacional).

### D) Politica de sincronizacao
- O **app** apenas expoe a fila e recebe resultado; **nao** envia dados ao banco SIDI.
- O **SIDI** puxa quando quiser (`GET`), processa com retentativas do lado deles e confirma (`PATCH`).
- **Fluxo de compra no CEAGESP** nao depende de `POST` para o SIDI; falha de integracao posterior nao bloqueia a baixa local (a fila local pode ficar `pendente_sidi` ate o SIDI consumir).

---

## Fluxo funcional (baixa CEAGESP + fila local)
1. Usuario confirma compra (baixa) no item da missao com `fornecedor` e dados da transacao.
2. Backend procura pedido **na fila** com `status = pendente_sidi` para o criterio `(data_compra da missao, fornecedor_id, comprador_id)`.
3. Se nao existir pedido aberto na fila, verifica regras de negocio futuras (fechamento/reabertura — **parcialmente** fora do MVP atual).
4. Se aplicavel, cria cabecalho em `integracao_sidi_pedidos` no `sabordaterraDB`.
5. Insere linha em `integracao_sidi_pedido_itens` (vinculo unico com `solicitacoes_dia_itens`).
6. Atualiza totais no cabecalho (`valor_total`, `itens_total`, `kg_total`, `un_total`, `hora_pedido`).
7. O pedido permanece `pendente_sidi` ate o SIDI consumir via **GET** e confirmar via **PATCH** (ver contrato de integracao).
8. Em paralelo, o backend atualiza `solicitacoes_dia_itens` (comprado, valores, fornecedor, etc.) — **banco local apenas**.

## Cenarios de teste que devem ser cobertos na decisao
- Primeiro item do dia para fornecedor A -> cria pedido A.
- Segundo item do dia para fornecedor A -> reutiliza pedido A.
- Primeiro item do dia para fornecedor B -> cria pedido B.
- Mesmo fornecedor em dia seguinte -> cria novo pedido.
- Dois salvamentos simultaneos do primeiro item (mesmo fornecedor/dia) -> nao duplica pedido.
- Retry do mesmo request -> nao duplica item (se idempotencia adotada).
- Exclusao do ultimo item do pedido -> apagar cabecalho (nao manter pedido vazio).

## Riscos se nao decidir antes
- Duplicidade de pedidos por corrida de concorrencia.
- Duplicidade de itens por retry de rede.
- Dificuldade de reconciliar com SIDI sem chave de correlacao.
- Acoplamento precoce a campos legados desnecessarios.
- Retrabalho por ausencia de regra clara de status de sincronizacao.

## Decisao minima recomendada (checkpoint)
Itens ja enderecados na implementacao atual da fila + contrato GET/PATCH; demais pontos seguem em evolucao:
1. Chave de agrupamento oficial do pedido — **definida** (`data_compra`, `fornecedor_id`, `comprador_id`).
2. Identificador canonico de fornecedor — **definido** (`fornecedores.id`).
3. Regra de abertura/fechamento/reabertura de pedido — **parcial** (fechamento de dia ainda como evolucao).
4. Estrategia de idempotencia e concorrencia — **parcial** (`request_id` pendente).
5. Estrutura minima de tabelas no `sabordaterraDB` — **implementada** (`integracao_sidi_pedidos` / `integracao_sidi_pedido_itens`).
6. Contrato de integracao com o SIDI — **definido** em `docs/integracao_sidi_get_patch_api.md`.

## Fora de escopo deste documento
- Implementacao de **tabelas** no banco do SIDI (`dbDadosSbT`) a partir do app (explicitamente **fora** do escopo).
- Detalhe interno de como o SIDI preenche cada coluna de `CPEDIDOS`/`ITENSC` apos o GET (responsabilidade do time SIDI).
- Mapeamento fiscal completo campo-a-campo (pode ser documento complementar).

## O que ja esta implementado (referencia rapida)
- Tabelas no **DB_NAME**: `integracao_sidi_pedidos`, `integracao_sidi_pedido_itens` (modelos em `backend/app/models/integracao_sidi.py`).
- Baixa CEAGESP: grava na fila + atualiza `solicitacoes_dia_itens` (`backend/app/services/solicitacoes_dia_itens.py`).
- Contrato **GET/PATCH** para o SIDI: `docs/integracao_sidi_get_patch_api.md` e rotas em `backend/app/routers/integracao_sidi.py` (prefixo `/api/v1/integracao/sidi/...` com `root_path` da API).

## Correlacao de campos App x SIDI (base para alinhamento)
Objetivo: servir como proposta inicial de de/para para validacao com SIDI.

### 1) Cabecalho de pedido (App `integracao_sidi_pedidos` -> SIDI `CPEDIDOS` apos consumo pelo SIDI)

| Campo App | Tipo (App) | Campo SIDI (CPEDIDOS) | Tipo (SIDI) | Tipo de correlacao | Observacao |
|---|---|---|---|---|---|
| `id` | UUID | *(sem equivalente nativo)* | - | Sem correspondencia direta | Identificador interno do app; deve ser mantido para rastreabilidade. |
| `sidi_numped` (recomendado) | int | `NUMPED` | int | Direta (pos-sync) | Preenchido apos PATCH de confirmacao do SIDI. |
| `data_compra` | date | `DTMOVIM` | date | Direta | Data operacional da compra. |
| `fornecedor_id` | int | `NUMERO` | int | Direta | `fornecedor_id` no app = `CADFORN.NUMERO`. |
| `fornecedor_fantasia` | string | `FANTASIA` | varchar(30) | Direta (snapshot) | Copiado do cadastro no momento da baixa (GET). |
| `comprador_id` | FK UUID | *(interno)* | - | Interno | No GET, o campo exposto para o SIDI e `comprador_codigo_sidi` (texto). |
| `comprador_codigo_sidi` | string | `COMPRADOR` | char(20) | Parcial | Exige regra de conversao / cadastro alinhado ao SIDI. |
| `status` (fila) | string | *(sem equivalente unico)* | - | Parcial | No SIDI o status operacional e distribuido em varios campos/processos. |
| `valor_total` (recomendado) | numeric | `VALOR` | numeric(12,2) | Direta | Total monetario do pedido. |
| `itens_total` (recomendado) | int | `ITENS` | int | Direta | Quantidade de itens no pedido. |
| `kg_total` (recomendado) | numeric | `KGTOTAL` | numeric(10,3) | Direta | Total de peso. |
| `un_total` (recomendado) | numeric | `UNTOTAL` | numeric(10,3) | Direta | Total em unidades. |
| `hora_pedido` | time | `HORAPED` | time | Parcial | Atualizado a cada item; GET expoe como `hora_pedido`. |
| `created_at` | datetime | *(sem equivalente nativo)* | - | Sem correspondencia direta | Auditoria local do app. |
| `updated_at` | datetime | *(sem equivalente nativo)* | - | Sem correspondencia direta | Auditoria local do app. |

Notas de alinhamento (cabecalho):
- Campos financeiros/fiscais do SIDI (`DTVENCTO`, `DOCPAG`, `CDPG`, `PZO`, `NOTA`, `REGNFE`, `REGNFD`, etc.) podem ficar fora do MVP e serem completados em fase posterior.
- Recomendado manter tabela/log de correlacao no app para auditar `UUID <-> NUMPED`.

### 2) Itens de pedido (App `integracao_sidi_pedido_itens` -> SIDI `ITENSC` apos consumo pelo SIDI)

| Campo App | Tipo (App) | Campo SIDI (ITENSC) | Tipo (SIDI) | Tipo de correlacao | Observacao |
|---|---|---|---|---|---|
| `id` | UUID | *(sem equivalente nativo)* | - | Sem correspondencia direta | Identificador interno do item no app. |
| `pedido_id` | UUID | `NUMPED` (via correlacao) | int | Indireta | Apos PATCH, `sidi_numped` no cabecalho amarra o pedido ao legado. |
| `solicitacao_dia_item_id` | UUID | *(sem equivalente nativo)* | - | Rastreio | Liga a linha da missao CEAGESP no app; nao existe no SIDI. |
| `item_seq` | int | `ITEM` | int | Direta | Sequencial do item no pedido. |
| `produto_id` | int | `CODMERC` | int | Direta | Codigo do produto no cadastro legado. |
| `qtde` | numeric | `QTDE` | numeric(10,3) | Direta | Quantidade do item. |
| `preco` | numeric | `PRECO` | numeric(12,4) | Direta | Preco unitario/negociado. |
| `un` | string | `UN` | varchar(6) | Direta | Unidade comercial. |
| `peso` (recomendado) | numeric | `PESO` | numeric(8,3) | Direta | Peso unitario/referencia. |
| `totkg` (recomendado) | numeric | `TOTKG` | numeric(10,3) | Direta | Total em KG no item. |
| `obs` (recomendado) | string | `OBS` | varchar(40) | Direta | Observacao operacional do item. |
| `request_id` | string/UUID | *(sem equivalente nativo)* | - | Sem correspondencia direta | Chave de idempotencia do app. |
| `created_at` | datetime | *(sem equivalente nativo)* | - | Sem correspondencia direta | Auditoria local. |
| `updated_at` | datetime | *(sem equivalente nativo)* | - | Sem correspondencia direta | Auditoria local. |
| `sidi_item` | int | `ITEM` | int | Direta (pos-PATCH) | Preenchido quando o SIDI confirma sucesso por item. |

Notas de alinhamento (itens):
- Campos legados adicionais (`VDESC`, `VDESP`, `VACRES`, `QPG`, `REGNF`, `TPNF`, `PDESC`, `TOTUN`, etc.) podem ser tratados como fase 2.
- No **GET**, o contrato ja carrega `pedido_uuid` / `item_uuid`; apos sucesso, o **PATCH** devolve `sidi_numped` e o mapeamento por item.

### 3) Campos sem correspondencia direta (recomendado manter no app)
- `id` (UUID) de pedido e item (`pedido_uuid` / `item_uuid` no contrato GET).
- `status` da fila, `ultimo_erro`, `ultimo_codigo_erro` e historico de tentativas (evolucao futura).
- `request_id` para idempotencia (evolucao futura).
- `created_at`/`updated_at` para auditoria operacional.
- `solicitacao_dia_item_id` para rastrear origem da compra no app.

### 4) Campos do SIDI sem correspondencia no MVP (avaliar depois)
- Financeiro/fiscal e baixa: `DTVENCTO`, `DOCPAG`, `CDPG`, `PZO`, `VALORPG`, `VALORBX`, `DTBAIXA`, `COB`, `NOTA`, `NOTAD`.
- Integracao fiscal/NF: `REGNFE`, `REGNFD`, `TPNF`.
- Campos administrativos/legados: `MARCAX`, `GF`, `UNC`, `XTAB`, `NUMROTA`, `SETOR`, `ENTREGA`, etc.

### 5) Regras de ouro para a interface com SIDI
1. A chave de negocio do app continua sendo UUID (pedido/item) + chave operacional `(data_compra, fornecedor_id, comprador_id)` para abertura da fila local.
2. O app **nao** grava no banco do SIDI; o **SIDI** grava em `CPEDIDOS`/`ITENSC` e devolve `NUMPED`/`ITEM` via **PATCH**.
3. A chave legada `NUMPED` e persistida no app (`sidi_numped`) somente apos **PATCH** de sucesso.
4. O de/para de contrato (`versao_contrato` no GET) deve ser versionado para evoluir sem quebrar consumidores.

## Ponto em aberto para validacao com cliente: DTVENCTO
Este tema deve ser discutido formalmente com cliente antes da implementacao.

### Hipotese atual
- `DTVENCTO` tende a fazer mais sentido no cabecalho do pedido (nivel pedido), e nao no item.
- Existe no dominio interno a referencia `solicitacoes_dia_itens.data_vencimento`, que precisa ser conciliada com o modelo final de compras CEAGESP.

### Perguntas de negocio para fechar decisao
1. O vencimento e unico para o pedido inteiro ou pode variar por item do mesmo pedido?
2. Se houver itens com vencimentos diferentes no mesmo fornecedor/dia/comprador, qual regra prevalece?
3. Quem define o vencimento: comprador, financeiro, regra automatica, ou o proprio fornecedor (documento fiscal)?
4. Em que momento o vencimento deve ser definido:
   - no cadastro da solicitacao;
   - durante a compra no CEAGESP;
   - no fechamento do pedido;
   - apenas na integracao com SIDI?
5. O comprador pode editar vencimento apos fechar a compra? Ate quando?
6. O financeiro pode sobrescrever vencimento informado pelo comprador? Com qual rastreabilidade?
7. Existem regras de prazo por fornecedor/condicao de pagamento (ex.: D+7, D+14, D+28)?
8. O vencimento depende da forma de pagamento (`BOLETO`, `CCRED`, `FIADO`, etc.)?
9. Se um pedido for reaberto ou houver novo pedido no mesmo dia para o mesmo fornecedor, o vencimento:
   - e herdado do pedido anterior;
   - recalculado;
   - definido manualmente novamente?
10. Em caso de sincronizacao tardia com SIDI, o vencimento e a data original do acordo ou data da sincronizacao?
11. Se SIDI retornar vencimento diferente do app, quem e a fonte da verdade?
12. Como tratar pedido sem vencimento definido no momento da compra? (bloqueia fechamento, permite pendencia, ou preenche default)

### Opcao de desenho para decisao com cliente
- Opcao A (preferencial): `data_vencimento` no cabecalho do pedido.
  - Pros: simplicidade operacional e consistencia com visao financeira do pedido.
  - Contras: nao cobre naturalmente cenarios de multiplo vencimento no mesmo pedido.
- Opcao B: `data_vencimento` por item.
  - Pros: flexibilidade maxima.
  - Contras: aumenta complexidade de fechamento, totais e conciliacao financeira.
- Opcao C: hibrida (cabecalho + excecao por item).
  - Pros: equilibrio entre simplicidade e casos excepcionais.
  - Contras: exige regras claras de precedencia.

### Recomendacao preliminar para discussao
- Levar para cliente a proposta de manter `DTVENCTO` no cabecalho como regra padrao.
- Confirmar se ha caso real e recorrente de vencimento diferente por item no mesmo pedido.
- Decidir tambem o responsavel pela definicao e o momento da captura do vencimento no fluxo.

