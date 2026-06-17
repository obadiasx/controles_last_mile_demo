# Estratégia de conferência unificada (comprador + financeiro direto)

## 1) Contexto e objetivo

Este documento consolida:

- o que foi discutido na reunião de 11/04/2026 sobre conferência, pendências e fechamento do dia;
- a proposta discutida via WhatsApp, que inverte o processo e centraliza o fluxo na nossa plataforma.

Objetivo: ter **um único processo de conferência**, com tratamento adequado para duas origens de compra:

1. compra feita pelo **comprador** (dados mais estruturados, já validados na compra);
2. compra feita pelo **financeiro direto no fornecedor** (maior necessidade de validação no recebimento).

---

## 2) Princípio central do novo desenho

### Processo invertido e padronizado

- O pedido nasce e é controlado na **nossa plataforma** (não no SIDI).
- A conferência ocorre na nossa plataforma.
- A integração com o SIDI acontece **depois da conferência concluída**, quando o que ocorreu no dia está confirmado.

Com isso:

- elimina-se o fluxo híbrido confuso ("às vezes confere no SIDI, às vezes no app");
- o conferente trabalha sempre na mesma tela e no mesmo modelo de dados;
- pendências são tratadas antes de virar lançamento definitivo no SIDI.

---

## 3) Tipos de origem e regra de conferência

Não é necessário criar dois botões no início do fluxo de solicitação.  
O fornecedor será tratado de forma dinâmica na recepção, conforme as entregas chegam, aproveitando a operação já existente.

Para o conferente, o fluxo operacional permanece: **Receber, Conferir, Aceitar ou Rejeitar**.

## 3.1 Compra via comprador (CEAGESP/app)

Características:

- dados já "redondos" (fornecedor, item, quantidade e preço já registrados na compra);
- já existe pré-validação operacional no momento da compra.

Conferência recomendada:

- foco em **recebimento físico** (chegou / não chegou / parcial / divergente);
- conferente não precisa redigitar dados de pedido;
- ajustes são de status de recebimento e divergência.

## 3.2 Compra direta pelo financeiro (fornecedor por e-mail/WhatsApp)

Características:

- pedido nasce na nossa plataforma como "compra direta";
- pode haver mais incerteza na entrega real (unidade, quantidade, substituições).

Conferência recomendada:

- conferência **completa** (produto, unidade, quantidade, condições recebidas);
- maior rigor de validação no recebimento;
- divergências mais detalhadas para apoiar decisão financeira.

---

## 4) Fluxo operacional unificado (visão de negócio)

1. Pedido criado na plataforma (origem = comprador ou financeiro direto).
2. Pedido fica em estado "aguardando recebimento".
3. Caminhões chegam com cargas possivelmente misturadas (vários fornecedores/produtos).
4. Conferente registra recebimento item a item.
5. Sistema calcula saldo e pendências (não recebido, parcial, divergente).
6. Financeiro trata pendências (reagendar, cancelar, não repetir, manter em aberto).
7. Quando o pedido/lote estiver pronto para fechamento, integra no SIDI.

---

## 5) Estratégia de recepção inteligente (cenário real de doca)

## 5.1 Premissa de operação

Na recepção podem chegar materiais de múltiplos fornecedores misturados na mesma descarga.
O conferente precisa localizar rapidamente "o que estou vendo na mão agora".

## 5.2 Proposta de UX para conferência por fornecedor

### Entrada principal de conferência

- Busca por **produto** (texto/código);
- contexto de **fornecedor atual** (quando já há um fornecedor sendo descarregado);
- atalho para troca rápida de fornecedor.

### Regra de sugestão automática de fornecedor

Para cada produto selecionado:

1. Se existir **apenas 1 fornecedor pendente** para esse produto no dia:
   - selecionar automaticamente esse fornecedor.
2. Se existir mais de 1 fornecedor possível:
   - priorizar fornecedor atual da doca/sessão;
   - abrir confirmação:  
     "Este item é do fornecedor atual `<X>` ou de outro fornecedor?"
3. Se conferente marcar "outro fornecedor":
   - listar fornecedores candidatos que também tenham o **mesmo produto do item em conferência**, com saldo pendente e quantidade esperada.

### Confirmação de ambiguidade (produto em mais de um fornecedor)

- Exibir compacto:
  - fornecedor;
  - quantidade pendente;
  - última atualização.
- Conferente confirma de quem é o item recebido.

Observação de usabilidade: para o conferente, a navegação principal deve ser centrada em fornecedor e itens pendentes, porém a origem da compra deve ser sinalizada visualmente com identificadores claros.

### Identificação visual por origem na tela

- usar cores diferentes para itens oriundos do comprador e itens oriundos do financeiro;
- complementar com identificadores não dependentes de cor (chip/ícone/texto), por exemplo:
  - `Origem: Comprador`
  - `Origem: Financeiro`
- manter essa identificação no card/lista e também no detalhe do item para reduzir erro operacional.

Resultado: menos erro de vinculação e conferência mais rápida em cenário de carga mista.

---

## 6) Painel discreto de pendências na tela de conferência

Objetivo: dar visão operacional sem poluir a interface.

## 6.1 Conteúdo mínimo sugerido

- **Fornecedores pendentes**: total de fornecedores com algo não recepcionado;
- **Itens pendentes**: total geral de itens ainda não recepcionados;
- Lista curta `fornecedor / qtd itens pendentes`.

## 6.2 Comportamento

- Atualização em tempo real (ou a cada ação de conferência);
- clique no fornecedor filtra a grade/lista para aquele fornecedor;
- destaque para fornecedor com maior volume pendente.

Exemplo de bloco:

- Canaã — 12 itens
- Mamute — 7 itens
- João da Silva — 3 itens

---

## 7) Estados recomendados do item de conferência

- `AguardandoRecebimento`
- `EmConferencia`
- `RecebidoConforme`
- `RecebidoComDivergencia`
- `Parcial`
- `NaoRecebido`
- `PendenteDecisaoFinanceiro`
- `FinalizadoParaIntegracao`
- `IntegradoSIDI`

Observação: para compra via comprador, alguns campos podem vir pré-preenchidos e bloqueados; para compra direta, ficam abertos para validação completa.

---

## 8) Regras de fechamento e integração com SIDI

## 8.1 Regra geral

- Integração com SIDI só após conferência e decisão mínima das pendências do lote/pedido.

## 8.2 Regra prática de operação

- Itens aprovados pelo conferente ficam habilitados para importação no SIDI;
- a consolidação é por **pedido**: quando o conferente concluir o último item do pedido, o pedido é marcado como concluído;
- ao concluir o pedido, enviar **e-mail imediatamente** para os destinatários configurados;
- itens pendentes permanecem no painel de pendências para decisão do financeiro;
- itens inconsistentes, ausentes, recusados ou devolvidos para troca voltam para decisão financeira;
- evitar empurrar automaticamente tudo para o dia seguinte sem decisão explícita.

## 8.3 Contingência sem integração automática

Enquanto o consumidor automático não estiver pronto:

- quando o pedido for concluído na conferência, disparar e-mail com os dados necessários para digitação no SIDI;
- manter lançamento manual no SIDI como contingência controlada.

## 8.4 Administração de e-mail (restrito a admin)

Implementar duas telas administrativas:

1. **Configuração SMTP do remetente**  
   - restrito a administrador;  
   - configurar conta remetente (ex.: `compras@sabordaterraalimentos.com.br`), host, porta, segurança, usuário e credencial.

2. **Destinatários de notificação de pedido concluído**  
   - restrito a administrador;  
   - cadastrar e manter lista de e-mails que receberão os dados do pedido para digitação no SIDI (enquanto a API automática não existir).

---

## 9) BPMN simplificado (para apresentação)

**BPMN** significa **Business Process Model and Notation** (Modelagem e Notação de Processos de Negócio).  
Na prática, é um padrão visual para desenhar fluxos de trabalho de forma clara, mostrando:

- quem executa cada etapa (raias/participantes);
- quais atividades acontecem em sequência;
- onde existem decisões (gateways);
- como o processo começa, avança e termina.

Neste documento, o BPMN está em versão textual simplificada para facilitar entendimento e validação com o cliente antes do desenho visual final.

## 9.1 Participantes (raias)

- Financeiro
- Comprador
- Conferente
- APP SabordaTerra (nossa plataforma)
- SIDI

## 9.2 Fluxo textual simplificado

1. **Financeiro/Comprador** cria pedido no APP SabordaTerra (com origem identificada).
2. **APP SabordaTerra** registra pedido em "aguardando recebimento".
3. **Conferente** inicia recepção na doca.
4. **Conferente** identifica produto recebido.
5. **APP SabordaTerra** tenta sugerir fornecedor automaticamente.
6. **Gateway**: há ambiguidade de fornecedor?
   - Não: vincula automaticamente.
   - Sim: pede confirmação do conferente.
7. **Conferente** confirma quantidades e status (conforme/parcial/divergente/não recebido).
8. **APP SabordaTerra** atualiza painel de pendências.
9. **Gateway**: item/lote foi aceito ou rejeitado?
   - Aceito: segue para fila de integração.
   - Rejeitado/divergente: volta para decisão financeira.
10. **Gateway**: há pendências críticas em aberto?
   - Sim: financeiro decide reagendar/cancelar/não repetir.
   - Não: consolida para integração.
11. **Gateway**: o último item do pedido foi concluído?
   - Sim: marcar pedido como concluído e disparar e-mail imediato para os destinatários configurados.
   - Não: seguir conferência dos demais itens.
12. **SIDI** confirma integração.
13. **APP SabordaTerra** encerra ciclo do pedido/lote.

---

## 10) Macro-ganhos esperados

- Processo único de conferência, sem alternar fonte de verdade.
- Menos retrabalho e menos erro em carga mista.
- Pendências visíveis e tratáveis com decisão explícita.
- Melhora da rastreabilidade por fornecedor.
- Preparação natural para etapa seguinte: estoque físico vs virtual.

---

## 11) Recomendação de implantação

1. Ativar classificação de origem do pedido (`comprador` vs `financeiro_direto`).
2. Implementar UX de confirmação inteligente por fornecedor.
3. Incluir painel discreto `fornecedor / itens pendentes`.
4. Ajustar regras de fechamento com pendências.
5. Habilitar integração automática com SIDI (ou contingência por e-mail no curto prazo).

Com isso, o cliente enxerga um fluxo simples para operação, mas robusto para governança e auditoria.

