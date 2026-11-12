# Master Project Specification: Sistema de Apoio ao CACD (Instituto Rio Branco)

## 1. Visão Geral do Produto
Plataforma de alta performance para preparação de alto rendimento para o Concurso de Admissão à Carreira de Diplomata (CACD), combinando:
- Fila de estudo em trilhas sequenciais baseadas no edital oficial.
- Fábrica de conteúdo em back-office (ingestão de acervo próprio: PDFs, videoaulas transcritas e notas).
- Tutor RAG estrito (sem alucinação, ancorado em fontes confiáveis).
- Simulador TPS (Certo/Errado) com Caderno de Erros automático e algoritmo de repetição espaçada FSRS.
- Oficina de Discursivas (3 estágios: Esqueleto, Redação Guiada e Simulado de 60 a 90 linhas com correção de banca).

## 2. Stack Tecnológica Oficial
- **Frontend / Backend / Rotas:** Next.js (App Router) com TypeScript e Tailwind CSS.
- **Banco de Dados & Vetores:** Supabase (PostgreSQL + extensões `vector`, `pg_trgm`, `unaccent`).
- **IAs e Embeddings:** Google Gemini API (`gemini-2.5-pro` para raciocínio analítico e correção; `gemini-2.5-flash` para diagnósticos rápidos; `gemini-embedding-001` com `output_dimensionality=1536` para os vetores). ATENÇÃO: o antigo `text-embedding-004` produz apenas 768 dimensões e foi descontinuado — não usar. Vetores de 1536 dimensões NÃO vêm pré-normalizados, exigindo normalização L2 manual antes da gravação no pgvector.
- **Parsers / Ingestão:** Docling (para PDFs estruturados) e Whisper (para transcrição de aulas).

## 3. Diretrizes Críticas para os Agentes (Claude Code / Antigravity)
1. **Zero Alucinação no RAG:** O Tutor IA e o Corretor de Discursivas devem buscar rigorosamente nas tabelas de chunks (`hybrid_search_chunks`) e citar a fonte exata (autor, obra, capítulo ou minutagem da aula).
2. **Tipagem Estrita:** Todo código TypeScript deve ser fortemente tipado, utilizando Zod para validação de payloads e schemas do Supabase.
3. **Didática Base Zero:** Em Economia, Micro e Macroeconomia, os textos e explicações devem sempre começar do nível intuitivo (base zero) antes de aprofundar nos modelos matemáticos formais e na historiografia do CACD.