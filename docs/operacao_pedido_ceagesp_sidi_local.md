# Operação local: pedido CEAGESP até a fila SIDI (Swagger)

Este guia descreve o fluxo **no computador local**: criar a solicitação do dia, incluir itens, registrar a compra (baixa CEAGESP) e **consultar no app** os pedidos **prontos para o SIDI** consumir via `GET`.

> **Importante:** o app **não grava** no banco do SIDI. O que você valida no Swagger é a **fila local** (`integracao_sidi_pedidos` / `integracao_sidi_pedido_itens`). O sistema SIDI, ao rodar o `GET`, importa para o legado e depois responde com `PATCH` (ver `docs/integracao_sidi_get_patch_api.md`). Conferir “o pedido no SIDI” de fato (telas legado, `NUMPED`, etc.) é **fora** deste backend.

---

## 1. Pré-requisitos

- Backend rodando (`python -m backend.main` a partir da raiz do repositório, com `.venv` ativo).
- Banco local configurado (`.env` com `DATABASE_URL` / variáveis do projeto).
- Usuário com permissões:
  - `solicitacoes_dia:criar` — criar solicitação do dia;
  - `solicitacoes_dia:atualizar` — incluir/alterar itens antes da compra;
  - `ceagesp:acessar` — registrar baixa CEAGESP (PATCH com dados da compra).
- Cadastros mínimos: **produto** com unidades (`/unidades` / cadastro coerente), **fornecedor** sincronizado (o `fornecedor_id` na baixa é o **id numérico** do fornecedor no app, alinhado ao legado).
- Pacote **`tzdata`** instalado no Windows (já referenciado em `requirements.txt`) para evitar erro de `ZoneInfo("America/Sao_Paulo")` na importação dos módulos.

**Swagger local (típico):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)  
(Base URL da API no Uvicorn padrão: `http://127.0.0.1:8000`. Se você publicar atrás de proxy com prefixo, ajuste os caminhos.)

---

## 2. Obter JWT (login)

1. Abra o Swagger em `/docs`.
2. Use **POST** ` /users/login ` (tag **Usuários**).
3. Corpo (exemplo):

```json
{
  "username": "seu_usuario",
  "password": "sua_senha"
}
```

4. Copie o `access_token` da resposta.
5. No Swagger, clique em **Authorize**, informe: `Bearer <access_token>` (com a palavra `Bearer` e um espaço antes do token, se o campo pedir o esquema completo; ou apenas o token, conforme a UI do Swagger).

Todas as etapas seguintes (exceto o `GET` de integração opcionalmente protegido) usam esse token no header **Authorization**.

---

## 3. Criar a solicitação do dia

**POST** `/solicitacoes/`

Corpo:

| Campo | Descrição |
|--------|-----------|
| `data` | Data da missão (`YYYY-MM-DD`). Deve ser **hoje ou futura** (regra do backend). |
| `comprador_id` | UUID do comprador (usuário comprador da operação). |
| `observacoes` | Opcional. |

Resposta: objeto com `id` (UUID da solicitação). Guarde o **`id`** para os próximos passos.

Você pode conferir com **GET** `/solicitacoes/?data=YYYY-MM-DD` (e opcionalmente `comprador_id=`).

---

## 4. Incluir item na solicitação

**POST** `/solicitacoes-itens/`

Corpo:

| Campo | Descrição |
|--------|-----------|
| `solicitacao_id` | UUID retornado no passo 3. |
| `produto_codigo` | Código do produto no cadastro. |
| `quantidade` | Quantidade na unidade planejada (estrutura da lista de compras). |
| `unidade` | Ex.: `KG`, `UN`, etc. |

Resposta: corpo do item com **`id`** (UUID do item). Guarde esse **`id`** para a baixa.

Opcional: **GET** `/solicitacoes-itens/solicitacao/{solicitacao_id}` para listar itens da missão.

---

## 5. Registrar a compra no CEAGESP (baixa)

Este passo **marca o item como comprado** e **insere/atualiza a fila de integração SIDI** no banco do app (agrupando por data da solicitação, fornecedor e comprador, conforme regras do serviço).

**PATCH** `/solicitacoes-itens/{item_id}/baixa`

- `item_id`: UUID do item (passo 4).

Corpo (`RegistroCompraBaixa`):

| Campo | Descrição |
|--------|-----------|
| `fornecedor_id` | **Inteiro** — id do fornecedor no app (não confundir com UUID de usuário). |
| `quantidade_adquirida` | Quantidade comprada na unidade informada. |
| `unidade_comprada` | Deve existir cadastro de unidade para o produto (conversão para kg impacta validação do limite de 10%). |
| `valor_unitario` | Valor unitário negociado. |
| `data_vencimento` | Data de vencimento (`YYYY-MM-DD`). |
| `forma_pagamento` | Texto (ex.: boleto, cartão, em aberto). |
| `observacao` | Opcional. |

Validações relevantes (para não falhar no Swagger):

- Unidade comprada válida para o produto.
- Peso comprado não ultrapassa **110%** do peso calculado da solicitação.
- Se houver teto de preço no item e `valor_liberado` for falso, o unitário não pode exceder o teto.
- Fornecedor precisa existir no app.

Se tudo correr bem, a resposta é o item atualizado (`comprado: true`) e o backend grava a linha na fila SIDI.

---

## 6. GET para “ver o pedido integrável” no app (fila para o SIDI)

O consumidor oficial é o **SIDI**; para teste local você chama o mesmo endpoint:

**GET** `/v1/integracao/sidi/pedidos-pendentes`

Query opcional:

- `limit` — padrão 50, máximo 200.

### Autenticação deste endpoint

- Se a variável de ambiente **`SIDI_INTEGRACAO_API_KEY`** estiver **vazia**, o endpoint aceita chamadas **sem** chave (útil em desenvolvimento).
- Se estiver **preenchida**, envie o header:

`X-Sidi-Integration-Key: <mesmo valor de SIDI_INTEGRACAO_API_KEY>`

Não usa JWT de usuário — usa essa chave opcional.

### O que a resposta significa operacionalmente

- **`pedidos`**: lista de cabeçalhos com `pedido_uuid`, `data_compra`, `fornecedor_id`, totais e **`itens`** (linhas exportáveis).
- Esses registros estão com status **pendente de processamento pelo SIDI** no banco do app.

### Depois que o SIDI “integrar”

Quando o SIDI grava no legado e devolve **PATCH** `/v1/integracao/sidi/confirmacoes` com sucesso, o pedido no app passa a status integrado e **deixa de aparecer** em `pedidos-pendentes`. Ou seja:

- **Pedido na fila** → aparece no `GET pedidos-pendentes`.
- **Pedido já confirmado pelo PATCH** → some desse `GET`; o vínculo com o legado fica no app via `sidi_numped` (e itens numerados no contrato do PATCH), não neste documento de operação de tela.

Para apenas **inspecionar o JSON** sem o cliente SIDI, repetir o **GET** `pedidos-pendentes` após a baixa é suficiente.

---

## 7. Resumo rápido da ordem das chamadas

1. `POST /users/login` → token  
2. `POST /solicitacoes/` → `solicitacao_id`  
3. `POST /solicitacoes-itens/` → `item_id`  
4. `PATCH /solicitacoes-itens/{item_id}/baixa` → item comprado + fila SIDI  
5. `GET /v1/integracao/sidi/pedidos-pendentes` (+ `X-Sidi-Integration-Key` se configurado) → ver pedido exportável  

Referências de contrato e modelo de dados: `docs/integracao_sidi_get_patch_api.md`, `docs/decisao_pedidos_ceagesp_sabordaterraDB.md`.
