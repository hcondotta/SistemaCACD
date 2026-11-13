-- ============================================================================
-- ACERVO SEM IA: o conteúdo extraído entra no banco antes de qualquer embedding
-- ============================================================================
--
-- Livros, aulas e provas viram seções legíveis, figuras/slides e trechos
-- pesquisáveis por palavra. O vetor de cada trecho (gemini-embedding-001) fica
-- para a fase de IA: até lá a coluna aceita nulo e a busca híbrida ignora o
-- que ainda não foi vetorizado.
-- ============================================================================

-- 1. Trechos sem vetor --------------------------------------------------------
ALTER TABLE public.document_chunks ALTER COLUMN embedding DROP NOT NULL;

-- A busca híbrida só ranqueia por similaridade o que já tem vetor.
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
      AND c.embedding IS NOT NULL
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

-- 2. Seções legíveis -----------------------------------------------------------
-- Capítulos e seções de livro, trechos de aula (por slide ou por janela de tempo)
-- e questões de prova, na ordem do documento.
CREATE TABLE IF NOT EXISTS public.document_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_document_id UUID NOT NULL REFERENCES public.source_documents(id) ON DELETE CASCADE,
    position INT NOT NULL,
    level INT NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    heading_path TEXT[] NOT NULL DEFAULT '{}',
    content_md TEXT NOT NULL,
    page_start INT,
    page_end INT,
    start_seconds NUMERIC(10, 2),
    end_seconds NUMERIC(10, 2),
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    -- 'manual' sobrevive a uma nova extração do mesmo arquivo; 'manifest' é recalculado.
    topic_assigned_by TEXT NOT NULL DEFAULT 'manifest' CHECK (topic_assigned_by IN ('manifest', 'manual')),
    word_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (source_document_id, position)
);
CREATE INDEX IF NOT EXISTS idx_document_sections_topic_id ON public.document_sections (topic_id);

-- 3. Figuras, tabelas e slides ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_document_id UUID NOT NULL REFERENCES public.source_documents(id) ON DELETE CASCADE,
    section_id UUID REFERENCES public.document_sections(id) ON DELETE SET NULL,
    kind TEXT NOT NULL CHECK (kind IN ('figure', 'table', 'slide')),
    position INT NOT NULL,
    page INT,
    at_seconds NUMERIC(10, 2),
    caption TEXT,
    storage_path TEXT NOT NULL UNIQUE,
    width INT,
    height INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (source_document_id, position)
);
CREATE INDEX IF NOT EXISTS idx_document_assets_section_id ON public.document_assets (section_id);

-- Bucket privado: as figuras são de livros dela, para estudo pessoal.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('acervo', 'acervo', FALSE, 20971520, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated read acervo'
    ) THEN
        CREATE POLICY "Authenticated read acervo"
        ON storage.objects FOR SELECT TO authenticated
        USING (bucket_id = 'acervo');
    END IF;
END $$;

-- 4. Provas reais ------------------------------------------------------------------
-- Cada questão importada aponta para o PDF da prova; o tópico é escolhido depois,
-- na interface, por isso o item nasce sem tópico.
ALTER TABLE public.tps_question_stems
    ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES public.source_documents(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS question_number INT,
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tps_question_stems_source_question_key') THEN
        ALTER TABLE public.tps_question_stems
            ADD CONSTRAINT tps_question_stems_source_question_key UNIQUE (source_document_id, question_number);
    END IF;
END $$;

ALTER TABLE public.tps_items ALTER COLUMN topic_id DROP NOT NULL;
ALTER TABLE public.tps_items ALTER COLUMN detailed_explanation_md SET DEFAULT '';
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tps_items_stem_item_key') THEN
        ALTER TABLE public.tps_items ADD CONSTRAINT tps_items_stem_item_key UNIQUE (stem_id, item_number);
    END IF;
END $$;

ALTER TABLE public.essay_prompts
    ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES public.source_documents(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS question_number INT;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'essay_prompts_source_question_key') THEN
        ALTER TABLE public.essay_prompts
            ADD CONSTRAINT essay_prompts_source_question_key UNIQUE (source_document_id, question_number);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tps_question_stems_source_document_id ON public.tps_question_stems (source_document_id);
CREATE INDEX IF NOT EXISTS idx_essay_prompts_source_document_id ON public.essay_prompts (source_document_id);

-- 5. Busca por palavras, sem IA -------------------------------------------------------
-- Aceita a sintaxe de busca da web: "frase exata", OR e -exclusão; ignora acentos.
CREATE OR REPLACE FUNCTION public.search_acervo(
    query_text TEXT,
    filter_subject_id UUID,
    filter_topic_id UUID DEFAULT NULL,
    filter_doc_type source_type DEFAULT NULL,
    match_count INT DEFAULT 30
)
RETURNS TABLE (
    chunk_id UUID,
    source_document_id UUID,
    doc_title TEXT,
    doc_type source_type,
    citation_label TEXT,
    topic_id UUID,
    content TEXT,
    metadata JSONB,
    rank REAL
)
LANGUAGE sql STABLE
SET search_path = public, extensions, pg_catalog
AS $$
WITH query AS (
    SELECT websearch_to_tsquery('portuguese', public.f_unaccent(query_text)) AS q
)
SELECT
    c.id,
    d.id,
    d.title,
    d.doc_type,
    c.citation_label,
    c.topic_id,
    c.content,
    c.metadata,
    ts_rank_cd(c.fts_tsv, query.q) * (d.authority_weight / 5.0) AS rank
FROM document_chunks c
JOIN source_documents d ON d.id = c.source_document_id
CROSS JOIN query
WHERE d.subject_id = filter_subject_id
  AND (filter_topic_id IS NULL OR c.topic_id = filter_topic_id)
  AND (filter_doc_type IS NULL OR d.doc_type = filter_doc_type)
  AND c.fts_tsv @@ query.q
ORDER BY rank DESC
LIMIT match_count;
$$;

-- 6. Segurança das peças novas (mesmo modelo da migração 20261113000000) ----------------
DO $$
DECLARE
    alvo TEXT;
BEGIN
    FOREACH alvo IN ARRAY ARRAY['document_sections', 'document_assets'] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', alvo);
        EXECUTE format('DROP POLICY IF EXISTS acesso_total_autenticado ON public.%I', alvo);
        EXECUTE format(
            'CREATE POLICY acesso_total_autenticado ON public.%I '
            'FOR ALL TO authenticated USING (true) WITH CHECK (true)',
            alvo
        );
        EXECUTE format('REVOKE ALL ON public.%I FROM anon', alvo);
    END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.search_acervo(TEXT, UUID, UUID, source_type, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.search_acervo(TEXT, UUID, UUID, source_type, INT) FROM anon;
GRANT EXECUTE ON FUNCTION public.search_acervo(TEXT, UUID, UUID, source_type, INT) TO authenticated, service_role;
