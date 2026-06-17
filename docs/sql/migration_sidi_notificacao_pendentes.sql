CREATE TABLE IF NOT EXISTS sidi_notificacao_pendentes (
    pedido_id BIGINT PRIMARY KEY,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    tentativas INTEGER NOT NULL DEFAULT 1,
    ultima_falha VARCHAR(500) NOT NULL,
    primeiro_erro_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ultima_tentativa_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolvido_em TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS ix_sidi_notificacao_pendentes_ativo
    ON sidi_notificacao_pendentes (ativo);
