# CLAUDE.md — Guia Mestre de Arquitetura e Design System (CACD Rio Branco Platform)

## 1. Missão do Sistema
Plataforma de estudo de alto rendimento para o Concurso de Admissão à Carreira de Diplomata (CACD - Instituto Rio Branco). O sistema resolve a dificuldade em **Economia** através de uma trilha com pré-requisitos (`MOD-0` Base Zero até `MOD-4` História Econômica do Brasil), ensino em duas camadas (`Intuição Base Zero` vs. `Rigor CACD`), tradutor interativo de gráficos (`IS-LM-BP`), RAG Híbrido estrito sem alucinação (`pgvector` + `tsvector` RRF), simulador TPS com Caderno de Erros automático, flashcards FSRS e Oficina de Discursivas em folha pautada de 90 linhas.

## 2. Índice Completo da Arquitetura de Arquivos
- **Documentação (`docs/`):**
  - `docs/00-master-project-spec.md`: Escopo geral e regras de negócio.
  - `docs/01-claude-agent-rules.md`: Diretrizes de código para agentes.
  - `docs/02-api-routes-and-prompts.md`: Especificação das rotas de IA e *system prompts*.
  - `docs/03-design-system-and-assets.md`: Especificação do Design System "Itamaraty / Rio Branco" e prompts de imagens.
- **Banco de Dados (`supabase/`):**
  - `supabase/schema.sql`: Tabelas multi-disciplinares, índices vetoriais/Full-Text e RPC `hybrid_search_chunks`.
  - `supabase/seed_economia.sql`: Seed das 9 matérias, 5 módulos, 24 tópicos de Economia, grafo `topic_prerequisites` e modelo `causal_models`.
- **Pipeline Back-Office (`ingestion/`):**
  - `ingestion/requirements.txt` & `ingestion/pipeline.py`: Extrator Docling + Whisper + Gemini 2.5 Pro.
  - `ingestion/bibliography_manifest.json`: Mapeamento dos capítulos de Furtado, Abreu, Giambiagi, Krugman, Blanchard, Pindyck e Mankiw.
- **Bibliotecas e Contratos (`src/lib/`):**
  - `src/lib/ai-contracts.ts`: Schemas Zod de validação das respostas JSON do Gemini.
  - `src/lib/fsrs.ts`: Agendador de repetição espaçada FSRS e cálculo de escore líquido do TPS.
  - `src/lib/server-clients.ts`: Clientes `supabaseAdmin` e `aiClient` (`@google/genai`) + `generateQueryEmbedding`.
- **Rotas de API (`src/app/api/`):**
  - `src/app/api/tutor/chat/route.ts`: Tutor RAG Híbrido restrito ao acervo confiável.
  - `src/app/api/tps/attempt/route.ts`: Julgamento C/E/B + diagnóstico automático para o Caderno de Erros e criação de card FSRS.
  - `src/app/api/essay/evaluate/route.ts`: Correção de esqueleto e simulado de 60–90 linhas (texto ou foto manuscrita via OCR).
- **Design System e Componentes (`src/components/`):**
  - `src/components/ui/DiplomaticBadges.tsx`: Padrão SVG de Athos Bulcão e as 5 insígnias heráldicas da carreira diplomática.
  - `src/components/layout/ChanceryHeader.tsx`: Header com alternador de tema (`Pergaminho` vs. `Chancelaria`) e alternador de camada (`Base Zero` vs. `Rigor CACD`).
  - `src/components/layout/DiplomaticSidebar.tsx`: Sidebar com os ambientes de estudo, módulos de Economia e as 9 disciplinas do CACD.
  - `src/components/economics/ModuleEditorialCover.tsx`: Capas vetoriais em SVG estilo FUNAG/Itamaraty para os Módulos 0 a 4.
  - `src/components/economics/EconomicsTrailClient.tsx`: Interface da Trilha de Economia com estante modular e Grafo de Pré-requisitos.
  - `src/components/economics/TopicStudioClient.tsx`: Estúdio do Tópico (Fichas em 2 camadas com modo lado a lado, Gráficos, Armadilhas e Repertório).
  - `src/components/economics/CausalGraphTranslator.tsx`: Player interativo de deslocamento de curvas e reflexo no Balanço de Pagamentos.
  - `src/components/tutor/TutorRAGDrawer.tsx`: Gaveta lateral retrátil do Tutor IA exibindo cadeia causal e citações exatas do acervo.
  - `src/components/tps/TPSArena.tsx`: Arena de julgamento C/E/Branco com termômetro de confiança.
  - `src/components/essay/EssayWorkshop.tsx` & `src/components/essay/RuledPaper90Lines.tsx`: Oficina de 3ª Fase e folha pautada numerada de 01 a 90 linhas.
- **Páginas Next.js (`src/app/`):**
  - `src/app/layout.tsx` & `src/app/globals.css`: Fontes (`Newsreader`, `Plus Jakarta Sans`, `JetBrains Mono`) e folha pautada `.cacd-ruled-paper`.
  - `src/app/economia/page.tsx`: Server Component da Trilha de Economia.
  - `src/app/economia/[topicCode]/page.tsx`: Server Component do Estúdio do Tópico.

## 3. Regras Inegociáveis de UI e Engenharia
1. **Paleta "Itamaraty / Rio Branco":** Respeite sempre os tokens `travertine` e `ink` no modo claro (Pergaminho) e `itamaraty-navy` e `itamaraty-gold` no modo escuro (Chancelaria).
2. **Cores Semânticas das Curvas:** `IS` = `#F59E0B` (Ouro), `LM` = `#38BDF8` (Azul), `BP` = `#10B981` (Esmeralda), `Choque` = `#F97316` (Laranja).
3. **Zero Alucinação no RAG:** Qualquer geração de conteúdo pedagógico ou correção deve consultar `hybrid_search_chunks` e exibir o `citation_label` real da fonte.