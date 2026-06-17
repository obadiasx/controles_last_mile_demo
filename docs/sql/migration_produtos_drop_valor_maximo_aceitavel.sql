-- Remove o campo legado de teto único por produto (substituído por produtos_teto_preco_unidade).
-- Executar no banco local do app após migração dos dados desejados.

ALTER TABLE public.produtos DROP COLUMN IF EXISTS valor_maximo_aceitavel;
