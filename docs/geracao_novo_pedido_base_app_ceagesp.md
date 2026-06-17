# Geracao de Novo Pedido no App (CEAGESP)

## Objetivo deste documento
Descrever, em linguagem de negocio, como o app deve gerar um novo pedido de compra no CEAGESP, quais regras operacionais se aplicam e quais impactos isso traz para comprador, financeiro e integracao com SIDI.

Este documento e voltado para validacao com cliente/usuarios do processo.

---

## Visao geral da regra
Um pedido no app representa uma compra de um comprador em um fornecedor, em um dia de compra.

A chave operacional para localizar/reutilizar um pedido e:
- `data_compra` (data do dispositivo)
- `fornecedor_id` (codigo canonico do fornecedor)
- `comprador_id`

Em outras palavras:
- mesmo dia + mesmo fornecedor + mesmo comprador -> o app tenta usar o mesmo pedido;
- mudando fornecedor ou comprador -> novo pedido;
- mudando de dia -> novo pedido.

---

## Quando um novo pedido e criado
Um novo pedido e criado quando o comprador tenta salvar um item e:
1. nao existe pedido aberto para `(data_compra, fornecedor_id, comprador_id)`, ou
2. existe pedido fechado e ele nao deve ser reaberto (regra abaixo), ou
3. existe pedido fechado e o usuario escolhe criar um novo em vez de reabrir.

---

## Regra de pedido aberto, fechado e reabertura

### 1) Pedido aberto
- Todos os pedidos da sessao de compras do comprador no dia ficam abertos durante a operacao no CEAGESP.
- Enquanto aberto, novos itens do mesmo fornecedor/comprador/dia entram nesse pedido.

### 2) Fechamento de pedidos
Os pedidos deixam de aceitar itens quando ocorre fechamento:
- fechamento normal: comprador finaliza as compras do dia e o sistema fecha todos os pedidos dele;
- fechamento manual do comprador: botao geral para fechar compras do dia, com confirmacao (mesmo com pendencias);
- fechamento manual do financeiro: financeiro pode fechar as compras do comprador a qualquer momento (ex.: esquecimento).

### 3) Novo item apos fechamento (mesmo fornecedor/dia/comprador)
Quando surgir compra de ultima hora:
- se pedido anterior estiver `JA RECEPCIONADO`: nao reabre, cria novo pedido automaticamente;
- se estiver `AINDA NAO RECEPCIONADO`: app pergunta se deseja reabrir o pedido fechado ou criar novo.

---

## Fluxo funcional (passo a passo)
1. Comprador seleciona item e confirma salvar.
2. App envia item com `request_id` unico (idempotencia).
3. Backend identifica `data_compra` (dispositivo), `fornecedor_id` e `comprador_id`.
4. Backend tenta localizar pedido aberto para a chave.
5. Se encontrar, inclui o item nesse pedido.
6. Se nao encontrar, aplica regra de pedido fechado:
   - `JA RECEPCIONADO` -> cria novo;
   - `AINDA NAO RECEPCIONADO` -> reabrir ou novo (conforme escolha).
7. Ao incluir item:
   - atualiza totais persistidos do cabecalho (`valor_total`, `itens_total`, `kg_total`, `un_total`);
   - mantém status de sincronizacao coerente.
8. Se item for o primeiro, o pedido nasce no app com UUID proprio.

---

## Comportamentos importantes para o usuario

### Para o comprador
- O sistema deve mostrar claramente quantas compras ainda estao pendentes.
- Quando houver inclusao de nova solicitacao no dia (apos fechamento), o app pode exibir notificacao temporaria.
- Ao fechar o dia com pendencias, deve existir confirmacao explicita.

### Para o financeiro
- Pode fechar compras do comprador quando necessario.
- Pode incluir demanda de ultima hora, gerando nova rodada de compra.

---

## Exclusao de itens
Se o ultimo item de um pedido for removido:
- o cabecalho do pedido deve ser removido tambem;
- nao manter pedido vazio.

---

## Regras de consistencia (boas praticas)

### 1) Sem duplicidade de pedido aberto
Nao pode existir mais de um pedido aberto para a mesma chave:
- `(data_compra, fornecedor_id, comprador_id, status_aberto)`

### 2) Idempotencia de item
Retries de rede nao podem duplicar item:
- mesmo `request_id` -> retornar resultado anterior, sem novo insert.

### 3) Auditoria basica obrigatoria
Pedido e item devem registrar:
- `created_at`, `updated_at`
- `created_by_user_id`, `updated_by_user_id`
- `origem_registro`
- `device_id`
- `request_id`

---

## Relacao com o SIDI (visao de negocio)
- O app e o sistema de captura operacional.
- SIDI recebe depois os pedidos finalizados.
- A sincronizacao e por pedido inteiro (nao parcial por item).
- Apenas pedido de compra finalizada pode ser enviado.
- Identidade no app: UUID.
- Identidade no SIDI: numerica.
- Deve existir correlacao entre os dois IDs para rastreabilidade.

---

## Pontos ja definidos
- Fornecedor canonico: `fornecedores.id` (origem `CADFORN.NUMERO`).
- Data da compra: data do dispositivo (operacao prevista entre 07h e 17h).
- Chave de agrupamento: `data_compra + fornecedor_id + comprador_id`.
- Totais: persistidos em cabecalho.
- Status de sync: `PENDENTE_ENVIO`, `EM_PROCESSAMENTO`, `ENVIADO`, `ERRO_RETRIAVEL`, `ERRO_FINAL`, `CANCELADO`.

---

## Ponto ainda em aberto para validacao com cliente
- Definicao de `DTVENCTO` (vencimento):
  - no cabecalho, no item, ou modelo hibrido;
  - quem define (comprador, financeiro, regra automatica, fornecedor);
  - em qual etapa do fluxo deve ser definido.

Este ponto deve ser fechado com cliente antes da implementacao final da camada financeira/fiscal.

