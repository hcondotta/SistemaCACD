-- ============================================================================
-- BUSCA SEM ACENTO: a coluna indexada precisa tirar o acento, como a consulta já tira
-- ============================================================================
--
-- Diagnóstico (13/11/2026): no banco, `document_chunks.fts_tsv` guardava os termos com
-- acento ('questã', 'transaçõ'), enquanto `hybrid_search_chunks` e `search_acervo` tiram o
-- acento da consulta. Resultado: nenhuma palavra acentuada era encontrada — nem "câmbio",
-- nem "cambio". A reconstrução da coluna da migração 20261113000001 não estava em vigor.
--
-- Recriar a coluna gerada recalcula todos os trechos que já existem; as funções de busca
-- (LANGUAGE sql) não guardam dependência da coluna e voltam a funcionar sem mudança.
-- Pode rodar de novo sem risco.
-- ============================================================================

ALTER TABLE public.document_chunks DROP COLUMN IF EXISTS fts_tsv;

ALTER TABLE public.document_chunks
    ADD COLUMN fts_tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('portuguese', public.f_unaccent(content))) STORED;

CREATE INDEX IF NOT EXISTS idx_chunks_fts ON public.document_chunks USING gin (fts_tsv);
