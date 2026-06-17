# Integracao App x SIDI - Contrato Externo (GET + PATCH)

## Objetivo
Definir, de forma objetiva para o time SIDI, como sera a integracao:
- SIDI faz `GET` dos pedidos integraveis;
- SIDI tenta gravar pedido e itens em uma unica transacao local;
- SIDI faz `PATCH` unico de retorno com sucesso ou erro.

Foco deste documento: apenas o contrato externo de integracao.

---

## Endpoints (propostos)

| Operacao | Metodo | Rota |
|---|---|---|
| Buscar pedidos integraveis | `GET` | `/api/v1/integracao/sidi/pedidos-pendentes` |
| Retornar resultado da gravacao | `PATCH` | `/api/v1/integracao/sidi/confirmacoes` |

Cabecalho recomendado em ambas as chamadas:
- `X-Request-Id`: UUID da requisicao (idempotencia e rastreabilidade tecnica).

---

## Regra de processamento no SIDI (transacional)
Para cada pedido recebido no GET:
1. Iniciar transacao no banco SIDI.
2. Inserir cabecalho em `CPEDIDOS`.
3. Inserir todos os itens em `ITENSC`.
4. Se **tudo** ocorrer com sucesso: `COMMIT` e enviar `PATCH` de sucesso.
5. Se houver falha em qualquer etapa: `ROLLBACK` e enviar `PATCH` de erro com motivo.

Com isso, o retorno para o app e unico por pedido, reduzindo complexidade operacional.

---

## Campos do GET e equivalencia com SIDI

### Cabecalho do pedido

| Campo JSON (GET) | Obrigatorio | Equivalente SIDI | Tabela SIDI |
|---|---|---|---|
| `pedido_uuid` | sim | *(sem equivalente nativo; chave de correlacao)* | - |
| `data_compra` | sim | `DTMOVIM` | `CPEDIDOS` |
| `fornecedor_id` | sim | `NUMERO` | `CPEDIDOS` |
| `fornecedor_fantasia` | recomendado | `FANTASIA` | `CPEDIDOS` |
| `comprador_codigo_sidi` | recomendado | `COMPRADOR` | `CPEDIDOS` |
| `valor_total` | sim | `VALOR` | `CPEDIDOS` |
| `itens_total` | sim | `ITENS` | `CPEDIDOS` |
| `kg_total` | sim | `KGTOTAL` | `CPEDIDOS` |
| `un_total` | sim | `UNTOTAL` | `CPEDIDOS` |
| `hora_pedido` | opcional | `HORAPED` | `CPEDIDOS` |

### Itens do pedido

| Campo JSON (GET) | Obrigatorio | Equivalente SIDI | Tabela SIDI |
|---|---|---|---|
| `item_uuid` | sim | *(sem equivalente nativo; chave de correlacao)* | - |
| `item_seq` | sim | `ITEM` | `ITENSC` |
| `produto_id` | sim | `CODMERC` | `ITENSC` |
| `qtde` | sim | `QTDE` | `ITENSC` |
| `preco` | sim | `PRECO` | `ITENSC` |
| `un` | sim | `UN` | `ITENSC` |
| `peso` | opcional | `PESO` | `ITENSC` |
| `totkg` | opcional | `TOTKG` | `ITENSC` |
| `obs` | opcional | `OBS` | `ITENSC` |
| `dtmovim` | opcional | `DTMOVIM` | `ITENSC` |

---

## Exemplo de resposta do GET

```http
GET /api/v1/integracao/sidi/pedidos-pendentes?limit=50
```

```json
{
  "meta": {
    "versao_contrato": "1.0",
    "gerado_em": "2026-03-20T14:32:01-03:00",
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

---

## PATCH de retorno (unico por pedido)

### Regra
- Enviar **um PATCH por pedido processado**.
- `sucesso = true` somente quando cabecalho + todos os itens foram gravados com `COMMIT`.
- Em falha, enviar `sucesso = false` com `ROLLBACK` ja executado no SIDI.

### Body request - sucesso

```json
{
  "pedido_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "sucesso": true,
  "sidi_numped": 12661,
  "itens_confirmados": [
    {
      "item_uuid": "f0e1d2c3-b4a5-6789-0123-456789abcdef",
      "sidi_item": 1
    },
    {
      "item_uuid": "11111111-2222-3333-4444-555555555555",
      "sidi_item": 2
    }
  ],
  "mensagem": null
}
```

### Body request - erro (com rollback)

```json
{
  "pedido_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "sucesso": false,
  "sidi_numped": null,
  "itens_confirmados": [],
  "codigo_erro": "SIDI_TX_001",
  "mensagem": "Falha ao inserir item 2 em ITENSC. Transacao revertida (rollback)."
}
```

---

## Resposta esperada do app ao PATCH (exemplo)

```json
{
  "ok": true,
  "pedido_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "idempotente": false
}
```

---

## Observacoes de contrato
- `pedido_uuid` e `item_uuid` sao as chaves de correlacao do app e devem ser devolvidas no PATCH.
- `sidi_numped` corresponde a `CPEDIDOS.NUMPED`.
- `sidi_item` corresponde a `ITENSC.ITEM` para o respectivo `sidi_numped`.
- Campos adicionais do legado nao presentes no GET podem ser preenchidos pelo SIDI conforme suas regras internas.
