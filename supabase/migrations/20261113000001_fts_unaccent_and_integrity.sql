-- ============================================================================
-- BUSCA TEXTUAL SEM ACENTOS + INTEGRIDADE DA INGESTÃO
-- ============================================================================
--
-- Dois defeitos corrigidos aqui:
--
-- 1. A extensão `unaccent` era criada no schema inicial e nunca usada. O
--    resultado prático: "cambio" não encontrava "câmbio", "balanco" não
--    encontrava "balanço", "politica" não encontrava "política". Metade das
--    buscas digitadas às pressas falhava em silêncio.
--
-- 2. `register_and_index_source` sempre fazia INSERT em `source_documents`.
--    Reprocessar o mesmo livro duplicava o corpus inteiro — e aí o RAG passava
--    a devolver o mesmo trecho repetido, ocupando os 8 slots de `match_count`
--    com uma única fonte.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Wrapper IMMUTABLE para `unaccent`
--
-- `unaccent` é declarada STABLE (depende de um dicionário que pode mudar), e o
-- PostgreSQL recusa funções não-imutáveis em colunas GENERATED e em índices.
-- Fixar o dicionário explicitamente torna a chamada determinística, o que
-- justifica marcar o wrapper como IMMUTABLE.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_unaccent(TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
SET search_path = public, extensions, pg_catalog
AS $func$
    SELECT unaccent('unaccent', $1)
$func$;

-- ----------------------------------------------------------------------------
-- 2. Reconstrução da coluna gerada de full-text search
--
-- Colunas GENERATED não podem ser alteradas no lugar: é preciso derrubar e
-- recriar. O índice GIN cai junto com a coluna e é recriado em seguida.
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_chunks_fts;

ALTER TABLE document_chunks DROP COLUMN IF EXISTS fts_tsv;

ALTER TABLE document_chunks
    ADD COLUMN fts_tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('portuguese', public.f_unaccent(content))) STORED;

CREATE INDEX idx_chunks_fts ON document_chunks USING gin (fts_tsv);

-- ----------------------------------------------------------------------------
-- 3. Integridade e idempotência da ingestão
-- ----------------------------------------------------------------------------

-- Impede que o mesmo bloco do mesmo documento entre duas vezes.
ALTER TABLE document_chunks
    DROP CONSTRAINT IF EXISTS document_chunks_source_chunk_unique;

ALTER TABLE document_chunks
    ADD CONSTRAINT document_chunks_source_chunk_unique
    UNIQUE (source_document_id, chunk_index);

-- Hash do arquivo de origem: permite ao pipeline pular o que já processou.
ALTER TABLE source_documents
    ADD COLUMN IF NOT EXISTS content_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_source_documents_hash
    ON source_documents (content_hash)
    WHERE content_hash IS NOT NULL;

COMMENT ON COLUMN source_documents.content_hash IS
    'SHA-256 do arquivo bruto. Preenchido pelo back-office para evitar reingestão do mesmo material.';

-- ----------------------------------------------------------------------------
-- 4. Busca híbrida: aplicar `f_unaccent` também no lado da CONSULTA
--
-- Sem isto, a correção acima seria inútil: o índice guardaria "cambio" enquanto
-- a consulta continuaria procurando por "câmbio".
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION hybrid_search_chunks(
    query_text TEXT,
    query_embedding vector(1536),
    filter_subject_id UUID,
    filter_topic_id UUID DEFAULT NULL,
    match_count INT DEFAULT 8
)
RETURNS TABLE (
    chunk_id UUID,
    content TEXT,
    citation_label TEXT,
    doc_title TEXT,
    doc_type source_type,
    rrf_score NUMERIC
)
LANGUAGE sql STABLE AS $$
WITH semantic_search AS (
    SELECT c.id, RANK() OVER (ORDER BY c.embedding <=> query_embedding) AS rank
    FROM document_chunks c
    JOIN source_documents d ON c.source_document_id = d.id
    WHERE d.subject_id = filter_subject_id
      AND (filter_topic_id IS NULL OR c.topic_id = filter_topic_id)
    ORDER BY c.embedding <=> query_embedding
    LIMIT 20
),
keyword_search AS (
    SELECT c.id, RANK() OVER (
        ORDER BY ts_rank_cd(
            c.fts_tsv,
            plainto_tsquery('portuguese', public.f_unaccent(query_text))
        ) DESC
    ) AS rank
    FROM document_chunks c
    JOIN source_documents d ON c.source_document_id = d.id
    WHERE d.subject_id = filter_subject_id
      AND (filter_topic_id IS NULL OR c.topic_id = filter_topic_id)
      AND c.fts_tsv @@ plainto_tsquery('portuguese', public.f_unaccent(query_text))
    LIMIT 20
)
SELECT
    c.id AS chunk_id,
    c.content,
    c.citation_label,
    d.title AS doc_title,
    d.doc_type,
    (COALESCE(1.0 / (60 + s.rank), 0.0) + COALESCE(1.0 / (60 + k.rank), 0.0)) * (d.authority_weight / 5.0) AS rrf_score
FROM semantic_search s
FULL OUTER JOIN keyword_search k ON s.id = k.id
JOIN document_chunks c ON c.id = COALESCE(s.id, k.id)
JOIN source_documents d ON c.source_document_id = d.id
ORDER BY rrf_score DESC
LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.hybrid_search_chunks(TEXT, vector, UUID, UUID, INT) TO authenticated, service_role;
