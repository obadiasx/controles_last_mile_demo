# Roteiro de vídeos — demonstração da Conferência Unificada ao cliente

Documento de apoio à gravação de vídeos no **frontend**, alinhado a `docs/PLANO_SPRINT_CONFERENCIA_UNIFICADA.md` (Sprints 2 a 9 e épicos A–H). Cada bloco cobre uma **camada lógica**; grave em vídeos curtos (sugestão: 3 a 8 minutos cada) e evolua nesta ordem para a narrativa ficar clara.

---

## Como usar este roteiro

| Campo em cada etapa | Uso |
|---------------------|-----|
| **Nome sugerido (arquivo)** | Texto curto para renomear o arquivo de vídeo exportado. |
| **Sinopse (fala ao cliente)** | Ideia central do que comunicar antes ou durante a gravação. |
| **Passo a passo na tela** | Checklist do que executar no sistema; marque ao gravar. |

### Personas e “clientes” fictícios (você mapeia na base)

| Rótulo no roteiro | Perfil sugerido | Você associa a… |
|-------------------|-----------------|------------------|
| **Cliente A** | Pedido com origem **comprador** (doca típica) | Um fornecedor/pedido real da homologação |
| **Cliente B** | Pedido com origem **financeiro** (campos extras na conferência) | Outro fornecedor/pedido real |
| **Cliente C** | Cenário de **ambiguidade** (mesmo produto possível em mais de um fornecedor) | Pedido/produto que dispare o diálogo de confirmação |

**Produtos fictícios** (substitua pelos nomes reais ao gravar, mantendo a ideia):

- **Tomate extrusado kg** — item simples, um fornecedor (Cliente A).
- **Cebola amarela 20 kg** — item que aparece para **Cliente B** e **Cliente C** com regras diferentes.
- **Alho descascado bandeja** — segundo item no mesmo pedido para mostrar lista e fases.

### Perfis de usuário (atores)

| Ator | Foco na demo | Permissões típicas (ajuste ao seu cadastro) |
|------|----------------|-----------------------------------------------|
| **Conferente** | Docas, busca, cards, modal, ambiguidade | Conferência; pode **não** ter `conferencia:visualizar_detalhes` |
| **Financeiro** | Fila, decisão por linha, liberação global, notificação, registro manual | Ex.: `solicitacoes_dia:atualizar` + visualização de detalhes conforme política |
| **Admin / TI** | SMTP, destinatários SIDI | Ex.: `usuarios:listarTodos` ou equivalente usado na tela de admin de notificação |

### Antes de gravar (checklist técnica)

1. Ambiente **homologação** (nunca grave senhas reais de produção em tela).
2. Três contas de teste (ou troca de usuário entre takes): conferente, financeiro, admin.
3. Dados preparados: pelo menos um pedido **Em conferência**, um **Aguardando decisão financeiro**, e (se possível) um em **Pronto para integração** após decisões.
4. **SMTP:** caixa de teste (Mailtrap, subdomínio interno) já cadastrada para o vídeo de e-mail, ou deixe explícito no áudio que o disparo é de homologação.
5. Resolução de tela estável (1920×1080), zoom do navegador 100%, barra de favoritos limpa se quiser visual mais “produto”.

### Dicas de gravação

- Mostre o **mouse** e **pausas** após salvar (aguarde refetch ~1–2 s).
- Ao citar “SIDI”, explique em uma frase: integração externa de compras; e-mail e registro manual são **contingência** até automação plena.
- Se um passo falhar por dado ausente, **corte** ou grave um “take 2” com outro pedido — não improvise regra de negócio.

---

## Camada 0 — Contexto e acesso

### Etapa 0.1 — Abertura e papéis no sistema

**Nome sugerido (arquivo):** `00-contexto-papeis-conferente-financeiro-admin`

**Sinopse (fala ao cliente):**  
Apresentar o ERP como ponto único da operação de conferência; explicar que **conferente**, **financeiro** e **admin** têm responsabilidades distintas e que o fluxo evolui do recebimento físico até a decisão de integração e notificação.

**Passo a passo na tela:**

1. Abrir o sistema e fazer **login** (sem gravar a senha: use overlay ou corte).
2. Mostrar o **menu** e localizar **Conferência** (caminho usado pela operação).
3. Em slide mental ou narração: “Cliente A = comprador; Cliente B = financeiro; Cliente C = ambiguidade — você já escolheu na base quem é cada um.”
4. **Logout** e login rápido com **outro perfil** (só mostrar que o menu muda se for o caso), sem aprofundar ainda na conferência.

---

## Camada 1 — Painel da doca (visão operacional)

### Etapa 1.1 — Painel, filtros e carga de trabalho

**Nome sugerido (arquivo):** `01-painel-doca-filtros-fornecedor-produto`

**Sinopse (fala ao cliente):**  
A doca enxerga **pendências por fornecedor**, totais de itens e pode filtrar por **fornecedor** e **produto** para achar pedidos na carga do dia.

**Passo a passo na tela:**

1. Login como **conferente**.
2. Abrir **Conferência**.
3. Apontar para o **resumo** (fornecedores pendentes, itens pendentes) se visível nos cards.
4. No filtro, digitar parte do nome do **Cliente A** (fornecedor) e produto **Tomate extrusado kg**; clicar em **Atualizar busca**.
5. Mostrar a **lista paginada** de pedidos; mudar de página se houver mais de uma.

### Etapa 1.2 — Fases rápidas e cancelados

**Nome sugerido (arquivo):** `02-filtros-fase-pedido-cancelados`

**Sinopse (fala ao cliente):**  
O painel classifica pedidos por **fase macro** (abertos na conferência, aguardando financeiro, etc.) e permite **exibir ou ocultar cancelados**, reduzindo ruído na operação.

**Passo a passo na tela:**

1. Na mesma tela, usar os **chips / filtro rápido de fase**: **Todos** → **Abertos na conferência** → **Aguardando decisão financeiro** (se seu usuário **tiver** permissão de ver esta fase; se não tiver, mencionar que “sem permissão este filtro oculta pedidos financeiros”).
2. Ativar e desativar **mostrar cancelados**; comparar a lista antes e depois.
3. Narrar que a lista **atualiza periodicamente** (aprox. 20 s) e também após ações — sem precisar esperar os 20 s no vídeo.

---

## Camada 2 — Identificação comprador × financeiro

### Etapa 2.1 — Visual no card (origem da compra)

**Nome sugerido (arquivo):** `03-origem-comprador-vs-financeiro-cards`

**Sinopse (fala ao cliente):**  
O sistema deixa explícito se a compra veio pelo fluxo **comprador** ou **financeiro**, com **cor, chip e hierarquia** diferentes — evita erro de interpretação na doca.

**Passo a passo na tela:**

1. Localizar um card do **Cliente A** (mapear para pedido **comprador**).
2. Ampliar mentalmente: mostrar **chip / cor lateral** de origem **comprador**.
3. Rolar até um card do **Cliente B** (**financeiro**); contrastar visualmente com o anterior.
4. Não abrir o modal ainda — só reforçar a leitura rápida “de longe”.

---

## Camada 3 — Conferente: fluxo comprador (modal e status)

### Etapa 3.1 — Conferir item comprador (somente leitura no pedido)

**Nome sugerido (arquivo):** `04-conferencia-modal-origem-comprador-cliente-A`

**Sinopse (fala ao cliente):**  
No fluxo **comprador**, o conferente foca na **quantidade física** e no **resultado** da linha; dados sensíveis do pedido em nível “cabeçalho” ficam **somente leitura**, alinhados à operação de recebimento.

**Passo a passo na tela:**

1. Abrir o pedido do **Cliente A** com item **Tomate extrusado kg**.
2. Abrir o **modal / formulário** de conferência do item.
3. Mostrar campos **bloqueados** coerentes com `origem_compra = comprador` (conforme a tela exibir).
4. Preencher **quantidade recebida** (ex.: 100) e resultado coerente (ex.: **Conferido** / conforme opções reais).
5. **Salvar**; fechar; mostrar o card atualizado e **fase do pedido** se mudar.

### Etapa 3.2 — Segundo item e conclusão parcial do pedido

**Nome sugerido (arquivo):** `05-multiplos-itens-fase-pedido-cliente-A`

**Sinopse (fala ao cliente):**  
Um pedido tem **várias linhas**; a **fase do pedido** agrega o estado das linhas — o conferente vê o progresso sem abrir planilha externa.

**Passo a passo na tela:**

1. No mesmo pedido **Cliente A**, abrir segundo item (**Alho descascado bandeja**).
2. Conferir com quantidade diferente da esperada se quiser mostrar **parcial** (se existir no enum da sua base).
3. Salvar e observar **fase_conferencia** / rótulos na lista ou no card.

---

## Camada 4 — Conferente: fluxo financeiro (campos editáveis)

### Etapa 4.1 — Item com origem financeiro

**Nome sugerido (arquivo):** `06-conferencia-modal-origem-financeiro-cliente-B`

**Sinopse (fala ao cliente):**  
Quando a compra nasce no **financeiro**, o conferente pode ajustar na doca campos como **unidade** e **quantidade esperada** conforme acordado — com validação e mensagens em português.

**Passo a passo na tela:**

1. Abrir pedido do **Cliente B** com **Cebola amarela 20 kg**.
2. No modal, mostrar campos **editáveis** (ex.: unidade, quantidade esperada) que **não** aparecem iguais no fluxo comprador.
3. Alterar um valor **válido**; salvar.
4. Opcional: tentar um valor **inválido** propositalmente, mostrar **mensagem de erro** da API na tela; corrigir e salvar de novo.

---

## Camada 5 — Ambiguidade de fornecedor (Sprint 2)

### Etapa 5.1 — Produto com mais de um fornecedor possível

**Nome sugerido (arquivo):** `07-ambiguidade-fornecedor-confirmacao-cliente-C`

**Sinopse (fala ao cliente):**  
Em carga mista, o mesmo **código de produto** pode existir para **dois fornecedores**. O sistema **não aplica** o filtro sozinho: exige **confirmação explícita** do conferente para evitar conferência no fornecedor errado.

**Passo a passo na tela:**

1. Buscar produto que no seu preparo dispare ambiguidade para **Cliente C** (ex.: **Cebola amarela 20 kg** sem filtrar fornecedor, ou conforme dado que duplique fornecedor).
2. Disparar **“Atualizar busca”** ou ação que leve ao **diálogo de ambiguidade**.
3. Mostrar a **lista de fornecedores candidatos**; escolher um; **confirmar**.
4. Aplicar filtro e abrir o item — narrar que isso é **segurança operacional**, não burocracia.

---

## Camada 6 — Sincronização e mensagens (se usar na sua demo)

### Etapa 6.1 — Sincronizar conferência e erros legíveis

**Nome sugerido (arquivo):** `08-sincronizacao-lista-erros-amigaveis`

**Sinopse (fala ao cliente):**  
A operação pode **ressincronizar** dados de pedidos; quando algo falha, a mensagem reflete o retorno da API (**detalhe** do servidor), facilitando suporte.

**Passo a passo na tela:**

1. Se existir botão/ação de **sincronizar conferência** na tela, executar uma vez com sucesso.
2. (Opcional) Em homolog com API desligada, mostrar **mensagem de erro** — ou apenas **narrar** o comportamento sem simular falha.

---

## Camada 7 — Financeiro I: fila, detalhe e decisão por linha (Sprint 6)

### Etapa 7.1 — Abrir painel financeiro e fila

**Nome sugerido (arquivo):** `09-financeiro-fila-pedidos-aguardando-decisao`

**Sinopse (fala ao cliente):**  
O financeiro trabalha com uma **fila** de pedidos em **aguardando decisão financeira**, filtra por fornecedor e abre o **detalhe por linha** com prévia do que será **incluído ou excluído** do pacote SIDI.

**Passo a passo na tela:**

1. **Logout**; login como **financeiro** (permissão de decisão).
2. Em **Conferência**, abrir o diálogo **Fila e decisão financeira por linha** (ou nome exibido).
3. Mostrar lista à esquerda; usar **filtro de fornecedor** (ex.: nome ligado ao **Cliente B**).
4. Selecionar um **pedido_id** que esteja na fila.
5. À direita, mostrar **linhas**, status e o **alerta numérico** de incluídos / excluídos na prévia SIDI.

### Etapa 7.2 — Ações por linha (liberar, manter fora, pendência)

**Nome sugerido (arquivo):** `10-financeiro-acoes-por-linha-preview-sidi`

**Sinopse (fala ao cliente):**  
Cada linha só entra no SIDI após **ação explícita** do financeiro; as ações mudam o status de forma **auditável** e alinhada ao modelo canônico.

**Passo a passo na tela:**

1. Em uma linha elegível, aplicar **Liberar para integração SIDI** (ou rótulo equivalente).
2. Em outra linha, **Manter fora** ou **Pendência financeira** — escolher o que fizer sentido nos seus dados.
3. Observar **atualização** da prévia (contagens) e mensagem de sucesso se houver.
4. Fechar e reabrir o diálogo para mostrar **persistência** (opcional).

---

## Camada 8 — Financeiro II: liberação global em duas etapas (Sprint 7)

### Etapa 8.1 — Prévia, exclusões e ciência obrigatória

**Nome sugerido (arquivo):** `11-liberacao-global-duas-etapas-exclusoes-sidi`

**Sinopse (fala ao cliente):**  
A **liberação global** é de alto impacto: o sistema **obriga** ver **quantas linhas entram e quantas ficam de fora**, lista as **excluídas**, e só confirma com **ciência explícita** — reduz erro humano na integração.

**Passo a passo na tela:**

1. No mesmo pedido (idealmente com **várias linhas** e algumas excluídas da prévia), clicar **Liberação global (2 etapas)**.
2. Etapa 1: **Gerar prévia** — mostrar números **incluídos / excluídos** e lista de **excluídos**.
3. Etapa 2: **Avançar para confirmação**; marcar **ciência das exclusões** (checkbox).
4. **Confirmar liberação global**; mostrar retorno e fila atualizada.
5. Narrar o cenário clássico “10 linhas, 3 fora” como **valor de negócio**, mesmo que seu pedido tenha outras contagens.

---

## Camada 9 — Admin: SMTP e destinatários (Sprint 8)

### Etapa 9.1 — Configuração SMTP (contingência e-mail)

**Nome sugerido (arquivo):** `12-admin-configuracao-smtp-notificacao-sidi`

**Sinopse (fala ao cliente):**  
Enquanto a integração automática com o SIDI evolui, o e-mail é **contingência operacional**. O **admin** configura **host, porta, TLS, remetente** e ativação — sem depender de deploy de código.

**Passo a passo na tela:**

1. **Logout**; login como **admin** (permissão de administração da notificação SIDI).
2. Em **Conferência**, abrir o diálogo de **administração de notificação SIDI** / SMTP (nome exato da UI).
3. Preencher **servidor SMTP de homologação** (host, porta, usuário, senha — **borrar** senha no vídeo ou usar variável já salva e só mostrar campos não secretos).
4. Marcar **TLS** conforme provedor; salvar.
5. Mostrar mensagem de **sucesso** ou alerta se SMTP inativo.

### Etapa 9.2 — Destinatários da contingência

**Nome sugerido (arquivo):** `13-admin-destinatarios-email-sidi`

**Sinopse (fala ao cliente):**  
A lista de **destinatários** define **quem recebe** o pacote de informações para digitação manual no SIDI; é possível **ativar / desativar** sem apagar histórico.

**Passo a passo na tela:**

1. No mesmo diálogo, ir à área de **destinatários**.
2. **Incluir** destinatário fictício: `Financeiro Demo` / e-mail de teste.
3. Mostrar **toggle** ativo/inativo em um destinatário existente.
4. Salvar ou confirmar conforme a UI.

---

## Camada 10 — Disparo de notificação / e-mail (Sprint 8)

### Etapa 10.1 — Disparo manual e gatilho pós-liberação

**Nome sugerido (arquivo):** `14-disparo-notificacao-sidi-email-contingencia`

**Sinopse (fala ao cliente):**  
Quando o pedido está **pronto para integração** e há linhas no pacote, o financeiro pode **disparar a notificação**; o corpo do e-mail traz **pedido, fornecedor, fase e linhas** para uso manual no SIDI.

**Passo a passo na tela:**

1. Login **financeiro**; abrir painel financeiro no pedido que esteja **Pronto para integração** (ou equivalente) **após** as decisões anteriores.
2. Clicar em **Disparar notificação** / **Notificar SIDI** (rótulo da UI).
3. Mostrar **feedback** na tela (sucesso ou mensagem de bloqueio se pedido não elegível — explicar regra no áudio).
4. (Opcional) Abrir o **cliente de e-mail** de homologação e mostrar o **assunto/corpo** recebido — **sem** expor e-mails pessoais reais.

---

## Camada 11 — Registro manual de envio SIDI (Sprint 8.1)

### Etapa 11.1 — Primeiro registro e histórico

**Nome sugerido (arquivo):** `15-registro-manual-envio-sidi-protocolo`

**Sinopse (fala ao cliente):**  
Depois que alguém **lançou manualmente** no SIDI, o financeiro **registra** protocolo e observação no ERP — isso fecha o **ciclo de rastreio** entre sistema, e-mail e operação externa.

**Passo a passo na tela:**

1. No detalhe financeiro do mesmo pedido, localizar **Registro manual** / histórico.
2. Preencher **protocolo** fictício: `SIDI-HOMOL-2026-00091` e observação: `Lançamento manual conferido com Mara`.
3. **Salvar**; mostrar linha nova no **histórico cronológico**.

### Etapa 11.2 — Segundo registro exige observação

**Nome sugerido (arquivo):** `16-registro-manual-segundo-envio-observacao-obrigatoria`

**Sinopse (fala ao cliente):**  
Para evitar **duplicidade sem justificativa**, o segundo registro no mesmo pedido **só passa** se houver **observação explícita** — regra de consistência para auditoria.

**Passo a passo na tela:**

1. Tentar registrar de novo **sem** observação nova — mostrar **bloqueio** ou mensagem da API.
2. Preencher **observação obrigatória**: `Reenvio após retificação SIDI`.
3. Salvar com sucesso e mostrar **dois registros** no histórico.

---

## Camada 12 — Permissões: o que o conferente não vê (Sprint 5)

### Etapa 12.1 — Perfil sem “visualizar detalhes financeiros”

**Nome sugerido (arquivo):** `17-permissao-painel-oculta-aguardando-financeiro`

**Sinopse (fala ao cliente):**  
Pedidos em **aguardando decisão financeira** podem ficar **ocultos** para perfis de doca que **não** devem antecipar decisão — separação de deveres entre **conferente** e **financeiro**.

**Passo a passo na tela:**

1. Login como **conferente sem** `conferencia:visualizar_detalhes` (conforme seu cadastro).
2. Abrir **Conferência**; aplicar filtro **Aguardando decisão financeiro** — mostrar lista **vazia** ou ausência de pedidos que o financeiro ainda vê.
3. **Logout**; login **com** a permissão; repetir o filtro e mostrar que os pedidos **aparecem**.
4. Explicar em uma frase o **risco evitado** (doca não “antecipa” decisão financeira).

---

## Camada 13 — Encerramento e go-live (Sprint 9)

### Etapa 13.1 — Resiliência e operação assistida (narrativa curta)

**Nome sugerido (arquivo):** `18-resumo-go-live-health-mensagens-erro`

**Sinopse (fala ao cliente):**  
O módulo passou por **estabilização**: mensagens de erro mais claras, testes automatizados, smoke E2E e **endpoints de saúde** para TI monitorar — a operação assistida no go-live usa o **plano** e o **guia rápido** já documentados.

**Passo a passo na tela:**

1. Na **Conferência**, provocar um erro leve (ex.: ação negada) **ou** apenas mostrar uma mensagem já exibida em take anterior — objetivo é **falar** sobre melhoria de `detail` da API.
2. (Opcional, para TI) Em outra aba ou Postman, chamar `GET /health` e `GET /health/ready` — **não é tela do frontend**, mas pode ser **slide** ou segundo vídeo “TI em 60 segundos”.
3. Encerrar com **fluxo resumido** em voz: doca → decisão linha a linha → liberação global consciente → e-mail / registro manual → auditoria.

---

## Camada 14 — Vídeo único “história completa” (opcional)

### Etapa 14.1 — Jornada ponta a ponta (roteiro longo)

**Nome sugerido (arquivo):** `19-jornada-completa-doca-financeiro-notificacao-15min`

**Sinopse (fala ao cliente):**  
Um único filme linear: **Cliente A** na doca → situação que gera **fila financeira** → **Cliente B** no financeiro → **liberação global** com exclusões → **admin SMTP** (trecho curto) → **disparo** → **registro manual**.

**Passo a passo na tela:**

1. Cole os passos principais das etapas **3.1**, **7.2**, **8.1**, **9.1** (resumido), **10.1** e **11.1** em uma única gravação, com **cortes** entre trocas de usuário.
2. Use **títulos em tela** (OBS, CapCut, etc.) para marcar: “Doca”, “Financeiro”, “Admin”, “Contingência”.

---

## Tabela rápida: ordem sugerida dos arquivos

| Ordem | Arquivo sugerido | Ator principal |
|------:|------------------|----------------|
| 1 | `00-contexto-papeis-...` | Narrador |
| 2 | `01-painel-doca-...` | Conferente |
| 3 | `02-filtros-fase-...` | Conferente |
| 4 | `03-origem-comprador-vs-...` | Conferente |
| 5 | `04-conferencia-modal-comprador-...` | Conferente |
| 6 | `05-multiplos-itens-...` | Conferente |
| 7 | `06-conferencia-modal-financeiro-...` | Conferente |
| 8 | `07-ambiguidade-fornecedor-...` | Conferente |
| 9 | `08-sincronizacao-...` | Conferente |
| 10 | `09-financeiro-fila-...` | Financeiro |
| 11 | `10-financeiro-acoes-por-linha-...` | Financeiro |
| 12 | `11-liberacao-global-...` | Financeiro |
| 13 | `12-admin-smtp-...` | Admin |
| 14 | `13-admin-destinatarios-...` | Admin |
| 15 | `14-disparo-notificacao-...` | Financeiro |
| 16 | `15-registro-manual-...` | Financeiro |
| 17 | `16-registro-manual-segundo-...` | Financeiro |
| 18 | `17-permissao-painel-...` | Conferente + comparativo |
| 19 | `18-resumo-go-live-...` | Narrador / TI |
| 20 | `19-jornada-completa-...` | Todos |

---

## Referência cruzada com o plano de sprints

| Conteúdo do vídeo | Sprints / épicos no plano |
|-------------------|-------------------------|
| Busca, ambiguidade, visual origem | Sprint 2, 4, épico B/G |
| Painel, filtros, permissão detalhe | Sprint 5, épico C |
| Fases pedido × itens, modal | Sprint 3–4, épico F/G |
| Fila financeira, ação linha, preview | Sprint 6, épico H |
| Liberação global, exclusões | Sprint 7, épico H |
| SMTP, destinatários, disparo e-mail | Sprint 8, épico D/E |
| Registro manual, idempotência | Sprint 8.1 |
| Mensagens, health, operação assistida | Sprint 9 |

Se um cenário **não existir** na sua base (ex.: nenhum pedido “pronto para integração”), **prepare dados** com o time de backoffice antes da gravação ou substitua a etapa por **narração com tela estática** (slide) mostrando o fluxo já validado em homologação.
