-- Referência DDL (PostgreSQL) — tabelas criadas também via SQLAlchemy Base.metadata.create_all.
-- Banco: DB_NAME (app). Não gravar no DB de origem SIDI a partir do app.

CREATE TABLE IF NOT EXISTS public.integracao_sidi_pedidos (
    id UUID PRIMARY KEY,
    data_compra DATE NOT NULL,
    comprador_id UUID NOT NULL REFERENCES public.tb_user (id) ON DELETE RESTRICT,
    comprador_codigo_sidi VARCHAR(40) NOT NULL,
    fornecedor_id INTEGER NOT NULL REFERENCES public.fornecedores (id),
    fornecedor_fantasia VARCHAR(30) NOT NULL,
    valor_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    itens_total INTEGER NOT NULL DEFAULT 0,
    kg_total NUMERIC(10, 3) NOT NULL DEFAULT 0,
    un_total NUMERIC(10, 3) NOT NULL DEFAULT 0,
    hora_pedido TIME,
    status VARCHAR(24) NOT NULL DEFAULT 'pendente_sidi',
    sidi_numped INTEGER,
    ultimo_erro TEXT,
    ultimo_codigo_erro VARCHAR(40),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_integracao_sidi_pedidos_status ON public.integracao_sidi_pedidos (status);

CREATE TABLE IF NOT EXISTS public.integracao_sidi_pedido_itens (
    id UUID PRIMARY KEY,
    pedido_id UUID NOT NULL REFERENCES public.integracao_sidi_pedidos (id) ON DELETE CASCADE,
    solicitacao_dia_item_id UUID NOT NULL UNIQUE REFERENCES public.solicitacoes_dia_itens (id) ON DELETE CASCADE,
    item_seq INTEGER NOT NULL,
    produto_id INTEGER NOT NULL,
    qtde NUMERIC(12, 3) NOT NULL,
    preco NUMERIC(12, 4) NOT NULL,
    un VARCHAR(6) NOT NULL,
    peso NUMERIC(10, 3),
    totkg NUMERIC(12, 3),
    obs VARCHAR(80),
    dtmovim DATE,
    sidi_item INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_integracao_sidi_pedido_itens_pedido_id ON public.integracao_sidi_pedido_itens (pedido_id);
