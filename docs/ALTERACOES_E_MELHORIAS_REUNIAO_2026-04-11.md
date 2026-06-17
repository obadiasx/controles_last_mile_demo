# Alterações e melhorias solicitadas — reunião 11/04/2026

**Local:** Sabor da Terra Alimentos (escritório)  
**Conteúdo:** transcrição integral da reunião de **11/04/2026** (`REUNIAO 2026-04-11.txt`), organizada por tema.

Este texto descreve **o que foi pedido** para orientar prioridades e testes.

**Legenda de acompanhamento:** quando um tópico já tiver sido **implementado no código**, o título da seção traz a marca **`(OK)`** — significa “pronto para validação na operação”; não substitui teste de negócio.

---

## 1. Formas de pagamento (compras) (OK)

- No sistema interno devem existir **apenas quatro** formas: **cartão**, **boleto**, **dinheiro** e **PIX**, mesmo que no sistema externo existam muitas outras opções.
- **Por fornecedor:** deve ser possível **cadastrar a condição padrão** (ex.: Canaã = boleto a 30 dias; outro fornecedor = 40 dias a partir da data de entrega). Quando já estiver definido, **não é obrigatório escolher de novo na hora da compra** — o sistema já traz a condição; só pergunta se **não** houver padrão cadastrado.
- Objetivo: o financeiro **conciliar** com o que já foi combinado (valor, produto, forma de pagamento), sem retrabalho na hora do lançamento.

**Anotação complementar (final da reunião):**

- **Cartão:** cadastro de cartões com código (4 dígitos), descrição e ativo/inativo.
- **Boleto:** cadastro de possibilidades de prazo (à vista, 10, 20, 30, 40 dias) com código, descrição e dias de prazo.

---

## 2. Tela “registrar compra” (Ordens de Compra) (OK)

- **Eliminar o campo “data de validade”** — não será mais usado nesse fluxo.
- Manter **observações** como **opcional**.
- O botão de **efetivar / registrar compra** não pode depender de campos que foram removidos ou que não fazem sentido; todos os obrigatórios precisam estar coerentes com as novas regras.

---

## 3. Lista do comprador (visual e prioridade) (OK)

- Trocar o formato de **vários cartões** por uma **lista** (linhas com colunas) — **(OK)** tela Ordens de Compra em tabela, com busca.
- **Ordem:** em cima o que **ainda não foi comprado**; abaixo o que **já foi comprado** — **(OK)** ordenação aplicada após o filtro de busca.
- Destaque visual para o que **ainda falta comprar** (fundo âmbar claro e barra lateral) e para **limite de preço** quando existir (coluna “Limite máx.” com valor, chip “Teto ativo” ou “Liberado”) — **(OK)**.

---

## 4. Solicitação do dia e inclusão de itens (financeiro) (OK)

- O **financeiro** precisa poder **incluir novos itens** na lista do dia (ex.: incluir mamão na mesma data), e o comprador **ver isso no mesmo dia**, sem criar “outro dia” por engano.
- Esclarecer regra de **quantidade** na hora de incluir (o que já existe de regra de negócio deve ficar claro na tela).

---

## 5. Limite de preço máximo aceitável (cadastro e uso) (OK)

- Tela/menu para o **financeiro** **consultar e alterar** o **valor máximo aceitável** por produto, **por unidade de medida** (caixa, quilo, unidade, etc.), alinhado ao que a operação realmente compra e vende.
- Quando o comprador comprar em **outra unidade** (ex.: pediu por caixa e comprou por quilo), o sistema deve poder **converter** usando pesos/medidas já conhecidos no cadastro externo, quando existirem.
- **Regra de valor:** o cadastro é de **máximo aceitável** — acima disso **não compra**, salvo **autorização explícita** do financeiro/administração (campo ou fluxo de liberação).
- **Tolerância:** ficou definido que há **margem na quantidade** (ex.: ideia de ~10% a mais ou a menos); **no preço** a regra discutida foi **valor máximo sem “passar um pouco”** — se passar, trava ou exige autorização (alinhar exatamente com o que já foi implementado).

**Implementação no código (para validação na operação):**

- Menu **«Tetos de preço (produtos)»** (`/produtos-teto-preco`): cadastro por produto e por unidade sincronizada; não é obrigatório preencher todas as unidades.
- **Conversão na compra:** prioriza teto da **unidade escolhida**; se não houver, usa **uma** outra regra com fator kg (conversão direta) ou, havendo **duas ou mais** outras regras, o **maior R$/kg** entre elas, aplicado à unidade da compra via `qtde_kg` local (`unidades_produto`).
- **Bloqueio de preço:** baixa CEAGESP e ajustes pré-compra validam valor unitário contra o teto; acima do teto só com **`valor_liberado`** (financeiro/administração).
- **Quantidade:** na baixa, validação de **até 10%** a mais que o peso solicitado (peso alvo × 1,10), coerente com a margem discutida.

---

## 6. Mensagens e bloqueios (OK)

- Ao tentar **excluir** um item **já comprado**, a mensagem não pode ser genérica: deve deixar claro que **não dá para excluir porque o item já foi comprado** (evitar confusão com outros erros).

**Implementação no código (para validação na operação):**

- API **403** com texto explícito (*«Não é possível excluir este item porque ele já foi comprado.»*); o frontend repassa o `detail` via `getApiErrorMessage`.
- Na **Solicitações do dia**, itens **comprados** não exibem o botão de excluir; se a exclusão falhar, **Alert** de erro inline na linha (sem substituir a linha inteira).

---

## 7. Cancelamento de compra (novo fluxo) — **(OK)**

- **Regra acordada:** **comprador** e **financeiro** podem cancelar o **registro** de uma compra já feita (item volta a **pendente**); **comprador** só na **missão do dia atual** e **própria** lista; **financeiro** e **administrador** também em **datas anteriores**.
- **Sistema externo (SIDI):** se o lote já estiver **integrado**, o cancelamento é **bloqueado** (HTTP 409) — conciliação ou estorno manual com o financeiro.
- **API:** `POST /solicitacoes-itens/{id}/cancelar-compra`, permissão `compras:cancelar` (papéis: comprador, financeiro, administrador).
- **UI:** botão **Cancelar compra** em itens já **Comprados** — **Ordens de compra (CEAGESP)** para o comprador; **Solicitações do dia** para financeiro/admin (o comprador **não** acessa essa tela; menu e rota bloqueados para esse perfil).

Validação operacional recomendada: exercitar o fluxo com **SIDI** em ambiente real (confirmar 409 quando já integrado).

---

## 8. Autonomia do comprador (correções) — **(OK)**

- O comprador precisa de **mínima autonomia** para **corrigir o próprio lançamento** antes de tudo estar fechado (ex.: escolheu fornecedor errado — trocar; preencheu errado — **cancelar só aquela compra** que ele fez e refazer).
- Ele **não apaga** o que o financeiro definiu na lista de solicitação; ajusta o que **ele mesmo** registrou na compra.

**Implementação:**

- **Ordens de compra (CEAGESP):** botão **Corrigir compra** em itens já comprados — reabre o modal com os dados do lançamento; ao salvar, o backend **substitui** o registro (`PATCH .../baixa` com item já comprado): remove a linha na fila SIDI se ainda **não** integrada e grava o novo lançamento (mesmas regras de perfil/data que cancelar compra).
- **Cancelar compra** permanece como alternativa para **desfazer** o lançamento e voltar o item a pendente (§ 7).
- A API de listagem de itens passa a expor os campos do lançamento (`fornecedor_id`, quantidades, `valor_unitario`, `forma_pagamento_ref_id`, `observacao`, etc.) para o front pré-preencher a correção.

---

## 9. Conferência de mercadorias (recebimento)

- O **conferente** deve enxergar informações **consistentes** com o que foi **comprado** (evitar divergência entre “o que o comprador viu” e “o que aparece na conferência”).
- **Decisão de processo:** o envio definitivo para o sistema externo (registro “oficial” pós-compra) deve ocorrer **depois da conferência**, quando o conferente **validar** o que chegou — assim o que entra no outro sistema reflete a **realidade da carga**, e não só o lançamento inicial.
- Cenários: **pedido incompleto** (faltou produto, quantidade menor, etc.); **vários fornecedores** para o mesmo produto; **várias entregas** no dia — a conferência precisa permitir **bater** produto, quantidade e fornecedor de forma clara.

---

## 10. Compra parcial e saldo em aberto — **(OK)**

- Se o comprador comprar **menos** que o solicitado (dentro das regras), o sistema deve **aceitar a quantidade menor** e **gerar saldo pendente** (nova linha ou pedido) para comprar depois ou em outro fornecedor.
- **Não comprar acima** do solicitado sem regra/autorização adequada.

**Implementação no código (para validação na operação):**

- **Backend** (`registrar_baixa` / `SolicitacaoItemService._planejar_desdobramento_compra_parcial`): ao registrar compra com quantidade **inferior** à solicitada, a **linha origem** passa a refletir só o **quantitativo efetivamente comprado** (`quantidade` ajustada); o **saldo** vira **nova linha** na mesma solicitação, **pendente** (`comprado=False`), com teto recalculado.
- **Mesma unidade** (ex.: pediu 3 UN e comprou 2 UN): desdobramento pelo **saldo na unidade original** (ex.: 1 UN pendente), **sem** exigir diferença mínima em kg (evita falha quando 1 unidade pesa menos de 1 kg).
- **Unidade de compra diferente** da solicitação: desdobramento só se a diferença de **peso em kg** for **> 1 kg**; saldo em **KG** com quantidade **inteira** (arredondamento universal / half-even); exige cadastro de unidade **KG** no produto; se não houver KG, a compra registra sem criar linha de saldo em kg (log de aviso).
- **Limite superior:** mantida a validação de **até 10%** a mais que o peso solicitado (coerente com § 5).
- **API:** resposta do `PATCH .../baixa` pode incluir `saldo_item_id` e `mensagem_desdobramento` quando há desdobramento.
- **Frontend (CEAGESP):** após salvar, modal **«Compra parcial — saldo em aberto»** quando a API envia `mensagem_desdobramento`.
- **Testes automatizados:** `backend/tests/test_compra_parcial_desdobramento.py` (lógica pura do planejamento; executar com `pytest` no ambiente do backend).

---

## 11. Pendências, fim do dia e painel — **(OK)**

- No **fechamento do dia**, itens **não recebidos** ou **não comprados** devem aparecer como **pendências** para o **financeiro** tratar: **reagendar** para outro dia, **cancelar**, **não repetir**, etc. — **sem** gerar automaticamente tudo para o dia seguinte sem decisão.
- Foi pedido algo **simples** (mesmo que uma tela enxuta) para ver **o que falta entregar**, **o que não foi comprado** e por fornecedor, substituindo controle só em papel.

---

## 12. Estoque (fase seguinte — fora do fechamento imediato)

- Após estabilizar compras e conferência, avançar para **módulo de estoque**: **estoque físico** x **estoque “virtual”** (sistema), **inventário** / alinhamento diário, integração com necessidade de **produção** do dia seguinte.
- Prazo desejado pela operação para essa fase foi mencionado em torno de **final de maio** em conversa — depende de cronograma conjunto.

---

## 13. Uso em paralelo (até o estoque pronto)

- Enquanto o estoque não estiver integrado, **manter** o fluxo atual de **planilhas** para decisões de compra, **digitando** no sistema item a item conforme a lista do dia — **retrabalho aceito** até a próxima etapa.

---

## 14. Prazo e forma de entrega (combinado na reunião)

- Entrega de **ajustes** para **teste a partir de segunda-feira** seguinte à reunião.
- **Testes pilotos** pela equipe até a **sexta-feira** da semana indicada na conversa.
- Envio de **documento resumo** após a reunião para validação (o presente arquivo apoia esse ponto).

---

## Observação final

Vários tópicos dependem de **desenho de telas**, **cadastros** e **regras finas** (limites, tolerâncias, permissões por perfil). Este documento **lista o que foi solicitado** na reunião de **11/04/2026** para servir de checklist entre negócio e equipe de desenvolvimento.
