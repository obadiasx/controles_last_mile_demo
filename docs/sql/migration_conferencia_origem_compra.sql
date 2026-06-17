-- Migração: adicionar origem explícita da compra na conferência
-- Objetivo: remover dependência de inferência por sinal de pedido_id.

ALTER TABLE conferencia_itens
ADD COLUMN IF NOT EXISTS origem_compra VARCHAR(20);

UPDATE conferencia_itens
SET origem_compra = CASE
    WHEN pedido_id < 0 THEN 'comprador'
    ELSE 'financeiro'
END
WHERE origem_compra IS NULL;

ALTER TABLE conferencia_itens
ALTER COLUMN origem_compra SET NOT NULL;

ALTER TABLE conferencia_itens
ALTER COLUMN origem_compra SET DEFAULT 'financeiro';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'ix_conferencia_itens_origem_compra'
    ) THEN
        CREATE INDEX ix_conferencia_itens_origem_compra
            ON conferencia_itens (origem_compra);
    END IF;
END $$;
