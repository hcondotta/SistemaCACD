-- ============================================================================
-- ARQUIVO MESTRE DE SCHEMA SUPABASE: CACD PLATFORM
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- 1. CURRICULO E EDITAL
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    tps_weight NUMERIC(4,2) DEFAULT 1.0,
    has_third_phase_essay BOOLEAN DEFAULT TRUE,
    display_order INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    pedagogical_order INT NOT NULL,
    UNIQUE(subject_id, code)
);

CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    official_edital_ref TEXT,
    title TEXT NOT NULL,
    pedagogical_order INT NOT NULL,
    estimated_minutes INT DEFAULT 90,
    is_critical_for_essay BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(module_id, code)
);

CREATE TABLE topic_prerequisites (
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    prerequisite_topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    PRIMARY KEY (topic_id, prerequisite_topic_id)
);

CREATE TYPE mastery_status AS ENUM ('locked', 'available', 'studying_base', 'studying_advanced', 'reviewing', 'mastered');

CREATE TABLE topic_progress (
    topic_id UUID PRIMARY KEY REFERENCES topics(id) ON DELETE CASCADE,
    status mastery_status DEFAULT 'available',
    tps_accuracy_rate NUMERIC(5,2) DEFAULT 0.0,
    essay_readiness_score NUMERIC(5,2) DEFAULT 0.0,
    last_studied_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CONTEÚDO PRÉ-PROCESSADO E MODELOS CAUSAIS
CREATE TABLE topic_lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID UNIQUE NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    base_intuition_md TEXT NOT NULL,
    cacd_deep_dive_md TEXT NOT NULL,
    tps_traps_json JSONB DEFAULT '[]'::jsonb,
    essay_repertoire_json JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE causal_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    slug TEXT UNIQUE NOT NULL,
    model_family TEXT NOT NULL,
    scenario_title TEXT NOT NULL,
    context_parameters JSONB NOT NULL,
    causal_chain_steps JSONB NOT NULL,
    graph_config JSONB NOT NULL,
    bp_impact_summary TEXT,
    model_essay_paragraph TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RAG HÍBRIDO (PGVECTOR)
CREATE TYPE source_type AS ENUM ('book', 'course_pdf', 'video_transcript', 'personal_note', 'past_exam', 'official_syllabus');

CREATE TABLE source_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    author TEXT,
    doc_type source_type NOT NULL,
    file_path TEXT,
    authority_weight INT DEFAULT 5,
    metadata JSONB DEFAULT '{}'::jsonb,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_document_id UUID NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    citation_label TEXT NOT NULL,
    embedding vector(1536) NOT NULL,
    fts_tsv tsvector GENERATED ALWAYS AS (to_tsvector('portuguese', content)) STORED,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_chunks_embedding_hnsw ON document_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_chunks_fts ON document_chunks USING gin (fts_tsv);
CREATE INDEX idx_chunks_topic ON document_chunks (topic_id);

-- 4. TPS & CADERNO DE ERROS
CREATE TABLE tps_question_stems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    exam_year INT,
    exam_board TEXT DEFAULT 'IADES / Cebraspe',
    is_ai_generated BOOLEAN DEFAULT FALSE,
    stem_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tps_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stem_id UUID REFERENCES tps_question_stems(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    item_number INT,
    statement TEXT NOT NULL,
    official_answer CHAR(1) NOT NULL CHECK (official_answer IN ('C', 'E')),
    detailed_explanation_md TEXT NOT NULL,
    trap_category TEXT,
    source_chunk_id UUID REFERENCES document_chunks(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE confidence_level AS ENUM ('certain', 'doubt', 'guess');

CREATE TABLE tps_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES tps_items(id) ON DELETE CASCADE,
    selected_answer CHAR(1) NOT NULL CHECK (selected_answer IN ('C', 'E', 'B')),
    is_correct BOOLEAN NOT NULL,
    confidence confidence_level NOT NULL,
    time_spent_seconds INT,
    attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE error_root_cause AS ENUM ('base_gap', 'causal_graph_confusion', 'historical_fact_swap', 'wording_trap', 'rushed_reading');

CREATE TABLE error_notebook (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID UNIQUE NOT NULL REFERENCES tps_items(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    root_cause error_root_cause DEFAULT 'base_gap',
    ai_diagnosis TEXT NOT NULL,
    personal_reflection TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    error_count INT DEFAULT 1,
    last_failed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. FLASHCARDS FSRS
CREATE TYPE flashcard_origin AS ENUM ('pre_processed', 'error_notebook', 'essay_feedback', 'manual');

CREATE TABLE flashcards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    error_notebook_id UUID REFERENCES error_notebook(id) ON DELETE SET NULL,
    origin flashcard_origin DEFAULT 'pre_processed',
    front_prompt TEXT NOT NULL,
    back_answer TEXT NOT NULL,
    state INT DEFAULT 0,
    stability NUMERIC(8,4) DEFAULT 0.0,
    difficulty NUMERIC(8,4) DEFAULT 0.0,
    elapsed_days INT DEFAULT 0,
    scheduled_days INT DEFAULT 0,
    reps INT DEFAULT 0,
    lapses INT DEFAULT 0,
    last_review_at TIMESTAMPTZ,
    next_review_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_flashcards_due ON flashcards (next_review_at);

-- 6. OFICINA DE DISCURSIVAS
CREATE TABLE essay_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    exam_year INT,
    title TEXT NOT NULL,
    motivating_text TEXT NOT NULL,
    commands_json JSONB NOT NULL,
    min_lines INT DEFAULT 60,
    max_lines INT DEFAULT 90,
    max_score NUMERIC(5,2) DEFAULT 30.00,
    grading_rubric_json JSONB NOT NULL,
    model_answer_md TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE essay_stage_mode AS ENUM ('skeleton_only', 'guided_writing', 'full_simulation');

CREATE TABLE essay_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt_id UUID NOT NULL REFERENCES essay_prompts(id) ON DELETE CASCADE,
    stage_mode essay_stage_mode NOT NULL,
    outline_json JSONB,
    content_text TEXT,
    handwritten_image_url TEXT,
    estimated_lines INT,
    content_score NUMERIC(5,2),
    language_penalty_score NUMERIC(5,2) DEFAULT 0.00,
    final_score NUMERIC(5,2),
    criteria_breakdown_json JSONB,
    paragraph_reviews_json JSONB,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. FUNÇÃO RPC RAG HÍBRIDO (POSTGRESQL + PGVECTOR)
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
    SELECT c.id, RANK() OVER (ORDER BY ts_rank_cd(c.fts_tsv, plainto_tsquery('portuguese', query_text)) DESC) AS rank
    FROM document_chunks c
    JOIN source_documents d ON c.source_document_id = d.id
    WHERE d.subject_id = filter_subject_id
      AND (filter_topic_id IS NULL OR c.topic_id = filter_topic_id)
      AND c.fts_tsv @@ plainto_tsquery('portuguese', query_text)
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