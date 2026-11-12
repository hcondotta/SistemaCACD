-- ============================================================================
-- HARDENING (ADVISORS), ÍNDICES DE FOREIGN KEY E STORAGE PRIVADO
-- ============================================================================

-- 1. Garantir search_path explícito (public, extensions, pg_catalog) nas funções
CREATE OR REPLACE FUNCTION public.f_unaccent(TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
SET search_path = public, extensions, pg_catalog
AS $func$
    SELECT extensions.unaccent('extensions.unaccent', $1)
$func$;

CREATE OR REPLACE FUNCTION public.hybrid_search_chunks(
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
LANGUAGE sql STABLE
SET search_path = public, extensions, pg_catalog
AS $$
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

-- 2. Índices de cobertura em todas as Foreign Keys (Performance Advisor)
CREATE INDEX IF NOT EXISTS idx_causal_models_topic_id ON public.causal_models (topic_id);
CREATE INDEX IF NOT EXISTS idx_error_notebook_topic_id ON public.error_notebook (topic_id);
CREATE INDEX IF NOT EXISTS idx_essay_prompts_subject_id ON public.essay_prompts (subject_id);
CREATE INDEX IF NOT EXISTS idx_essay_prompts_topic_id ON public.essay_prompts (topic_id);
CREATE INDEX IF NOT EXISTS idx_essay_submissions_prompt_id ON public.essay_submissions (prompt_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_error_notebook_id ON public.flashcards (error_notebook_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_topic_id ON public.flashcards (topic_id);
CREATE INDEX IF NOT EXISTS idx_source_documents_subject_id ON public.source_documents (subject_id);
CREATE INDEX IF NOT EXISTS idx_topic_prerequisites_prerequisite_topic_id ON public.topic_prerequisites (prerequisite_topic_id);
CREATE INDEX IF NOT EXISTS idx_tps_attempts_item_id ON public.tps_attempts (item_id);
CREATE INDEX IF NOT EXISTS idx_tps_items_source_chunk_id ON public.tps_items (source_chunk_id);
CREATE INDEX IF NOT EXISTS idx_tps_items_stem_id ON public.tps_items (stem_id);
CREATE INDEX IF NOT EXISTS idx_tps_items_topic_id ON public.tps_items (topic_id);
CREATE INDEX IF NOT EXISTS idx_tps_question_stems_subject_id ON public.tps_question_stems (subject_id);

-- 3. Bucket privado de Storage para fotos/PDFs das discursivas manuscritas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'essays-handwritten',
    'essays-handwritten',
    FALSE,
    15728640,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated read essays-handwritten'
    ) THEN
        CREATE POLICY "Authenticated read essays-handwritten"
        ON storage.objects FOR SELECT TO authenticated
        USING (bucket_id = 'essays-handwritten');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated upload essays-handwritten'
    ) THEN
        CREATE POLICY "Authenticated upload essays-handwritten"
        ON storage.objects FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'essays-handwritten');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated update essays-handwritten'
    ) THEN
        CREATE POLICY "Authenticated update essays-handwritten"
        ON storage.objects FOR UPDATE TO authenticated
        USING (bucket_id = 'essays-handwritten')
        WITH CHECK (bucket_id = 'essays-handwritten');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated delete essays-handwritten'
    ) THEN
        CREATE POLICY "Authenticated delete essays-handwritten"
        ON storage.objects FOR DELETE TO authenticated
        USING (bucket_id = 'essays-handwritten');
    END IF;
END $$;
