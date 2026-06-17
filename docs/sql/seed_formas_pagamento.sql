-- Inserção do catálogo de formas de pagamento (famílias: pix, dinheiro, boleto+N dias, cartão).
-- Idempotência: só insere linhas que ainda não existem pela combinação (tipo, dias_prazo, codigo_cartao_4).
-- A tabela `formas_pagamento` é criada pelo SQLAlchemy (Base.metadata.create_all); não incluímos CREATE TABLE aqui.

INSERT INTO formas_pagamento (id, tipo, descricao, dias_prazo, codigo_cartao_4, ativo)
SELECT gen_random_uuid(), v.tipo, v.descricao, v.dias_prazo, v.codigo_cartao_4, v.ativo
FROM (VALUES
  ('pix'::text, 'PIX'::text, 0::int, NULL::varchar(4), true),
  ('dinheiro', 'Dinheiro', 0, NULL, true),
  ('boleto', 'Boleto - à vista', 0, NULL, true),
  ('boleto', 'Boleto - 10 dias', 10, NULL, true),
  ('boleto', 'Boleto - 20 dias', 20, NULL, true),
  ('boleto', 'Boleto - 30 dias', 30, NULL, true),
  ('boleto', 'Boleto - 40 dias', 40, NULL, true),
  ('cartao', 'Cartão de crédito ****1000', 0, '1000', true),
  ('cartao', 'Cartão de crédito ****2000', 0, '2000', true)
) AS v(tipo, descricao, dias_prazo, codigo_cartao_4, ativo)
WHERE NOT EXISTS (
  SELECT 1 FROM formas_pagamento fp
  WHERE fp.tipo = v.tipo
    AND fp.dias_prazo = v.dias_prazo
    AND (fp.codigo_cartao_4 IS NOT DISTINCT FROM v.codigo_cartao_4)
);
