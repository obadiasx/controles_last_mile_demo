Sumário

[1\. Cenário Atual 2](#_Toc214049166)

[1.1. Caso 1: Compras do Cassiano no CEAGESP 2](#_Toc214049167)

[1.2. Caso 2: Solicitação Direta ao Fornecedor (ex: Daniel Verduras) 3](#_Toc214049168)

[2\. Melhorias propostas 4](#_Toc214049169)

[3\. Funcionalidade das melhorias 5](#_Toc214049170)

[3.1. Otniel Alimentando Base que Cassiano Consome no CEAGESP 5](#_Toc214049171)

[3.2. Cassiano Consumindo no CEAGESP 6](#_Toc214049172)

[3.4. Dinâmica com o Fornecedor Contatado Diretamente por Otniel (Melhoria do Caso 2) 7](#_Toc214049173)

[3.5. Dinâmica do Conferente com Cada um dos Casos que Chegam Nele 8](#_Toc214049174)

[4\. Próximos Passos e Definição de Escopo 9](#_Toc214049175)

[4.1. Validação do Entendimento e Escopo 9](#_Toc214049176)

[4.2. Ações de Implementação e Integração (Pró-Escopo) 9](#_Toc214049177)

[4.3. Considerações sobre o Cenário Ideal 10](#_Toc214049178)

[4.4. Gestão Contratual 10](#_Toc214049179)

Esse documento visa descrever a reunião com Otniel no dia 08/11 e as possíveis melhorias implementadas para melhorar o escopo do projeto

# 1\. Cenário Atual

O cenário atual foi exposto a partir de dois casos específicos:

## 1.1. Caso 1: Compras do Cassiano no CEAGESP

| **Foco**                          | **Cenário Atual (Processo Manual/Desconectado)**                                                                                                                                                                                                                      |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Criação do Pedido (Otniel)**    | Otniel cria a lista de itens necessários e a envia para Cassiano através do **WhatsApp**.                                                                                                                                                                             |
| **Execução da Compra (Cassiano)** | Cassiano vai ao CEAGESP, compra os itens, já obtém o preço no box e **cria um novo pedido no sistema (SIDI) pelo celular** para cada fornecedor/box visitado, registrando a **quantidade** e o **valor**.                                                             |
| **Registro do Fornecedor (Box)**  | O vendedor do box registra a compra em **comandas/notinhas de papel**.                                                                                                                                                                                                |
| **Conferência na Recepção**       | Cassiano retorna à empresa, entrega os produtos e um "bolinho" de notas de papel. O conferente usa impressão fornecida por Otniel para checar se a **quantidade física** bate com a **quantidade registrada por Cassiano**. O conferente **não tem acesso ao preço**. |
| **Fechamento Financeiro**         | A assistente de Otniel confere posteriormente as notas de papel (se houver) contra os registros no SIDI.                                                                                                                                                              |

## 1.2. Caso 2: Solicitação Direta ao Fornecedor (ex: Daniel Verduras)

| **Foco**                       | **Cenário Atual (Processo Manual/Desconectado)**                                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **Criação do Pedido (Otniel)** | Otniel cria o pedido no sistema (SIDI) com as **quantidades** apenas, sem valor, pois o fornecedor fatura posteriormente.        |
| **Entrega e Cobrança**         | O fornecedor entrega os produtos e envia o **boleto ou fatura da semana/quinzena** com o valor total e o detalhamento da compra. |
| **Conferência e Pagamento**    | Otniel e a assistente realizam uma **conferência manual demorada**.                                                              |

# 2\. Melhorias propostas

Uma automatização desses cenários resultaria em ganhos diretos e mensuráveis conforme descrito a seguir:

| **Benefício** | | **Descrição da Melhoria** |
| --- | | --- |
| **Integração e Tempo Real** | | Todos os usuários (Otniel, Cassiano, Conferente) acessam a **mesma plataforma**, eliminando a necessidade do WhatsApp para a lista de compras e permitindo o acompanhamento em tempo real. |
| **Rastreabilidade e Consistência** | | O sistema armazena automaticamente o pedido de Otniel, a baixa de Cassiano e a conferência de Recebimento, mantendo um **histórico completo** e amarrado de cada etapa. |
| **Eliminação do Papel** | | Substituição da lista do WhatsApp, das notas de papel do box e da conferência manual de preços, **digitalizando o processo** de ponta a ponta. |
| **Controle de Custos** | Implementação de uma **trava de preço máximo/limite tolerável** por item, bloqueando compras que excedam o valor predefinido até que uma autorização administrativa seja concedida, garantindo melhor **controle de custos na origem** da compra. | |
| **Redução de Erros/Tempo** | | Eliminação da conferência manual de preços (Cenário Atual - Caso 2) e da necessidade de correção do sistema por divergências de pedidos (Cenário Atual - Caso 1), permitindo decisões administrativas mais rápidas. |
| **Gestão de Divergências** | | Permite que Cassiano (no CEAGESP) ou o Conferente (na empresa) **registre discrepâncias** (quantidade não encontrada, produto podre) com um campo de observação, que gera um alerta visível para os administradores. |

# 3\. Funcionalidade das melhorias

A seguir, cada uma das melhorias possíveis detectadas e uma descrição rápida de como elas seriam:

## 3.1. Otniel Alimentando Base que Cassiano Consome no CEAGESP

| **Tela/Operação** | **Detalhamento da Tela (Módulo Compras - Otniel)** | |
| --- | --- | |
| **Definição de Limites de Preço** | | Otniel acessa uma tela de cadastro de itens/produtos para determinar o **Valor Máximo (Limite Tolerável)** para cada item. Este valor será a **trava** para a compra de Cassiano. |
| **Criação da "Missão do Dia"** | O Otniel acessa uma tela para criar uma nova **Lista de Compras** (a "Missão do Dia"). Ele seleciona o produto, a quantidade solicitada e adiciona os itens. **Não é necessário selecionar o fornecedor.** | |
| **Inclusão de Itens** | Otniel adiciona itens do cadastro (que já possui a unidade padrão). Ele insere a **Quantidade Requisitada** e a **Unidade de Medida** (ex: 5 Caixas, 10 Kg). | |
| **Atualização em Tempo Real** | Otniel pode **acessar e atualizar** a lista (adicionar, remover ou modificar a quantidade solicitada) a qualquer momento. Cassiano visualiza essas alterações em tempo real no seu app. | |

## 3.2. Cassiano Consumindo no CEAGESP

<div class="joplin-table-wrapper"><table><thead><tr><th><p><strong>Tela/Operação</strong></p></th><th colspan="2"><p><strong>Detalhamento da Tela (App Mobile - Cassiano)</strong></p></th></tr></thead><tbody><tr><td><p><strong>Visualização da Missão</strong></p></td><td colspan="2"><p>Tela inicial exibindo a <strong>Lista de Compras Pendentes</strong> criada por Otniel (Missão do Dia).</p></td></tr><tr><td><p><strong>Seleção do Box/Fornecedor</strong></p></td><td colspan="2"><p>Campo obrigatório para Cassiano selecionar ou registrar o <strong>Box/Fornecedor</strong> atual (o sistema cria o pedido de compra com o ID do fornecedor).</p></td></tr><tr><td><p><strong>Registro da Compra (Baixa)</strong></p></td><td colspan="2"><p>Para cada item da lista, Cassiano preenche:</p></td></tr><tr><td colspan="2"></td><td><ul><li><strong>Fornecedor:</strong> definido por caixa de combinação.</li><li><strong>Quantidade adquirida:</strong> o que ele efetivamente conseguiu comprar</li><li><strong>Valor unitário:</strong> O valor acordado no box (preço por caixa/saco)</li><li><strong>Valor total:</strong> Valor efetivamente pago</li><li><strong>Vencimento: </strong>A data de vencimento da compra</li><li><strong>Forma de pagamento:</strong> A forma de pagamento é definida e pode ser: boleto, cartão ou em aberto</li></ul></td></tr><tr><td colspan="2"></td><td><p><strong>Critério do Limitador (Trava de Preço):</strong> Se o <strong>Preço Unitário Fechado</strong> inserido <strong>ultrapassar o Valor Máximo</strong> determinado por Otniel, o sistema <strong>bloqueia a confirmação</strong> da compra e exibe um alerta ("Valor ultrapassa o excedido"). A compra fica com status não confirmado (pendente).</p></td></tr><tr><td colspan="2"></td><td><p><strong>Fluxo de Liberação:</strong> Para concluir a compra bloqueada, Cassiano deve <strong>contatar a administração</strong> (Otniel/Mara). A administração acessará o pedido e, se autorizar, <strong>libera a compra</strong> naquele pedido específico, permitindo que Cassiano conclua a transação no aplicativo.</p></td></tr><tr><td colspan="2"></td><td><p>Botão "Comprar/Dar Baixa": Confirma a transação. Se não houver discrepância de preço (ou se for liberada), o item desaparece da lista de Cassiano e Otniel recebe o alerta de divergência de quantidade, se houver.</p></td></tr><tr><td><p><strong>Gestão de Divergências</strong></p></td><td colspan="2"><p>Campo de <strong>Observação</strong> para justificar a não compra ou diferença na quantidade (ex: "Produto podre", "Não encontrado").</p></td></tr></tbody></table></div>

## 3.4. Dinâmica com o Fornecedor Contatado Diretamente por Otniel (Melhoria do Caso 2)

| **Tela/Operação**             | **Detalhamento da Tela (Módulo Compras - Fornecedor Direto)**                                                                                                                                                                                                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Registro Inicial (Otniel)** | Otniel cria uma **Lista de Compras** na nova plataforma, especificando a **quantidade solicitada** (status: "Qtd. OK / Preço Pendente"). A lista é criada para que os conferentes saibam o que esperar do fornecedor.                                                                                             |
| **Conferência de Preço**      | Otniel acessa a tela de **"Edição de Pedido"** após receber a fatura. Ao inserir o preço, o sistema poderia realizar uma **validação automática** (ex: comparação com o preço médio histórico ou tabela de preços da semana inserida por Otniel), destacando divergências para acelerar a conferência e o acerto. |

## 3.5. Dinâmica do Conferente com Cada um dos Casos que Chegam Nele

<div class="joplin-table-wrapper"><table><thead><tr><th><p><strong>Tela/Operação</strong></p></th><th colspan="2"><p><strong>Detalhamento da Tela (Módulo Conferência - Recepção)</strong></p></th></tr></thead><tbody><tr><td><p><strong>Busca e Rastreabilidade</strong></p></td><td colspan="2"><p>O Conferente busca o pedido (por Fornecedor, Data ou número do Pedido).</p></td></tr><tr><td><p><strong>Conferência efetiva</strong></p></td><td colspan="2"><p>O sistema exibe um painel de conferência com as seguintes informações amarradas (rastreabilidade):</p><ul><li><strong>Pedido Original (Otniel)</strong>: Qtd. Solicitada.</li><li><strong>Registro da Compra (Cassiano/Fornecedor)</strong>: Qtd. Registrada na Compra, Preço Registrado (oculto para o conferente) e Observações (ex.: "Não encontrei 1 caixa").</li><li><strong>Outros campos</strong> já definidos no projeto atual, como, por exemplo Campo para inserir a <strong>Qtd. Conferida Efetiva</strong> (o que realmente chegou fisicamente)</li></ul></td></tr><tr><td><p><strong>Validação e Alerta</strong></p></td><td colspan="2"><p>O sistema <strong>destaca automaticamente</strong> se a <em>Qtd. Conferida Efetiva</em> não bater com a Qtd. Registrada na Compra, registrando um evento de divergência.</p></td></tr><tr><td colspan="2"><p><strong>Finalização e Integração</strong></p></td><td><p>Botão <strong>"Finalizar Conferência"</strong> que registra a ação, o usuário (Conferente), e o horário no sistema (rastreabilidade total). <strong>Após esta etapa, os dados consolidados da compra (Fornecedor, Quantidade, Preço) serão exportados para o SIDI, seja por um processo manual de digitação ou através de um Job de importação (a ser definido)</strong>. O conferente <strong>não vê o preço</strong>.</p></td></tr></tbody></table></div>

# 4\. Próximos Passos e Definição de Escopo

Este trecho final resume os processos atuais e propostos, e estabelece as ações necessárias para dar continuidade à implementação das melhorias.

## 4.1. Validação do Entendimento e Escopo

| **Tópico**              | **Detalhamento**                                                                                                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Processos Atuais**    | Os cenários discutidos com Otniel (Compras CEAGESP e Fornecedor Direto) e suas configurações atuais foram descritos e estão pendentes de validação final pelo usuário.                  |
| **Melhorias Propostas** | As melhorias de fluxo de trabalho propostas através da automatização via App/Plataforma (rastreabilidade, eliminação de papel, tempo real) também estão sujeitas à revisão e aprovação. |
| **Próxima Etapa**       | É fundamental **superar a etapa de revisão** e **definição das melhorias** a serem implementadas para que se possa iniciar a estimativa de esforço e prazos.                            |

## 4.2. Ações de Implementação e Integração (Pró-Escopo)

| **Ação**                | **Detalhamento e Objetivo**                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Integração com SIDI** | Acionar **Patrick** (TI) para solicitar acesso de **leitura** às **demais tabelas do SIDI** (além da ITENSC).                   |
| **Objetivo do Acesso**  | Viabilizar a implementação das melhorias discutidas, permitindo consultas a cadastros necessários (ex: produtos, fornecedores). |

## 4.3. Considerações sobre o Cenário Ideal

| **Cenário**                             | **Importância**                                                                                                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dinâmica da Tela do Vendedor do Box** | Este ponto é um **cenário ideal e futurista**, colocado apenas para demonstrar o **limite de otimização** possível (simplificação e segurança), mas não faz parte do escopo imediato. |

## 4.4. Gestão Contratual

| **Ação Contratual**     | **Detalhamento**                                                                                                                                      |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Aditivo Contratual**  | Com base no acordo final sobre as melhorias a serem implementadas, um **aditivo ao contrato** será apresentado.                                       |
| **Objetivo do Aditivo** | Redefinir formalmente o escopo do projeto inicial, garantindo que as novas melhorias sejam implementadas dentro dos parâmetros financeiros acordados. |