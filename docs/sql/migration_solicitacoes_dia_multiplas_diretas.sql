-- Permite múltiplas solicitações por dia para o mesmo comprador
-- quando a aplicação optar por `permitir_multiplas_no_dia=true`.
-- Executar uma vez no banco local.

ALTER TABLE solicitacoes_dia
DROP CONSTRAINT IF EXISTS uq_data_comprador;
