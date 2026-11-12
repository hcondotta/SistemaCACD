# CONTEXTO MESTRE E ORQUESTRAÇÃO DA ARQUITETURA — PLATAFORMA CACD (INSTITUTO RIO BRANCO)

Você está assumindo o desenvolvimento de uma plataforma web de alta performance para preparação ao Concurso de Admissão à Carreira de Diplomata (CACD - Instituto Rio Branco), construída sob medida para destravar o estudo de **Economia** (desde a intuição Base Zero até redações discursivas de 90 linhas da 3ª Fase) e arquitetada no banco de dados para suportar todas as **9 disciplinas do edital** (Economia, História do Brasil, História Mundial, Política Internacional, Geografia, Direito Interno, Direito Internacional Público, Português e Inglês).

Todos os arquivos-base, contratos de IA, schemas SQL, scripts de ingestão e componentes do Design System já foram especificados e adicionados ao repositório. Sua primeira tarefa é ler e indexar mentalmente a estrutura abaixo antes de escrever ou conectar qualquer código adicional.

---

## 1. MAPEAMENTO COMPLETO DOS ARTEFATOS NO REPOSITÓRIO

### Camada A: Especificações e Regras de Engenharia (`docs/`)
- `docs/00-master-project-spec.md` (Artefato 1): Visão geral do produto, stack oficial (Next.js 15 App Router, TypeScript, Tailwind CSS, Supabase PostgreSQL + `pgvector`, Google Gemini SDK `@google/genai`) e diretrizes de zero alucinação no RAG.
- `docs/01-claude-agent-rules.md` (Artefato 3): Regras de código limpo, Server Components por padrão, tipagem estrita com Zod/Pydantic e proibição de placeholders (`// TODO`).
- `docs/02-api-routes-and-prompts.md` (Artefato 7): Especificação funcional e *system prompts* blindados das rotas `/api/tutor/chat`, `/api/tps/attempt` e `/api/essay/evaluate`.
- `docs/03-design-system-and-assets.md` (Artefato 14): Guia completo do Design System "Itamaraty / Rio Branco", tokens de cores, tipografia editorial, regras das curvas econômicas e prompts de geração de imagens.

### Camada B: Banco de Dados, Vetores e Sementes Curriculares (`supabase/`)
- `supabase/schema.sql` (Artefato 2): Schema completo com 6 blocos de tabelas (`subjects`, `modules`, `topics`, `topic_prerequisites`, `topic_progress`, `topic_lessons`, `causal_models`, `source_documents`, `document_chunks`, `tps_question_stems`, `tps_items`, `tps_attempts`, `error_notebook`, `flashcards`, `essay_prompts`, `essay_submissions`), índices HNSW (`pgvector`) e GIN (`tsvector`) e a função RPC `hybrid_search_chunks` que executa *Reciprocal Rank Fusion (RRF)* ponderado pelo `authority_weight` da fonte.
- `supabase/seed_economia.sql` (Artefato 4): Popula as 9 disciplinas do CACD, os 5 módulos pedagógicos de Economia (`MOD-0` a `MOD-4`), os 24 tópicos mapeados ao edital oficial, o grafo de pré-requisitos (`topic_prerequisites`) e o modelo causal inicial de Mundell-Fleming.

### Camada C: Fábrica de Conteúdo e Ingestão Offline em Python (`ingestion/`)
- `ingestion/requirements.txt` & `ingestion/pipeline.py` (Artefato 5): Pipeline local em back-office que usa `Docling` (para PDFs preservando tabelas), `Faster-Whisper` (para transcrição de videoaulas com minutagem) e `gemini-2.5-pro` + `text-embedding-004` (1536 dims) para popular chunks com cabeçalho contextual (*Contextual Retrieval*), fichas em duas camadas, armadilhas de TPS e flashcards iniciais.
- `ingestion/bibliography_manifest.json` (Artefato 12): Mapeamento direto dos capítulos de obras canônicas da banca (Mankiw, Pindyck, Blanchard, Krugman/Obstfeld, Celso Furtado, Marcelo de Paiva Abreu e Fabio Giambiagi) para os tópicos `0.1` a `4.8`.

### Camada D: Core, Contratos de IA, FSRS e Rotas de Backend (`src/lib/` e `src/app/api/`)
- `src/lib/ai-contracts.ts` (Artefato 6): Schemas Zod (`TutorResponseSchema`, `EssaySkeletonEvaluationSchema`, `FullEssayGradingSchema`, `ErrorNotebookDiagnosisSchema`).
- `src/lib/fsrs.ts` (Artefato 6): Implementação matemática do algoritmo *Free Spaced Repetition Scheduler (FSRS)* e cálculo de pontuação líquida padrão Cebraspe/IADES (`calculateCACDNetScore`).
- `src/lib/server-clients.ts` (Artefato 10): Inicialização segura do `supabaseAdmin` (Service Role) e `aiClient` (`@google/genai`), mais helper `generateQueryEmbedding`.
- `src/app/api/tutor/chat/route.ts` (Artefato 10): Endpoint do Tutor IA com RAG Híbrido estrito e adaptação de camada didática (`base` vs. `cacd`).
- `src/app/api/tps/attempt/route.ts` (Artefato 10): Julgamento de item Certo/Errado/Branco + termômetro de confiança (`certain`, `doubt`, `guess`). Aciona diagnóstico de IA e cria card FSRS automático sempre que a aluna erra ou acerta com dúvida/chute.
- `src/app/api/essay/evaluate/route.ts` (Artefato 10): Avaliador de 3ª Fase em dois modos (`skeleton_only` para validar coerência causal de parágrafos e `full_simulation` para corrigir redações de 60 a 90 linhas digitadas ou enviadas por foto manuscrita via OCR multimodal).

### Camada E: Design System "Itamaraty / Rio Branco", Componentes e Páginas (`src/components/` e `src/app/`)
- `tailwind.config.ts` & `src/app/globals.css` (Artefato 15): Tokens de cores institucionais (`itamaraty-navy`, `itamaraty-emerald`, `itamaraty-gold`, `itamaraty-carmine`, `travertine`, `ink`, `econ`) e a classe CSS `.cacd-ruled-paper` que desenha a folha pautada de 32px de linha.
- `src/components/ui/DiplomaticBadges.tsx` (Artefato 16): Padrão geométrico SVG de Athos Bulcão (`AthosBulcaoPattern`) e as 5 insígnias vetoriais da carreira diplomática (`Terceiro-Secretário` a `Embaixador`) calculadas via `resolveDiplomaticRank`.
- `src/components/layout/ChanceryHeader.tsx` (Artefato 17): Barra superior com alternador persistente entre **Modo Pergaminho (Diurno)** e **Modo Chancelaria (Noturno)**, alternador global de camada didática (`Camada 1: Intuição Base Zero` vs. `Camada 2: Rigor CACD`) e indicadores de TPS líquido e FSRS.
- `src/components/layout/DiplomaticSidebar.tsx` (Artefato 18): Navegação lateral pelos 6 ambientes de treino, atalhos para os 5 módulos de Economia e barras de progresso das 9 disciplinas do edital.
- `src/components/economics/CausalGraphTranslator.tsx` (Artefato 8): Tradutor visual passo a passo de curvas econômicas (IS-LM-BP), reflexo no Balanço de Pagamentos (BPM6) e gerador de parágrafo-modelo de 3ª Fase.
- `src/components/tps/TPSArena.tsx` & `src/components/essay/EssayWorkshop.tsx` (Artefato 11): Componentes interativos para baterias de questões C/E e treino de esquletos argumentativos.
- `src/components/essay/RuledPaper90Lines.tsx` (Artefato 19): Simulador completo da folha pautada oficial de 90 linhas com margem numerada (`01` a `90`), alerta de linha mínima (`60`), upload OCR de manuscrito e parecer da banca com reescrita diplomática.
- `src/app/layout.tsx` (Artefato 20): Layout raiz configurando as fontes Google (`Newsreader`, `Plus Jakarta Sans` e `JetBrains Mono`).
- `src/components/tutor/TutorRAGDrawer.tsx` (Artefato 21), `src/components/economics/TopicStudioClient.tsx` (Artefato 22) e `src/app/economia/[topicCode]/page.tsx` (Artefato 23): O Estúdio do Tópico completo com leitura lado a lado das duas camadas, gráficos interativos, radar de pegadinhas, arsenal de citações e gaveta retrátil do Tutor RAG.
- `src/components/economics/ModuleEditorialCover.tsx` (Artefato 24), `src/components/economics/EconomicsTrailClient.tsx` (Artefato 25) e `src/app/economia/page.tsx` (Artefato 26): Página da Trilha de Economia com as 5 capas editoriais em SVG nativo, estante modular e visualização interativa do Grafo de Pré-requisitos.

---

## 2. REGRAS VISUAIS E COGNITIVAS DO DESIGN SYSTEM "ITAMARATY / RIO BRANCO"

Toda nova tela ou componente que você criar deve obedecer rigorosamente a estes 5 princípios:

1. **Dualidade de Temas sem Fadiga Visual:**
   - **Modo Pergaminho & Travertino (Diurno - Light):** Fundo primário `bg-travertine-50` (`#FBF9F5`), superfícies e cards `bg-travertine-100` (`#F3EFE6`), bordas `border-travertine-200` (`#E5DEC9`), texto principal `text-ink-900` (`#121C26`) e botões de ação primária em Azul Barão `bg-itamaraty-navy-600` (`#1E4471`).
   - **Modo Chancelaria Noturna (Noturno - Dark `.dark`):** Fundo primário `dark:bg-itamaraty-navy-950` (`#08111D`), cards `dark:bg-itamaraty-navy-900` (`#0F1E32`), bordas `dark:border-itamaraty-navy-800` (`#18304E`), texto `dark:text-travertine-100` e botões primários em Ouro Chancelaria `dark:bg-itamaraty-gold-500` (`#C59B27`) com texto `dark:text-itamaraty-navy-950`.
   - **Proibição:** Nunca utilize `bg-white` puro ou `bg-black` puro em áreas extensas de leitura.

2. **Hierarquia Tipográfica FUNAG / CHDD:**
   - Use `font-serif` (`Newsreader`) para títulos institucionais, textos teóricos das fichas (`topic_lessons`), enunciados do TPS, textos motivadores e dentro do editor pautado de 90 linhas. Mantenha largura confortável de leitura (`max-w-[68ch]`) e entrelinha ampla (`leading-relaxed` ou `leading-[1.8]`).
   - Use `font-sans` (`Plus Jakarta Sans`) para controles de UI, navegação, filtros, badges e diagnósticos rápidos.
   - Use `font-mono` (`JetBrains Mono`) para códigos do edital (`MOD-3 • 3.3`), contadores de linhas (`60/90`), estatísticas de acerto líquido e equações macroeconômicas.

3. **Cores Semânticas Invariáveis para Gráficos Econômicos:**
   - Curva **IS** (Mercado de Bens / Política Fiscal): sempre Ouro Imperial (`#F59E0B` / `text-econ-is`).
   - Curva **LM** (Mercado Monetário / Juros BACEN): sempre Azul Rio Branco (`#38BDF8` / `text-econ-lm`).
   - Curva **BP** (Balanço de Pagamentos / Setor Externo): sempre Esmeralda Itamaraty (`#10B981` / `text-econ-bp`).
   - Deslocamento / Choque Exógeno: sempre Laranja Coral (`#F97316` / `text-econ-shock`).
   - Erro / Armadilha / Déficit / Peso Morto: sempre Carmim Diplomático (`#C83E3B` / `text-itamaraty-carmine-500`).

4. **Dupla Camada Pedagógica Obrigatória:**
   - A aluna precisa construir fundação matemática e gráfica antes de encarar o jargão da banca. Toda explicação teórica ou resposta do Tutor IA deve suportar a chave `learningLayer` (`'base'` para Intuição Base Zero vs. `'cacd'` para Rigor Técnico de 1ª e 3ª Fases).

5. **Gamificação Sóbria via Patentes do Itamaraty:**
   - Nunca utilize elementos infantis. Represente o avanço nos tópicos exclusivamente através do componente `<DiplomaticBadge />` e das 5 classes da carreira: *Terceiro-Secretário*, *Segundo-Secretário*, *Primeiro-Secretário*, *Conselheiro* e *Ministro de Primeira Classe (Embaixador)*.

---

## 3. PLANO DE AÇÃO IMEDIATO (EXECUTE EM ORDEM)

1. **Auditoria de Arquivos e Dependências:** Verifique se todos os arquivos listados no Mapeamento acima estão nos seus caminhos exatos, valide o `package.json`, `tsconfig.json` e `tailwind.config.ts`.
2. **Harmonização do `CausalGraphTranslator.tsx`:** Atualize as classes de container do componente `src/components/economics/CausalGraphTranslator.tsx` para respeitar também o Modo Pergaminho Diurno (`bg-travertine-100 dark:bg-itamaraty-navy-900`), mantendo o canvas SVG com alto contraste e as cores semânticas `econ.is`, `econ.lm` e `econ.bp`.
3. **Criação das Páginas Complementares do Menu Lateral:**
   - Crie `src/app/page.tsx` redirecionando para `/economia` (ou exibindo o Gabinete Geral com resumo das 9 disciplinas e acesso direto à Trilha de Economia).
   - Crie `src/app/tps/page.tsx` conectando o componente `<TPSArena />` aos itens reais de `tps_items` no Supabase (com filtro por tópico `?topic=`).
   - Crie `src/app/discursivas/page.tsx` conectando o componente `<RuledPaper90Lines />` às propostas de `essay_prompts` no Supabase.
   - Crie `src/app/caderno-de-erros/page.tsx` e `src/app/revisao/page.tsx` consumindo as tabelas `error_notebook` e `flashcards` com o agendador `scheduleNextFSRSReview` de `src/lib/fsrs.ts`.
4. **Validação de Build (`npm run build`):** Garanta zero erros de TypeScript ou de importação em todas as rotas antes de encerrar.