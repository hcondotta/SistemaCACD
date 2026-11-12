# Auditoria do Projeto e Roadmap de Execução

**Data:** 2026-11-12
**Base auditada:** PDF "Sistema de Estudo para o CACD" (58 páginas, 13 artefatos) × arquivos em disco.

---

## 1. Veredito

O documento é uma boa especificação de **domínio**: a árvore pedagógica de Economia, o schema do banco e os contratos de IA estão maduros e bem pensados. O que ele não é, ainda, é uma especificação de **sistema** — faltam a aplicação em si, a camada de segurança, e o caminho pelo qual o material didático dela entra no banco.

Concretamente: **8 dos 13 artefatos foram salvos em disco, 5 não. E nenhuma linha deste projeto jamais foi executada** — não existe `package.json`, não existe `src/app/`, não existe `npm run dev`. Os três arquivos TypeScript em `src/` são código órfão que nunca passou por um compilador.

Além disso há **um erro técnico que quebra a ingestão de forma garantida** (seção 3.2), e que precisa ser decidido antes de vetorizar o primeiro PDF — corrigi-lo depois obriga a reprocessar todo o acervo.

---

## 2. Inventário: 13 artefatos do PDF × disco

| # | Artefato | Caminho previsto no PDF | Status real |
|---|---|---|---|
| 1 | Manifesto do projeto | `docs/00-master-project-spec.md` | ✅ `docs/PROJECT_SPEC.md` |
| 2 | Schema do banco | `supabase/schema.sql` | ✅ `supabase/migrations/20261112000000_initial_schema.sql` |
| 3 | Regras do agente | `docs/01-claude-agent-rules.md` | ✅ `AGENTS.md` |
| 4 | Seed (9 disciplinas + Economia) | `supabase/seed_economia.sql` | ✅ `supabase/seed.sql` — 9 disciplinas, 5 módulos, 28 tópicos, 10 pré-requisitos, 1 modelo causal |
| 5 | Pipeline de ingestão | `ingestion/pipeline.py` | ⚠️ `backoffice/content_factory.py` — **funções presentes, mas sem CLI: não roda** |
| 6 | Contratos Zod + FSRS | `src/lib/ai-contracts.ts`, `src/lib/fsrs.ts` | ✅ `src/lib/schemas/ai-contracts.ts` + `src/lib/fsrs.ts` |
| 7 | Spec das rotas de API | `docs/02-api-routes-and-prompts.md` | ✅ `docs/API_ROUTES.md` |
| 8 | Tradutor de Gráficos | `src/components/economics/CausalGraphTranslator.tsx` | ✅ `src/components/economia/CausalGraphTranslator.tsx` |
| 9 | `CLAUDE.md` raiz | `CLAUDE.md` | ❌ **ausente** (o `AGENTS.md` cobre cerca de 1/4 do conteúdo) |
| 10 | Clientes de servidor + 3 rotas de API | `src/lib/server-clients.ts`, `src/app/api/**/route.ts` | ❌ **ausente — nenhuma rota existe** |
| 11 | Arena TPS + Oficina de Discursivas | `src/components/tps/`, `src/components/essay/` | ❌ **ausente** |
| 12 | Manifesto bibliográfico | `ingestion/bibliography_manifest.json` | ❌ **ausente** |
| 13 | `package.json` + `.env.example` | raiz | ❌ **ausente** |

Os nomes de pasta divergem do PDF (`backoffice/` ≠ `ingestion/`, `economia/` ≠ `economics/`, `schemas/ai-contracts.ts` ≠ `ai-contracts.ts`). Isso em si não é problema — mas o `CLAUDE.md` do PDF lista os caminhos antigos, então um agente que leia aquele documento vai procurar arquivos onde eles não estão.

---

## 3. Bloqueadores (P0) — impedem o sistema de existir ou corrompem dados

### 3.1 Não existe aplicação Next.js

Faltam: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `.env.example`, `.gitignore`.

Nenhum artefato do PDF especifica o scaffold — o "Passo 1" do roteiro de prompts simplesmente manda o agente inicializar o projeto. É a primeira coisa a fazer, e destrava todo o resto.

### 3.2 O modelo de embedding é incompatível com o schema — falha garantida

Este é o achado mais importante da auditoria.

- `supabase/migrations/20261112000000_initial_schema.sql` declara `embedding vector(1536) NOT NULL`.
- `backoffice/content_factory.py` pede `model="text-embedding-004"` com `output_dimensionality=1536`.

O `text-embedding-004` produz **768 dimensões**. O parâmetro `output_dimensionality` usa Matryoshka (MRL) para **truncar para baixo** — nunca expande. Pedir 1536 de um modelo de 768 não funciona. Pior: esse modelo foi descontinuado e já retorna erro na API.

**Correção:** trocar para `gemini-embedding-001` com `output_dimensionality=1536`, mantendo a coluna `vector(1536)` e o índice HNSW como estão. Atenção a um detalhe fácil de esquecer: o `gemini-embedding-001` só entrega vetores **pré-normalizados em 3072 dimensões**; em 1536 é preciso **normalizar (L2) manualmente** antes de gravar, senão a distância de cosseno do pgvector fica distorcida e o RAG degrada silenciosamente.

Essa decisão precisa ser tomada **antes** de vetorizar o primeiro livro. Mudar a dimensão depois significa reprocessar e repagar o acervo inteiro.

### 3.3 Banco sem RLS e sem autenticação

Nenhuma tabela tem `ENABLE ROW LEVEL SECURITY`, não há uma única policy, e nada se liga a `auth.users`.

A chave `NEXT_PUBLIC_SUPABASE_ANON_KEY` vai no bundle do navegador — é pública por construção. Hoje, qualquer pessoa que abra o site e leia o JavaScript consegue ler e escrever **tudo**: o acervo, as respostas dela, as redações, o caderno de erros. O sistema é de uso pessoal, mas vai estar na internet aberta.

**Correção:** Supabase Auth com um único login, RLS ligado em todas as tabelas, policy padrão `auth.role() = 'authenticated'`. Como é mono-usuário, não é preciso espalhar `user_id` pelas tabelas — o que economiza uma migração grande.

### 3.4 A fábrica de conteúdo não roda

`content_factory.py` tem os extratores (Docling, Whisper), o vetorizador e o sintetizador corretos. Mas o `__main__` apenas imprime *"Pipeline de Ingestão CACD pronto para execução."* e encerra.

Não há leitura de pastas, não há CLI, não há leitura do manifesto bibliográfico (que também não existe). **Não há nenhum caminho pelo qual um PDF dela entre no sistema.** É o gargalo prático de todo o projeto: sem acervo indexado, o Tutor RAG, o gerador de TPS e o corretor de discursivas não têm sobre o que trabalhar.

### 3.5 Ingestão não é idempotente

`register_and_index_source` sempre faz `INSERT` em `source_documents`. Rodar o pipeline duas vezes no mesmo livro duplica o corpus inteiro — e aí o RAG passa a devolver o mesmo trecho repetido, ocupando os 8 slots de `match_count` com uma única fonte.

**Correção:** `UNIQUE(source_document_id, chunk_index)` em `document_chunks`, mais hash do arquivo em `source_documents.metadata` para pular o que já foi processado.

---

## 4. Lacunas de especificação (P1) — o PDF nunca definiu

| # | Lacuna | Por que importa |
|---|---|---|
| 4.1 | **Nenhuma tela foi especificada.** A seção "Fluxo de Telas" descreve 4 visões em prosa; nenhum artefato entrega `layout.tsx`, `page.tsx`, navegação ou data fetching. Dos 3 componentes citados, só 1 existe. | É a aplicação inteira, do ponto de vista dela. |
| 4.2 | **A trava de pré-requisito não tem lógica.** `topic_prerequisites` e `topic_progress` existem e estão populadas, mas nada nunca escreve em `topic_progress`. Nenhuma regra calcula `mastery_status`; nada destrava Mundell-Fleming depois de IS-LM. | É o coração pedagógico do sistema — a "escada de dependência lógica" — e hoje é tabela morta. |
| 4.3 | **Revisão FSRS sem rota e sem tela.** `fsrs.ts` calcula o agendamento, mas não há `/api/flashcards/review` nem o deck `/revisao`. | O Caderno de Erros e a correção de redação criam flashcards que nunca poderão ser revisados. |
| 4.4 | **As rotas validam a saída da IA, não a entrada.** O `AGENTS.md` exige validação com Zod; as rotas do PDF fazem `await req.json()` e usam os campos direto. O `catch` ainda devolve `error.message` cru ao cliente. | Viola a regra do próprio projeto e vaza detalhes internos. |
| 4.5 | **`zodToJsonSchema` → `responseSchema` do Gemini.** O Gemini aceita um subconjunto de OpenAPI 3.0. A saída padrão do `zod-to-json-schema` traz `$schema`, `$ref` e `additionalProperties`, e `.optional()` vira `anyOf` — o Gemini rejeita. | As 3 rotas de IA quebram na primeira chamada. Precisa de `{ target: "openApi3", $refStrategy: "none" }` e limpeza das chaves não suportadas. |
| 4.6 | **O "FSRS" caseiro não é FSRS.** É uma heurística plausível; o FSRS real usa 17–19 pesos e atualiza a estabilidade em função da *retrievability* e da retenção-alvo. | Funciona como repetição espaçada, mas com intervalos piores — e o nome engana. `ts-fsrs` resolve com uma linha de dependência. |
| 4.7 | **Busca textual sem `unaccent`.** A extensão é criada e nunca usada: `to_tsvector('portuguese', content)`. | "cambio" não encontra "câmbio", "balanco" não encontra "balanço". Armadilha: `unaccent` não é `IMMUTABLE`, então não entra direto numa coluna `GENERATED` — exige função wrapper marcada `IMMUTABLE`. |
| 4.8 | **Sem provas anteriores e sem temas de discursiva.** `tps_items` só terá itens inventados pela IA; `essay_prompts` está vazia. O PDF termina *oferecendo* um importador de provas do CACD que nunca foi entregue. | Ela declarou ter provas anteriores e listas comentadas. Treinar só contra item gerado por IA é o oposto de treinar para a banca. |
| 4.9 | **Sem storage.** `source_documents.file_path` e `essay_submissions.handwritten_image_url` apontam para lugar nenhum: nenhum bucket, nenhum fluxo de upload. | A foto da folha manuscrita hoje só existe como base64 em trânsito e se perde. |
| 4.10 | **Sem git, sem testes, sem deploy.** O diretório não é repositório git. Não há um único teste — nem para `calculateCACDNetScore`, que é função pura de 15 linhas. Ela precisa acessar de PC, tablet e celular, e nada define onde o app fica hospedado. | Sem git não há rollback. Sem deploy ela não usa. |
| 4.11 | **Custo sem controle.** `gemini-2.5-pro` em toda pergunta do tutor e em toda correção, sem cache, sem rate limit, sem teto de gastos. | Uma sessão longa pode custar caro sem aviso. |
| 4.12 | **Multi-disciplinar prometido, só Economia semeada.** 9 disciplinas em `subjects`, módulos e tópicos só para Economia. | Correto como estratégia de início — mas o roadmap precisa dizer quando e como entram as outras 8. |

---

## 5. Correções pontuais nos arquivos existentes

- `docs/PROJECT_SPEC.md` — corrigir o modelo de embedding (era `text-embedding-004`).
- `AGENTS.md` — tem 13 linhas e cobre só a persona; faltam a estrutura de diretórios **real**, os comandos do projeto e as 3 regras obrigatórias do Artefato 9. Como o Claude Code lê `AGENTS.md`, o conteúdo do `CLAUDE.md` deve ser fundido aqui, em vez de criar um segundo arquivo concorrente.
- `docs/API_ROUTES.md` — acrescentar a validação Zod de entrada e a política de erro (não vazar `error.message`).
- `supabase/seed.sql` — está correto; apenas registrar que são **28** tópicos (o `CLAUDE.md` do PDF dizia 24).
- `backoffice/content_factory.py` — modelo de embedding, normalização L2, idempotência e CLI.

---

## 6. Roadmap

### Fase 0 — Fundação executável *(destrava todo o resto)*

1. `git init` + `.gitignore` + primeiro commit do estado atual.
2. Scaffold Next.js 15 (App Router, TypeScript, Tailwind): `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `globals.css`.
3. `.env.example` + `src/lib/server-clients.ts` (Supabase admin + cliente Gemini).
4. Migração de segurança: RLS em todas as tabelas + Supabase Auth com login único.
5. Migração de correção: `unaccent` imutável no FTS, `UNIQUE(source_document_id, chunk_index)`.
6. Aplicar schema + seed no Supabase e confirmar que `hybrid_search_chunks` responde.

**Pronto quando:** `npm run dev` sobe, `npm run build` passa, e a home lista as 9 disciplinas vindas do banco real.

### Fase 1 — Acervo dentro do sistema *(o gargalo)*

1. `backoffice/bibliography_manifest.json` (Artefato 12 do PDF).
2. CLI do `content_factory.py`: varrer pastas, ler o manifesto, ingerir em lote, pular o já processado.
3. Trocar para `gemini-embedding-001` @ 1536 + normalização L2.
4. Ingerir o primeiro livro de verdade e conferir a qualidade do retrieval no SQL Editor.

**Pronto quando:** um capítulo de Krugman está indexado e `hybrid_search_chunks` devolve o trecho certo para "trindade impossível".

### Fase 2 — Estudar

1. `/api/tutor/chat` com validação Zod de entrada e `responseSchema` compatível com o Gemini.
2. Dashboard da Trilha (`/economia`) — 5 módulos, 28 tópicos, estado de cada um.
3. Estúdio do Tópico (`/economia/[topicCode]`) — ficha em 2 camadas + `CausalGraphTranslator` + gaveta do Tutor.
4. Lógica de progresso: rota que recalcula `topic_progress` e destrava o que o pré-requisito liberou.

### Fase 3 — Treinar

1. `/api/tps/attempt` + gatilho do Caderno de Erros.
2. `TPSArena.tsx` (Artefato 11) e a tela `/tps`.
3. `/api/flashcards/review` + deck `/revisao`, com `ts-fsrs` no lugar da heurística atual.
4. Importador de provas anteriores do CACD (o que o PDF ofereceu e não entregou).

### Fase 4 — Discursivas

1. `/api/essay/evaluate` (3 estágios, incluindo OCR da folha manuscrita).
2. `EssayWorkshop.tsx` (Artefato 11) e a tela `/discursivas`.
3. Bucket de storage para as fotos das folhas.
4. Seed de temas reais de 3ª fase com espelho de correção.

### Fase 5 — Escala

1. Deploy (Vercel) com acesso protegido por login.
2. Árvores pedagógicas das outras 8 disciplinas, uma por vez, reaproveitando toda a máquina já construída.

---

## 7. Decisões que dependem de você

1. **Hospedagem:** Vercel (ela acessa de qualquer lugar, precisa de login) ou só local na sua máquina?
2. **Acervo:** quais livros, apostilas e videoaulas existem hoje em disco, e em que pasta? A Fase 1 depende disso para valer alguma coisa.
3. **Ordem:** o roadmap acima prioriza "fazer rodar" antes de "fazer bonito". Se ela precisa de algo utilizável para ontem, dá para inverter e entregar a Arena TPS antes do Tutor.
