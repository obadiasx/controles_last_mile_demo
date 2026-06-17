# Integração HTTP — pedidos CEAGESP (documentação para o SIDI)

**Público-alvo:** equipe técnica responsável pelo sistema **SIDI** (legado).  
**Objetivo:** especificar apenas o que deve ser **desenvolvido do lado SIDI**: chamadas HTTP, formato dos dados e regras de negócio da interface, para **importar pedidos** retornados pela API e **devolver o resultado** de cada importação.

---

## 1. URL e protocolo

| Item | Valor |
|------|--------|
| Protocolo | **HTTPS** |
| Host (produção) | `app.sabordaterraalimentos.com.br` |
| Prefixo de API | `/api` (caminhos completos abaixo já incluem esse prefixo) |

**Base para montar URLs:**  
`https://app.sabordaterraalimentos.com.br/api`

---

## 2. Autenticação

Todas as requisições descritas aqui exigem o header:

| Header | Conteúdo |
|--------|-----------|
| `X-Sidi-Integration-Key` | String secreta acordada entre SIDI e Saborda Terra Alimentos |

**A chave em si não consta deste documento.** Ela será **enviada por canal à parte** (e-mail seguro, canal fechado de projeto etc.). Trate-a como credencial: armazene em cofre de segredos ou variável de ambiente no serviço que consumir a API; não versionar em repositório público nem registrar em log em claro.

Resposta típica se a chave estiver errada ou ausente: **401 Unauthorized** (corpo JSON com `detail` explicativo, quando aplicável).

**Opcional — rastreio:** `X-Request-Id` com um UUID novo por requisição, para correlacionar suporte entre as duas pontas.

---

## 3. Visão do fluxo (lado SIDI)

1. Chamar periodicamente (ou sob demanda) o **GET** de pedidos pendentes.
2. Para **cada objeto** `pedido` na lista retornada:
   - Executar **uma transação local** no banco SIDI: gravar cabeçalho em `CPEDIDOS` e linhas em `ITENSC`, usando o **mapeamento de campos** deste documento.
   - Se o **commit** for bem-sucedido → enviar **um PATCH** com `sucesso: true`, informando o `NUMPED` gerado e o número de cada linha (`ITEM`) correspondente a cada `item_uuid` recebido no GET.
   - Se houver falha e **rollback** → enviar **um PATCH** com `sucesso: false` e mensagem de erro adequada.
3. Pedidos para os quais o PATCH de sucesso foi aceito **deixam de aparecer** em chamadas futuras ao GET (a origem considera o ciclo encerrado para aquele `pedido_uuid`).

Recomenda-se tratar um pedido por vez até estabilizar o processo, ou definir concorrência internamente com cuidado para não enviar dois PATCH diferentes para o mesmo `pedido_uuid` ao mesmo tempo.

---

## 4. GET — listar pedidos pendentes

### 4.1 Requisição

```http
GET /api/v1/integracao/sidi/pedidos-pendentes?limit=50 HTTP/1.1
Host: app.sabordaterraalimentos.com.br
Accept: application/json
X-Sidi-Integration-Key: <chave enviada à parte>
```

| Parâmetro (query) | Tipo | Obrigatório | Descrição |
|-------------------|------|-------------|-----------|
| `limit` | inteiro | Não | Padrão **50**. Mínimo **1**, máximo **200**. |

### 4.2 Resposta **200 OK** — estrutura JSON

- **`meta`**
  - `versao_contrato` — string (ex.: `"1.0"`).
  - `gerado_em` — data/hora ISO 8601 (geralmente em UTC).
  - `proximo_cursor` — uso futuro; hoje costuma vir `null`.
- **`pedidos`** — array; cada elemento representa um pedido pendente de importação:
  - `pedido_uuid` (UUID)
  - `data_compra` (data `YYYY-MM-DD`)
  - `fornecedor_id` (inteiro)
  - `fornecedor_fantasia` (string)
  - `comprador_codigo_sidi` (string — valor esperado no cadastro legado do comprador)
  - `valor_total`, `itens_total`, `kg_total`, `un_total` (números)
  - `hora_pedido` (hora opcional, ou `null`)
  - **`itens`** — array; cada elemento:
    - `item_uuid` (UUID)
    - `item_seq` (inteiro — sequência da linha no pedido)
    - `produto_id` (inteiro)
    - `qtde`, `preco` (números)
    - `un` (string, unidade)
    - `peso`, `totkg`, `obs`, `dtmovim` — opcionais (`null` permitido onde não houver valor)

### 4.3 Exemplo de corpo de resposta

```json
{
  "meta": {
    "versao_contrato": "1.0",
    "gerado_em": "2026-03-20T14:32:01.000Z",
    "proximo_cursor": null
  },
  "pedidos": [
    {
      "pedido_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "data_compra": "2026-03-20",
      "fornecedor_id": 4,
      "fornecedor_fantasia": "PIEDADE",
      "comprador_codigo_sidi": "COMPRADOR",
      "valor_total": 2400.0,
      "itens_total": 2,
      "kg_total": 200.0,
      "un_total": 0.0,
      "hora_pedido": "13:45:00",
      "itens": [
        {
          "item_uuid": "f0e1d2c3-b4a5-6789-0123-456789abcdef",
          "item_seq": 1,
          "produto_id": 83,
          "qtde": 8.0,
          "preco": 120.0,
          "un": "CX",
          "peso": 17.0,
          "totkg": 136.0,
          "obs": null,
          "dtmovim": "2026-03-20"
        },
        {
          "item_uuid": "11111111-2222-3333-4444-555555555555",
          "item_seq": 2,
          "produto_id": 299,
          "qtde": 8.0,
          "preco": 75.0,
          "un": "CX",
          "peso": 8.0,
          "totkg": 64.0,
          "obs": null,
          "dtmovim": "2026-03-20"
        }
      ]
    }
  ]
}
```

### 4.4 Sugestão de mapeamento para `CPEDIDOS` / `ITENSC`

Campos do JSON que não existirem no legado podem ser derivados por regra interna SIDI.

| Campo no JSON | Uso sugerido no legado |
|----------------|-------------------------|
| `data_compra` | `CPEDIDOS.DTMOVIM` |
| `fornecedor_id` | `CPEDIDOS.NUMERO` (código fornecedor) |
| `fornecedor_fantasia` | `CPEDIDOS.FANTASIA` |
| `comprador_codigo_sidi` | `CPEDIDOS.COMPRADOR` |
| `valor_total` | `CPEDIDOS.VALOR` |
| `itens_total` | `CPEDIDOS.ITENS` |
| `kg_total` | `CPEDIDOS.KGTOTAL` |
| `un_total` | `CPEDIDOS.UNTOTAL` |
| `hora_pedido` | `CPEDIDOS.HORAPED` (se aplicável) |
| `pedido_uuid` | guardar como chave de correlação externa, se houver campo / tabela auxiliar |
| *(itens)* `item_seq` | `ITENSC.ITEM` |
| `produto_id` | `ITENSC.CODMERC` |
| `qtde` | `ITENSC.QTDE` |
| `preco` | `ITENSC.PRECO` |
| `un` | `ITENSC.UN` |
| `peso` | `ITENSC.PESO` |
| `totkg` | `ITENSC.TOTKG` |
| `obs` | `ITENSC.OBS` |
| `dtmovim` (item) | `ITENSC.DTMOVIM` |
| `item_uuid` | guardar como correlação até enviar o PATCH |

---

## 5. PATCH — informar resultado da importação

Um **único PATCH por `pedido_uuid` processado** (sucesso após commit ou falha após rollback).

### 5.1 Requisição

```http
PATCH /api/v1/integracao/sidi/confirmacoes HTTP/1.1
Host: app.sabordaterraalimentos.com.br
Content-Type: application/json
X-Sidi-Integration-Key: <chave enviada à parte>
```

### 5.2 Corpo JSON — campos

| Campo | Tipo | Regra |
|--------|------|--------|
| `pedido_uuid` | UUID | Obrigatório. Deve ser o mesmo recebido no GET para esse pedido. |
| `sucesso` | boolean | Obrigatório. `true` somente se **todo** o pedido foi gravado com sucesso (commit no SIDI). |
| `sidi_numped` | inteiro ou `null` | Se `sucesso` é `true`, **obrigatório** — número `NUMPED` atribuído no `CPEDIDOS`. Se `sucesso` é `false`, normalmente `null`. |
| `itens_confirmados` | array | Se `sucesso` é `true`: lista com **exatamente um** objeto por item do GET daquele pedido. Cada objeto: `item_uuid` (igual ao do GET) e `sidi_item` (inteiro ≥ 1, o `ITEM` em `ITENSC` correspondente). Não incluir UUID a mais nem faltar nenhum. Se `sucesso` é `false`, pode ser array vazio. |
| `codigo_erro` | string ou `null` | Recomendado em falha — código interno SIDI. |
| `mensagem` | string ou `null` | Recomendado em falha — descrição legível (ex.: motivo após rollback). |

### 5.3 Exemplo — sucesso

```json
{
  "pedido_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "sucesso": true,
  "sidi_numped": 12661,
  "itens_confirmados": [
    { "item_uuid": "f0e1d2c3-b4a5-6789-0123-456789abcdef", "sidi_item": 1 },
    { "item_uuid": "11111111-2222-3333-4444-555555555555", "sidi_item": 2 }
  ],
  "codigo_erro": null,
  "mensagem": null
}
```

### 5.4 Exemplo — erro (após rollback)

```json
{
  "pedido_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "sucesso": false,
  "sidi_numped": null,
  "itens_confirmados": [],
  "codigo_erro": "SIDI_TX_001",
  "mensagem": "Falha ao inserir segundo item em ITENSC; transação revertida."
}
```

### 5.5 Resposta **200 OK** ao PATCH

```json
{
  "ok": true,
  "pedido_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "idempotente": false
}
```

- **`idempotente: true`** — a origem já tinha registrado sucesso anterior para esse `pedido_uuid`; o PATCH foi aceito como **reenvio idempotente** (não é necessário repetir a gravação no SIDI).
- **`ok: true`** — o corpo do PATCH foi aceito e processado.

### 5.6 Outros códigos HTTP úteis

| Código | Significado típico |
|--------|---------------------|
| **400** | Conteúdo inválido (ex.: `sucesso=true` sem `sidi_numped`; lista `itens_confirmados` incompleta ou inconsistente com o pedido). Ver `detail` no JSON. |
| **401** | Chave de integração incorreta ou ausente. |
| **404** | `pedido_uuid` não reconhecido pela API no momento da chamada. |

---

## 6. Comportamento em reenvio

Se o SIDI repetir um PATCH de **sucesso** para um pedido **já confirmado** na origem, a API pode responder **200** com `idempotente: true`. O cliente pode tratar isso como “já processado” e não duplicar efeitos locais.

---

## 7. Parâmetros fornecidos à parte

- **Chave** do header `X-Sidi-Integration-Key`.
- Eventuais ajustes de **host**, **certificado** ou política de IP (**allowlist**) combinados com a Saborda Terra Alimentos, quando aplicável.

---

*Documento exclusivo para suporte à especificação da integração SIDI. Versão do contrato de payload indicada em `meta.versao_contrato` nas respostas do GET.*
