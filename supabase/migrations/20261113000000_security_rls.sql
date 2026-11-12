-- ============================================================================
-- SEGURANÇA: ROW LEVEL SECURITY EM TODAS AS TABELAS
-- ============================================================================
--
-- Contexto do problema que esta migração resolve:
-- a chave NEXT_PUBLIC_SUPABASE_ANON_KEY vai para o bundle do navegador por
-- construção — é pública. Sem RLS, qualquer pessoa que abrisse o site e lesse o
-- JavaScript conseguiria ler e escrever TUDO: o acervo, as respostas da aluna,
-- as redações e o caderno de erros.
--
-- Modelo adotado: mono-usuário.
-- Não há coluna `user_id` em lugar nenhum — o sistema é de uma estudante só.
-- O acesso aos dados se dá por dois caminhos, e apenas por eles:
--   1. SERVICE ROLE (servidor): Server Components, Route Handlers e o
--      back-office Python. Essa role ignora o RLS por natureza.
--   2. AUTHENTICATED (navegador): somente após login no Supabase Auth.
-- A role `anon` fica sem nenhum acesso.
-- ============================================================================

DO $$
DECLARE
    alvo TEXT;
    tabelas TEXT[] := ARRAY[
        'subjects',
        'modules',
        'topics',
        'topic_prerequisites',
        'topic_progress',
        'topic_lessons',
        'causal_models',
        'source_documents',
        'document_chunks',
        'tps_question_stems',
        'tps_items',
        'tps_attempts',
        'error_notebook',
        'flashcards',
        'essay_prompts',
        'essay_submissions'
    ];
BEGIN
    FOREACH alvo IN ARRAY tabelas LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', alvo);

        -- Recriação idempotente: a migração pode rodar de novo sem quebrar.
        EXECUTE format(
            'DROP POLICY IF EXISTS acesso_total_autenticado ON public.%I',
            alvo
        );
        EXECUTE format(
            'CREATE POLICY acesso_total_autenticado ON public.%I '
            'FOR ALL TO authenticated USING (true) WITH CHECK (true)',
            alvo
        );
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- Defesa em profundidade: retirar explicitamente os privilégios da role `anon`.
-- Com RLS ligado e sem policy para `anon`, ela já não leria nada; revogar o
-- GRANT fecha a porta uma camada antes, no nível de privilégio da tabela.
-- ----------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;

-- ----------------------------------------------------------------------------
-- A busca híbrida do RAG só pode ser chamada por quem está autenticado
-- (ou pelo servidor, via service_role).
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.hybrid_search_chunks(TEXT, vector, UUID, UUID, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.hybrid_search_chunks(TEXT, vector, UUID, UUID, INT) FROM anon;
GRANT EXECUTE ON FUNCTION public.hybrid_search_chunks(TEXT, vector, UUID, UUID, INT) TO authenticated, service_role;
