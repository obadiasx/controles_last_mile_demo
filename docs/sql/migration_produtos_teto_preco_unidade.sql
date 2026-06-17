-- Tetos de preço máximo aceitável por produto e unidade (financeiro).
-- Executar no banco local do app (PostgreSQL).

CREATE TABLE IF NOT EXISTS public.produtos_teto_preco_unidade (
    codigo_produto INTEGER NOT NULL REFERENCES public.produtos (codigo) ON DELETE CASCADE,
    unidade VARCHAR(6) NOT NULL,
    valor_maximo_aceitavel NUMERIC(10, 2) NOT NULL,
    CONSTRAINT pk_produtos_teto_preco_unidade PRIMARY KEY (codigo_produto, unidade)
);

CREATE INDEX IF NOT EXISTS ix_produtos_teto_preco_unidade_codigo
    ON public.produtos_teto_preco_unidade (codigo_produto);
