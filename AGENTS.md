# Agent Instructions & Context for Claude Code / Antigravity

## Core Persona & Goal
Você é um desenvolvedor sênior full-stack especialista em Next.js, Supabase, TypeScript e arquitetura de agentes RAG. Você está construindo o sistema de estudo para o CACD da esposa do usuário.

## Tech Stack Rules
1. **Next.js App Router**: Utilize componentes de servidor (`Server Components`) por padrão e client components (`'use client'`) apenas quando houver interatividade (gráficos, formulários, flashcards).
2. **Supabase Client**: Utilize o cliente tipado gerado a partir do schema PostgreSQL.
3. **Tailwind CSS**: Mantenha uma interface limpa, moderna, responsiva (focada em desktop e mobile) e com cores sóbrias (estilo plataforma de alta performance de estudos).

## Padrão de Execução de Tarefas
- Sempre que for criar uma nova página ou componente complexo, apresente primeiro a estrutura de arquivos e dependências.
- Escreva código limpo, comentado quando necessário, sem placeholders incompletos (`// TODO: implement later` — implemente a lógica real).
- Valide as entradas utilizando Pydantic (no back-office Python) ou Zod (no TypeScript).
## Estrutura Real de Diretórios
Os caminhos abaixo são os que existem de fato. O PDF original e os guias de `artefatos/` citam `ingestion/`, `src/lib/ai-contracts.ts`, `supabase/schema.sql` e `tailwind.config.ts` — esses caminhos NÃO existem; use os daqui.

**Documentação**
- `docs/PROJECT_SPEC.md` — visão geral do produto e stack oficial.
- `docs/API_ROUTES.md` — especificação das rotas de API, system prompts e regras obrigatórias.
- `docs/03-design-system-and-assets.md` — Design System "Itamaraty / Rio Branco": tokens, tipografia, temas e catálogo de imagens.
- `docs/AUDITORIA_E_ROADMAP.md` e `docs/ANALISE_ARTEFATOS.md` — estado real do projeto, problemas conhecidos e ordem de execução. **Leia antes de começar qualquer fase.**

**Banco e back-office**
- `supabase/migrations/` — schema PostgreSQL + `pgvector`, RLS, busca híbrida `hybrid_search_chunks`, índices e buckets de storage. `20261114000000_acervo_sem_ia.sql` cria seções, figuras, vínculo das provas e a busca por palavras `search_acervo`; `20261114000001_fts_sem_acento.sql` corrige a coluna de busca para ignorar acento.
- `supabase/seed.sql` — 9 disciplinas, 5 módulos de Economia, 28 tópicos, pré-requisitos e modelos causais.
- `backoffice/content_factory.py` — CLI da fábrica de conteúdo (`status`, `scan`, `ingest`; na fase de IA, `search` e `synthesize`). Lógica no pacote `backoffice/cacd_factory/` (extratores de livro, aula e prova; seções; manifesto; gravação idempotente), coberta por `backoffice/tests/` (pytest). Guia: `backoffice/README.md`.
- `acervo/` — pasta de entrada (`entrada/<tipo>/`), atalho `Adicionar conteúdo.bat` e `LEIA-ME.md`; só os dois últimos vão para o git.

**Lógica e dados (`src/lib/`)**
- `trail.ts` — regras puras da trilha: trava de pré-requisitos, avanço de estudo, patentes, escore líquido do TPS. Coberto por `trail.test.ts`.
- `study-content.ts` — validação dos JSONs gerados pela IA (pegadinhas, repertório, modelos causais).
- `data/study-data.ts` — loaders de servidor; buscam linhas e delegam as decisões a `trail.ts`.
- `actions/study-actions.ts` — server actions (registrar avanço, salvar flashcard).
- `schemas/api-requests.ts` — Zod das ENTRADAS; `schemas/ai-contracts.ts` — Zod das SAÍDAS da IA.
- `server-clients.ts` — clientes Supabase (service role) e Gemini, e o embedding normalizado.
- `fsrs.ts` — agendamento de repetição espaçada (heurística; trocar por `ts-fsrs` na Etapa C).
- `acervo.ts` — regras puras do Acervo (localização, trecho da busca sem acento, figuras, sumário), coberto por `acervo.test.ts`; `data/acervo-data.ts` e `actions/acervo-actions.ts` só delegam.

**Interface**
- `src/app/globals.css` — tokens do Design System para o Tailwind 4.
- `src/app/layout.tsx` — fontes, script anti-flash de tema e moldura do app.
- `src/app/economia/page.tsx` e `src/app/economia/[topicCode]/page.tsx` — trilha e estúdio do tópico (com a aba "Do seu acervo").
- `src/app/acervo/` — índice remissivo do acervo, leitor de seção (`[documentId]`), busca por palavras (`busca`) e a área de manutenção (`organizar`). Contrato de direção visual no topo de `acervo/page.tsx`; `PRODUCT.md` na raiz.
- `src/components/layout/` — `AppShell` (moldura e menu mobile), `ChanceryHeader`, `DiplomaticSidebar`, `learning-layer` (camada didática global).
- `src/components/economics/` — `EconomicsTrailClient`, `TopicStudioClient`, `CausalGraphTranslator`, `ModuleEditorialCover`.
- `src/components/acervo/` — verbete de sumário, busca, abas de tipo, leitor de Markdown com figuras, itens de prova com gabarito sob demanda e seletor de tópico.
- `src/components/tutor/TutorRAGDrawer.tsx` e `src/components/ui/` (`DiplomaticBadges`, `StatusPanel`).

## Comandos
- `npm run dev` — sobe o servidor Next.js (App Router).
- `npm run build` — compila e verifica os tipos TypeScript.
- `npm test` — roda os testes (vitest).
- `acervo/Adicionar conteúdo.bat` — o jeito fácil: lê `acervo/entrada`, extrai e grava (sem IA).
- `backoffice/.venv/Scripts/python backoffice/content_factory.py status|scan|ingest` — a mesma coisa pela linha de comando.
- `backoffice/.venv/Scripts/python -m pytest` (dentro de `backoffice/`) — testes do back-office; `-m integration` roda Docling e PDF de verdade.

## Regras de Implementação Obrigatórias
1. **Zero alucinação no RAG.** O Tutor e o Corretor de Discursivas consultam sempre a função RPC `hybrid_search_chunks` e exigem citação explícita do `citation_label`. Se a informação não estiver nos blocos recuperados, a resposta deve declarar que o ponto não está coberto no acervo — nunca completar com conhecimento geral do modelo.
2. **Dupla camada didática.** Toda tela de estudo de Economia alterna entre `base_intuition_md` (Camada 1: intuição base zero) e `cacd_deep_dive_md` (Camada 2: rigor CACD). Nenhuma explicação começa pelo formalismo.
3. **Nunca usar mocks estáticos quando o banco estiver disponível.** As páginas buscam dados reais do Supabase (`topics`, `topic_lessons`, `causal_models`, `tps_items`, `flashcards`).
4. **Embeddings:** `gemini-embedding-001` com `output_dimensionality=1536`, sempre normalizados em L2 antes de gravar; trechos com `RETRIEVAL_DOCUMENT`, perguntas com `RETRIEVAL_QUERY`. O `text-embedding-004` produz 768 dimensões e está descontinuado — não usar. O vetor é opcional no trecho: o acervo entra sem IA e a busca por palavras funciona sem ele.
5. **Validação de entrada, não só de saída.** Todo corpo de requisição passa por `safeParse` de um schema Zod antes de tocar o banco ou a IA. Erros nunca devolvem `error.message` cru ao cliente.
6. **Segurança:** toda tabela nova nasce com RLS habilitado. A chave `NEXT_PUBLIC_SUPABASE_ANON_KEY` é pública por construção; nenhuma proteção pode depender dela ser secreta.
7. **Nada de dado inventado como "fallback".** Sem banco, com erro de consulta ou com conteúdo ainda não gerado, a tela mostra um estado explícito (`StatusPanel`). Nunca números padrão (`?? 76`, `|| 78.5`), progresso fictício ou conteúdo genérico no lugar do tópico. Botões só dizem "salvo" depois de gravar de fato.
8. **Regra de negócio fica em função pura e testada.** Trava, status, patente e escore vivem em `src/lib/trail.ts`; loaders, actions e componentes só delegam. Mudou uma regra? Teste primeiro (`npm test`).
9. **Design System.** Use só os tokens de `globals.css` (`itamaraty-*`, `travertine-*`, `ink-*`, `econ-*`). Markdown de ficha: `prose prose-itamaraty`. Modo escuro pela classe `.dark` (`dark:`).
10. **IA por último.** Extração, leitura, busca por palavras, provas e organização funcionam sem serviço de IA. Tutor, fichas geradas e correção de discursivas são a última fase. Chaves vêm só do `.env.local` do projeto: uma `GEMINI_API_KEY` global do Windows é ignorada pela fábrica (o Next.js ainda a enxerga via `process.env`; resolver antes do Tutor).
