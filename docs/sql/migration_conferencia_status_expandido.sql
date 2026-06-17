-- =============================================================================
-- Migração: expandir status_conferencia (3 valores legados → estados v2)
-- Alvo: PostgreSQL, tabela public.conferencia_itens
-- Pré-requisito: coluna origem_compra já existente (migration_conferencia_origem_compra.sql)
--
-- Valores NOVOS (strings exatas; alinhar com enum no backend Python):
--   AguardandoRecebimento, EmConferencia, RecebidoConforme, RecebidoComDivergencia,
--   Parcial, NaoRecebido, PendenteDecisaoFinanceiro, FinalizadoParaIntegracao, IntegradoSIDI
--
-- Valores LEGADOS esperados no banco:
--   Pendente, Divergente, Concluido
--
-- IMPORTANTE: revisar o bloco "Concluido" (§3) e a variante comentada (§4) antes de produção.
-- =============================================================================

BEGIN;

-- Coluna auxiliar: evita misturar linhas que eram "Divergente" com promoção feita só para "Concluido"
ALTER TABLE conferencia_itens
    ADD COLUMN IF NOT EXISTS _mig_status_legado VARCHAR(20);

UPDATE conferencia_itens
SET _mig_status_legado = status_conferencia
WHERE _mig_status_legado IS NULL;

-- Nomes mais longos que VARCHAR(20)
ALTER TABLE conferencia_itens
    ALTER COLUMN status_conferencia TYPE VARCHAR(40);

-- ---------------------------------------------------------------------------
-- 1) Pendente → AguardandoRecebimento
-- ---------------------------------------------------------------------------
UPDATE conferencia_itens
SET status_conferencia = 'AguardandoRecebimento'
WHERE _mig_status_legado = 'Pendente';

-- ---------------------------------------------------------------------------
-- 2) Divergente → estado v2 (não promove para FinalizadoParaIntegracao aqui)
-- ---------------------------------------------------------------------------
UPDATE conferencia_itens
SET status_conferencia = 'RecebidoComDivergencia'
WHERE _mig_status_legado = 'Divergente'
  AND divergencia_id IS NOT NULL;

UPDATE conferencia_itens
SET status_conferencia = 'Parcial'
WHERE _mig_status_legado = 'Divergente'
  AND divergencia_id IS NULL
  AND quantidade_fisica > 0
  AND quantidade_fisica < quantidade_esperada;

UPDATE conferencia_itens
SET status_conferencia = 'NaoRecebido'
WHERE _mig_status_legado = 'Divergente'
  AND divergencia_id IS NULL
  AND quantidade_fisica = 0;

UPDATE conferencia_itens
SET status_conferencia = 'RecebidoComDivergencia'
WHERE _mig_status_legado = 'Divergente';

-- ---------------------------------------------------------------------------
-- 3) Concluido legado — Variante A (inferência + fila de integração)
--    Linhas que eram apenas "Concluido" viram estados semânticos e, em seguida,
--    são promovidas para FinalizadoParaIntegracao (histórico já encerrado no fluxo antigo).
-- ---------------------------------------------------------------------------
UPDATE conferencia_itens
SET status_conferencia = 'RecebidoComDivergencia'
WHERE _mig_status_legado = 'Concluido'
  AND divergencia_id IS NOT NULL;

UPDATE conferencia_itens
SET status_conferencia = 'Parcial'
WHERE _mig_status_legado = 'Concluido'
  AND divergencia_id IS NULL
  AND quantidade_fisica > 0
  AND quantidade_fisica < quantidade_esperada;

UPDATE conferencia_itens
SET status_conferencia = 'NaoRecebido'
WHERE _mig_status_legado = 'Concluido'
  AND divergencia_id IS NULL
  AND quantidade_fisica = 0
  AND quantidade_esperada > 0;

UPDATE conferencia_itens
SET status_conferencia = 'RecebidoConforme'
WHERE _mig_status_legado = 'Concluido'
  AND divergencia_id IS NULL
  AND quantidade_fisica = quantidade_esperada
  AND quantidade_esperada > 0;

UPDATE conferencia_itens
SET status_conferencia = 'FinalizadoParaIntegracao'
WHERE _mig_status_legado = 'Concluido'
  AND status_conferencia IN (
      'RecebidoConforme',
      'Parcial',
      'RecebidoComDivergencia',
      'NaoRecebido'
  );

UPDATE conferencia_itens
SET status_conferencia = 'FinalizadoParaIntegracao'
WHERE _mig_status_legado = 'Concluido';

-- ---------------------------------------------------------------------------
-- 4) Variante B — se a equipe assumir que TODO Concluido já foi integrado ao SIDI:
--    Rode ANTES o §3 ou comente o §3 e execute apenas:
--
-- UPDATE conferencia_itens
-- SET status_conferencia = 'IntegradoSIDI'
-- WHERE _mig_status_legado = 'Concluido';
--
-- (Não combine com o §3 sem ajuste: escolha um caminho.)
-- ---------------------------------------------------------------------------

ALTER TABLE conferencia_itens
    DROP COLUMN IF EXISTS _mig_status_legado;

COMMIT;

-- Verificação pós-migração (rodar manualmente):
-- SELECT status_conferencia, COUNT(*) FROM conferencia_itens GROUP BY 1 ORDER BY 2 DESC;
