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
Os caminhos abaixo são os que existem de fato. O PDF original cita `ingestion/`, `src/components/economics/` e `src/lib/ai-contracts.ts` — esses caminhos NÃO existem; use os daqui.

- `docs/PROJECT_SPEC.md` — visão geral do produto e stack oficial.
- `docs/API_ROUTES.md` — especificação das rotas de API, system prompts e regras obrigatórias.
- `docs/AUDITORIA_E_ROADMAP.md` — estado real do projeto, bloqueadores e ordem de execução. **Leia antes de começar qualquer fase.**
- `supabase/migrations/` — schema PostgreSQL + `pgvector` + função RPC `hybrid_search_chunks`.
- `supabase/seed.sql` — 9 disciplinas, 5 módulos de Economia, 28 tópicos, pré-requisitos e modelos causais.
- `backoffice/content_factory.py` — fábrica de conteúdo (Docling + Whisper + Gemini) que popula o acervo e o RAG.
- `src/lib/schemas/ai-contracts.ts` — schemas Zod das respostas da IA.
- `src/lib/fsrs.ts` — agendamento de repetição espaçada e cálculo do escore líquido do TPS.
- `src/components/economia/CausalGraphTranslator.tsx` — tradutor visual de IS-LM, Mundell-Fleming e Balanço de Pagamentos.

## Comandos
- `npm run dev` — sobe o servidor Next.js (App Router).
- `npm run build` — compila e verifica os tipos TypeScript.
- `python backoffice/content_factory.py` — executa a ingestão do acervo confiável.

## Regras de Implementação Obrigatórias
1. **Zero alucinação no RAG.** O Tutor e o Corretor de Discursivas consultam sempre a função RPC `hybrid_search_chunks` e exigem citação explícita do `citation_label`. Se a informação não estiver nos blocos recuperados, a resposta deve declarar que o ponto não está coberto no acervo — nunca completar com conhecimento geral do modelo.
2. **Dupla camada didática.** Toda tela de estudo de Economia alterna entre `base_intuition_md` (Camada 1: intuição base zero) e `cacd_deep_dive_md` (Camada 2: rigor CACD). Nenhuma explicação começa pelo formalismo.
3. **Nunca usar mocks estáticos quando o banco estiver disponível.** As páginas buscam dados reais do Supabase (`topics`, `topic_lessons`, `causal_models`, `tps_items`, `flashcards`).
4. **Embeddings:** `gemini-embedding-001` com `output_dimensionality=1536`, sempre normalizados em L2 antes de gravar. O `text-embedding-004` produz 768 dimensões e está descontinuado — não usar.
5. **Validação de entrada, não só de saída.** Todo corpo de requisição passa por `safeParse` de um schema Zod antes de tocar o banco ou a IA. Erros nunca devolvem `error.message` cru ao cliente.
6. **Segurança:** toda tabela nova nasce com RLS habilitado. A chave `NEXT_PUBLIC_SUPABASE_ANON_KEY` é pública por construção; nenhuma proteção pode depender dela ser secreta.
