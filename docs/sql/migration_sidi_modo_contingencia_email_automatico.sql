-- Modo contingência: envio automático do e-mail SIDI ao pedido atingir ProntoParaIntegracao
-- (sem liberação global manual). Desligue o flag quando a integração normal voltar.

ALTER TABLE sidi_notificacao_smtp_config
    ADD COLUMN IF NOT EXISTS modo_contingencia_email_automatico BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN sidi_notificacao_smtp_config.modo_contingencia_email_automatico IS
    'Quando true, ao concluir a conferência (fase ProntoParaIntegracao), aplica liberação global e envia o e-mail de contingência SIDI sem ação do financeiro.';

ALTER TABLE conferencia_pedidos
    ADD COLUMN IF NOT EXISTS sidi_contingencia_email_auto_enviado_em TIMESTAMPTZ NULL;

COMMENT ON COLUMN conferencia_pedidos.sidi_contingencia_email_auto_enviado_em IS
    'Marca envio bem-sucedido do e-mail de contingência SIDI neste ciclo ProntoParaIntegracao (automático ou manual); zerado quando a fase deixa de ser ProntoParaIntegracao.';
