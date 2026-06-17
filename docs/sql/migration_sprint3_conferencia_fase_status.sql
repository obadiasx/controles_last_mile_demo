-- Sprint 3 — Fase do pedido + status canônicos dos itens
-- PostgreSQL. Executar após backup em ambientes com dados.

BEGIN;

-- Itens: valores novos (até 40 caracteres)
ALTER TABLE conferencia_itens
    ALTER COLUMN status_conferencia TYPE VARCHAR(40);

UPDATE conferencia_itens SET status_conferencia = 'PendenteConferencia' WHERE status_conferencia = 'Pendente';
UPDATE conferencia_itens SET status_conferencia = 'RecebidoComDivergencia' WHERE status_conferencia = 'Divergente';
UPDATE conferencia_itens SET status_conferencia = 'FinalizadoParaIntegracao' WHERE status_conferencia = 'Concluido';

CREATE TABLE IF NOT EXISTS conferencia_pedidos (
    pedido_id BIGINT PRIMARY KEY,
    fase_conferencia VARCHAR(40) NOT NULL,
    data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_conferencia_pedidos_fase
    ON conferencia_pedidos (fase_conferencia);

COMMIT;

-- Preencher fases: executar a API (sincronizar ou PATCH em item) ou script que chame a mesma lógica de domínio.
-- Linhas órfãs sem fase são calculadas em obter_fase_pedido / reconciliar_fase_pedido.
