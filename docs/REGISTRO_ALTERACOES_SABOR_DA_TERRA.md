# Registro de alterações — ERP Sabor da Terra

Este documento descreve **o que mudou no sistema** para quem usa o dia a dia na operação. Ele será atualizado quando houver novas melhorias ou decisões alinhadas com a equipe.

---

## Reunião de alinhamento — 10/04/2026

| | |
|---|--|
| **Quando** | 10 de abril de 2026 |
| **Onde** | Escritório — Sabor da Terra Alimentos |
| **Quem participou** | Dona Mara e Otniel |

As mudanças abaixo que estiverem marcadas com **“Pedido desta reunião”** foram tratadas a partir desse encontro. Outras entradas futuras poderão vir de novas conversas ou necessidades do dia a dia.

---

## O que já foi alterado (visão geral)

*Pedido desta reunião — 10/04/2026*

### Conferência de mercadorias (recebimento)

- A atualização dos dados da origem passa a respeitar melhor o trabalho já feito na loja: itens **já conferidos** não são “apagados” ou desfeitos automaticamente.
- Quando um item deixa de aparecer na lista atualizada importada, o sistema trata isso de forma controlada. Há opção de **ver também itens cancelados** quando for preciso conferir o histórico.
- Após sincronizar, o sistema pode mostrar um **resumo em texto** do que aconteceu na atualização.
- Ajustes na tela para **buscar e alterar** cada item de forma mais clara e alinhada ao pedido e ao número do item.

### Solicitações do dia e perfil do comprador

- Quem atua como **comprador** deixa de ver o menu **“Solicitações do Dia”** (uso voltado ao financeiro). O fluxo de compra do comprador fica no módulo de compras no entreposto.
- No menu lateral, para o comprador, o nome **“CEAGESP”** foi trocado por **“Ordens de Compra”**, linguagem mais clara para o dia a dia.

### Tela de registrar compra (Ordens de Compra)

- Foi removido o campo **Data de validade** na hora de registrar a compra do produto, conforme combinado.

### Excluir item da lista (financeiro)

- Se alguém tentar **excluir** um item que **já foi comprado**, o sistema responde com mensagem explícita (**não é possível excluir… porque já foi comprado**), exibida na própria linha, em vez de mensagem genérica.

---

## Atualização implementada — 08/04/2026

*Alterações de produto alinhadas às decisões sobre forma de pagamento, compra no entreposto e uso do dia a dia pelo comprador e pelo financeiro.*

### Formas de pagamento e cadastro por fornecedor

- Passa a existir um **catálogo interno** de formas de pagamento (famílias: **cartão**, **boleto** com prazo em dias, **dinheiro** e **PIX**). Cada opção tem descrição clara (por exemplo, “Boleto - 30 dias”; cartão com referência aos **quatro últimos dígitos** quando aplicável).
- O **financeiro** (e perfil equivalente) pode definir, **por fornecedor**, a **forma de pagamento padrão** negociada. Com isso, na hora de registrar a compra:
  - se já houver padrão, a condição aparece **fixa** (sem troca pelo comprador);
  - se **não** houver padrão, o **comprador escolhe** uma opção do catálogo.
- Foi adicionada ao menu, para quem tem permissão adequada, a entrada **“Pagamento (fornecedores)”**, para manter esse vínculo sem misturar com outras telas.
- O sistema pode **preencher o catálogo automaticamente** na subida da aplicação; há também **script SQL de inserção** (documentação) para ambientes em que se prefira carregar o mesmo conjunto de opções manualmente.
- Bases de dados **já existentes** podem precisar de **ajustes de colunas** (documentados em script à parte): o aplicativo cria tabelas novas ao iniciar, mas não altera sozinho tabelas antigas já criadas.

### Solicitações do Dia — perfil comprador

- Na tela de **Solicitações do Dia**, o usuário com perfil **comprador** **não escolhe mais a data** em um calendário: o sistema considera **sempre o dia atual** (referência de data alinhada ao fuso de São Paulo), coerente com a regra de operar apenas compras do dia.

### Ordens de Compra (entreposto / CEAGESP)

- A lista de itens a comprar deixou de ser exibida como **grade de cards grandes** e passou a ser uma **lista em tabela** (produto, quantidade, unidade, status e ação).
- Foi incluída **busca por nome do produto** para achar itens rápido em listas longas.
- O botão **Comprar** em cada linha **abre o formulário de registro da compra** (modal), onde seguem as regras de fornecedor, valores e forma de pagamento já descritas acima.

### Observações e permissões (apoio à operação)

- O registro de compra pode guardar **observações** do comprador no item, alinhado ao fluxo de baixa e integração.
- Ajuste de **permissões** para o perfil **administrador** em tarefas ligadas a fornecedor/forma de pagamento, alinhando menu e API.

---

## Próximas atualizações

Sempre que houver uma mudança nova, será acrescentada uma entrada **acima** desta seção, com **data** e **breve texto** do que o usuário passa a ver ou fazer diferente. Quem cuidar do documento pode indicar se o pedido veio de uma reunião (com data e nomes) ou de outro canal.

---

*Última revisão deste texto: 08/04/2026.*
