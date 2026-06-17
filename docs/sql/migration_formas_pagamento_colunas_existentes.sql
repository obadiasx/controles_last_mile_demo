-- Ajuste para bases PostgreSQL que já existiam antes do modelo atual.
-- A tabela `formas_pagamento` deve ser criada pelo aplicativo (SQLAlchemy create_all).
-- Use este script se, após deploy, faltar coluna em tabelas antigas.

-- Fornecedor: forma padrão (financeiro)
ALTER TABLE fornecedores
  ADD COLUMN IF NOT EXISTS forma_pagamento_padrao_id UUID NULL
  REFERENCES formas_pagamento (id) ON DELETE SET NULL;

-- Itens da solicitação: referência ao catálogo + observação do comprador
ALTER TABLE solicitacoes_dia_itens
  ADD COLUMN IF NOT EXISTS observacao VARCHAR(500) NULL;

ALTER TABLE solicitacoes_dia_itens
  ADD COLUMN IF NOT EXISTS forma_pagamento_ref_id UUID NULL
  REFERENCES formas_pagamento (id) ON DELETE SET NULL;

-- Ampliar texto legado se necessário
ALTER TABLE solicitacoes_dia_itens
  ALTER COLUMN forma_pagamento TYPE VARCHAR(160);

-- Remoção de coluna legada: o fluxo CEAGESP / baixa não usa mais data de vencimento no item.
-- IF EXISTS: seguro em bases novas (sem a coluna) e em antigas (remove de fato).
ALTER TABLE solicitacoes_dia_itens
  DROP COLUMN IF EXISTS data_vencimento;
