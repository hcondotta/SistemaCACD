# Análise dos Artefatos Novos (`artefatos/`)

**Data:** 2026-11-12
**Base analisada:** os 25 arquivos de `artefatos/` (commit `cb73324`), usando `prompt_guia.md` e `prompt_guia2.md` como mapa de referência, contra o estado real do repositório (commit `e277f15`) e do banco publicado (`kirzdbmgarpswegumuoy`).
**Documento anterior:** [AUDITORIA_E_ROADMAP.md](AUDITORIA_E_ROADMAP.md) (auditoria do PDF original).

> **Situação em 2026-11-12:** Etapas A e B do plano (seção 7) concluídas. Resolvidos: 4.1, 4.2, 4.4, 4.5, 4.8 e os imports quebrados do 4.6, além dos itens de 4.9 referentes à trilha, ao estúdio, ao header e às insígnias. Ficam para a Etapa C as rotas de API do 4.6, o upload via Storage do 4.7 e a `RuledPaper90Lines`; para a Etapa D, a procedência do seed (4.3) e o importador. Continuam abertas as decisões da seção 8.

---

## 1. Veredito

Os artefatos entregam o que faltava de mais visível: o **Design System "Itamaraty / Rio Branco"** e as telas de Economia (trilha, estúdio do tópico, tutor, folha pautada). A direção visual é coerente e bem pensada — tokens semânticos, tipografia editorial, cores fixas para IS/LM/BP, folha pautada alinhada às 90 linhas.

Mas nada disso foi integrado ainda: os arquivos estão com nomes de export do Gemini, fora de `src/`, e excluídos do `tsconfig`. **Como estão, não compilam** — 11 dos 12 arquivos `.ts` contêm JSX (precisam ser `.tsx`) e os imports apontam para caminhos que não existem. É quase certamente a falha de build da Vercel que motivou o commit `0f38978`.

Antes de integrar, três problemas de fundo precisam ser resolvidos, porque atacam justamente o que torna um sistema de estudo confiável:

1. **Dados inventados no lugar de dados reais.** Progresso, acurácia e conteúdo fictícios aparecem sempre que o banco está vazio ou falha — e, em alguns casos, mesmo quando funciona.
2. **Botões que fingem salvar.** O "+ Fila FSRS" do Tutor e o seletor de status do tópico mudam a tela e não gravam nada.
3. **Procedência errada.** Questões escritas por IA estão rotuladas como prova real do CACD, com ano e banca.

E a funcionalidade não fecha: os componentes chamam **3 rotas de API que não existem**, e o plano de ação do guia depende de **2 componentes (`TPSArena`, `EssayWorkshop`) que também não estão em lugar nenhum** — nem no repositório, nem em `artefatos/`.

---

## 2. Os guias × a realidade

Os dois guias afirmam que "todos os arquivos-base [...] já foram especificados e adicionados ao repositório". Não é o caso — e vários caminhos que eles citam não existem. Um agente que siga os guias ao pé da letra vai procurar arquivos no lugar errado e criar duplicatas.

| O guia diz | A realidade | Consequência |
|---|---|---|
| `docs/00-master-project-spec.md`, `01-…`, `02-…` | `docs/PROJECT_SPEC.md`, `AGENTS.md`, `docs/API_ROUTES.md` | Agente não encontra as regras |
| `supabase/schema.sql`, `supabase/seed_economia.sql` | `supabase/migrations/*.sql` (4 migrações), `supabase/seed.sql` | Agente pode recriar o schema do zero |
| `ingestion/pipeline.py`, `ingestion/…` | `backoffice/content_factory.py` | Os 3 `.sh` apontam para `ingestion/import_past_exams.py`, que não existe |
| `src/lib/ai-contracts.ts` | `src/lib/schemas/ai-contracts.ts` | Import quebrado no Tutor |
| `src/components/economics/…` | `src/components/economia/…` | Import quebrado no Estúdio |
| `text-embedding-004` (1536 dims) | `gemini-embedding-001` @ 1536 + normalização L2 | **Reintroduziria o bloqueador P0 já corrigido** |
| "24 tópicos" | 28 tópicos no seed | Número errado repetido na sidebar |
| Next.js 15, `tailwind.config.ts` | Next.js 16, Tailwind 4 (configuração em CSS) | Ver seção 4.5 |
| `TPSArena.tsx` e `EssayWorkshop.tsx` existem (Artefato 11) | Não estão no disco nem em `artefatos/` | A página `/tps` do plano de ação não tem componente |
| Rotas `/api/tutor/chat`, `/api/tps/attempt`, `/api/essay/evaluate` | Não existem | Tutor, folha pautada e TPS falham na primeira ação |

---

## 3. Mapa dos artefatos

| Arquivo em `artefatos/` | Artefato | Destino | Estado |
|---|---|---|---|
| `gemini-code-1794510776371.md` | 14 | `docs/03-design-system-and-assets.md` | ✅ Bom. Pequenas divergências de tokens com o config (`ink-600`, `amber-trap-500`, `carmine-*` sem prefixo) |
| `gemini-code-1794510779612.ts` | 15 | `tailwind.config.ts` | ⚠️ Formato Tailwind 3 — precisa ser traduzido para o 4 |
| `gemini-code-1794510782827.css` | 15 | `src/app/globals.css` | ⚠️ Usa `@tailwind base/components/utilities`, que **não funciona no Tailwind 4** |
| `gemini-code-1794511938738.ts` | 16 | `src/components/ui/DiplomaticBadges.tsx` | ⚠️ IDs SVG fixos se repetem quando há várias insígnias iguais na página |
| `gemini-code-1794511946895.ts` | 17 | `src/components/layout/ChanceryHeader.tsx` | ❌ Valores falsos como padrão (78,5% de TPS, 14 cards) |
| `gemini-code-1794511952665.ts` | 18 | `src/components/layout/DiplomaticSidebar.tsx` | ❌ Progresso falso nas 9 disciplinas; 13 links para páginas inexistentes |
| `gemini-code-1794511958743.ts` | 19 | `src/components/essay/RuledPaper90Lines.tsx` | ⚠️ Modo Esqueleto quebrado; sem tratamento de erro; upload excede o limite da Vercel |
| `gemini-code-1794511968048.ts` | 20 | `src/app/layout.tsx` | ⚠️ Bom, mas sem script anti-flash de tema e sem navegação mobile |
| `gemini-code-1794512070914.ts` | 21 | `src/components/tutor/TutorRAGDrawer.tsx` | ❌ "+ Fila FSRS" não salva nada |
| `gemini-code-1794512128509.ts` | 22 | `src/components/economics/TopicStudioClient.tsx` | ❌ Status do tópico editável à mão e nunca gravado |
| `gemini-code-1794512135763.ts` | 23 | `src/app/economia/[topicCode]/page.tsx` | ❌ Ficha e pegadinha fictícias quando o tópico ainda não foi processado |
| `gemini-code-1794512208976.ts` | 24 | `src/components/economics/ModuleEditorialCover.tsx` | ✅ Bom |
| `gemini-code-1794512289951.ts` | 25 | `src/components/economics/EconomicsTrailClient.tsx` | ⚠️ Herda os números falsos da página |
| `gemini-code-1794512340762.ts` | 26 | `src/app/economia/page.tsx` | ❌ 465 linhas de trilha fictícia usadas como "fallback" |
| `gemini-code-1794512714332.py` | — | `backoffice/import_past_exams.py` | ⚠️ Usa o embedding descontinuado; arquiva itens no tópico errado em silêncio |
| `gemini-code-1794512736927.sql` | — | seed de questões | ❌ Itens gerados por IA rotulados como prova real |
| `gemini-code-17945127{26042,27467,31894}.sh` | — | exemplos de uso | ⚠️ Caminho errado; dois dos três são idênticos |
| `design_system_itamaraty_plataforma_cacd.html` | — | referência | ✅ Protótipo navegável (oficina, insígnias, capas). Usa o CDN de testes do Tailwind — serve como referência, não como código |
| `Gemini_Generated_Image_*.jpg` (3) | — | — | ⚠️ Mascotes em estilo cartum. Nenhum componente nem o guia de assets os referencia, e o estilo contradiz a regra 5 do próprio guia |

---

## 4. Problemas transversais

### 4.1 Dados inventados no lugar de dados reais — **grave**

Este é o problema central. Num sistema de estudo, um número falso é pior do que nenhum número: é com base nele que ela decide o que revisar.

- **`economia/page.tsx` tem 465 linhas de trilha fictícia** (`FALLBACK_MODULES`), com tópicos marcados como **"dominados" com 92%, 88% e 90% de acerto**. Ela é exibida em três situações: disciplina não encontrada, banco vazio, ou **qualquer erro** (o `catch {}` engole tudo, sem registrar). Concretamente: se a página fosse integrada hoje corrigindo só os imports, com o `.env.local` atual (chave de serviço ainda placeholder), a consulta falharia e **ela veria uma trilha dizendo que já domina tópicos que nunca abriu**.
- **Mesmo com o banco funcionando**, cada tópico sem linha em `topic_progress` recebe `?? 76.0` de acerto e `?? 8.0` de prontidão para discursiva. Como nada grava em `topic_progress` ainda, isso significa **76% de acerto em todos os 28 tópicos** para uma aluna que nunca respondeu um item.
- **`|| 76.5` e `|| 78.4`** no header escondem um 0% real: em JavaScript, `0 || 76.5` dá `76.5`. Uma aluna que errou tudo vê 76,5%.
- **Sidebar:** progresso fixo no código para as 9 disciplinas ("História do Brasil 65%", "Língua Portuguesa 72%") e "24 tópicos".
- **Estúdio do Tópico:** quando a ficha ainda não foi gerada pelo back-office, a página injeta um texto genérico **e uma pegadinha de Mundell-Fleming fixa — em todos os 28 tópicos**, inclusive "Teoria do Consumidor" e "Economia Cafeeira". Isso contradiz diretamente a regra de zero alucinação do projeto.

**Correção:** sem dado, mostrar estado vazio honesto ("ficha ainda não gerada", "nenhum item respondido", "—"). Erros vão para o log do servidor e viram aviso na tela.

### 4.2 Ações que fingem salvar — **grave**

- **"+ Fila FSRS" no Tutor** muda o botão para "Salvo no Deck" e **não grava nada** — só altera estado local. Ela acredita que o card entrou na revisão espaçada; não entrou.
- **Seletor "Status do Tópico"** no Estúdio deixa ela mesma se declarar "Tópico Dominado (Embaixador)", muda a insígnia na tela e **não persiste** — no reload, volta ao que era. Além disso, maestria autodeclarada esvazia o sentido das patentes: o status deveria ser calculado a partir do TPS e do FSRS.

### 4.3 Procedência rotulada errada — **grave**

- O seed `gemini-code-1794512736927.sql` insere 6 itens de TPS e 1 proposta discursiva com `is_ai_generated = FALSE`, **"Cebraspe 2024"** e **"IADES / Cebraspe 2023"**. O arquivo saiu de um export do Gemini, e não há como confirmar que o texto é o da prova real. Conferi os 6 gabaritos e o conteúdo técnico está correto — o problema é ela acreditar que "isso caiu em 2024".
- O importador `import_past_exams.py`, quando não recebe o espelho oficial, pede ao Gemini que **estruture o espelho de correção por conta própria** — e grava esse espelho no mesmo campo que um oficial. Depois, a rota de correção apresenta esse campo ao modelo como "ESPELHO OFICIAL DA BANCA". A redação dela passa a ser corrigida contra critérios inventados, rotulados como da banca.

**Correção:** se os itens não forem transcrição da prova real, `is_ai_generated = TRUE` e `exam_year = NULL`. No importador, registrar a origem do espelho (`oficial` × `gerado por IA`) e exibi-la na correção.

### 4.4 A trava de pré-requisito continua sem existir

A auditoria anterior apontou isso como o coração pedagógico do sistema (item 4.2). Os artefatos não resolvem:

- O status padrão de todo tópico é `"available"`, nunca `"locked"`. Como o cliente só bloqueia quando `status === "locked"`, **nenhum tópico é bloqueado, nunca**.
- A página calcula `isMet` para cada pré-requisito, mas não usa isso para derivar o bloqueio do tópico.
- O Estúdio exibe "Base necessária **concluída**:" listando os pré-requisitos — sem verificar se foram concluídos.
- Qualquer tópico abre direto pela URL.

### 4.5 Tailwind 3 × Tailwind 4 — quebra o visual

O projeto usa Tailwind 4, que é configurado em CSS. Os artefatos foram escritos para o 3:

- `@tailwind base; @tailwind components; @tailwind utilities;` não funcionam no 4 — o correto é `@import "tailwindcss";`.
- O `tailwind.config.ts` não é lido automaticamente no 4. Os tokens precisam ir para um bloco `@theme` (ou ser carregados com `@config`).
- `darkMode: "class"` precisa virar `@custom-variant dark (&:where(.dark, .dark *));`.
- **As fichas de estudo usam as classes `prose` em todo lugar, mas o plugin `@tailwindcss/typography` não está instalado.** Sem ele, o Markdown das fichas renderiza sem estilo — e como o reset do Tailwind remove marcadores de lista, **listas aparecem sem bullet e títulos com o mesmo tamanho do texto**. É a área de leitura principal do produto.
- `itamaraty-emerald-600` é usado mas não existe no tema (a escala tem 950, 900, 700, 500 e 400). No modo claro, **as barras de progresso da sidebar ficam invisíveis**.

### 4.6 Imports e dependências que não existem — quebra o build

| Import nos artefatos | Realidade |
|---|---|
| `import { supabaseAdmin } from "@/lib/server-clients"` | O módulo exporta `getSupabaseAdmin()` (criação sob demanda, necessária para o build passar sem `.env.local`) |
| `@/lib/ai-contracts` | `@/lib/schemas/ai-contracts` |
| `@/components/economics/CausalGraphTranslator` | Está em `src/components/economia/` |
| `fetch("/api/tutor/chat")`, `/api/tps/attempt`, `/api/essay/evaluate` | Nenhuma rota existe |
| Links da sidebar: `/tps`, `/discursivas`, `/caderno-de-erros`, `/revisao`, `/economia/modelos` e 8 das 9 disciplinas | Nenhuma dessas páginas existe — 13 links levam a 404 |

### 4.7 Upload da folha manuscrita estoura o limite da Vercel

A folha pautada envia a foto como base64 dentro do JSON. Uma foto de celular tem de 3 a 8 MB, e o base64 aumenta isso em cerca de um terço. **As funções da Vercel recusam corpos acima de 4,5 MB** — o upload falharia justamente no uso principal (fotografar a folha no celular).

Uma correção sobre algo que eu mesmo fiz: o `bodySizeLimit` que coloquei no `next.config.ts` **não resolve isso** — ele vale apenas para Server Actions, não para rotas de API, e não passa por cima do limite da plataforma.

**Correção:** o bucket privado `essays-handwritten` já existe (migração `…000002`). O navegador envia a foto direto ao Storage e manda para a rota só o caminho do arquivo.

### 4.8 Sem navegação em celular e tablet

O layout esconde a sidebar abaixo de 1024 px (`hidden lg:block`), e nenhuma página passa `onOpenMobileMenu` ao header — então **o botão de menu nunca aparece**. Em celular e em tablet na vertical, não há como ir de uma seção a outra. O uso em celular e tablet foi um requisito desde o início.

### 4.9 Problemas menores

| Onde | Problema |
|---|---|
| Header | Tema aplicado em `useEffect`: **no modo Chancelaria, toda página pisca em claro antes de escurecer** — incômodo justamente no estudo noturno. Pede um script inline no `<head>` |
| Folha pautada, modo Esqueleto | Envia `contentText` em vez de `outlineJson`, e o painel de resultado lê campos da correção completa — exibe "Nota Final Líquida: undefined / 30.00" |
| Folha pautada | Sem tratamento de erro: se a correção falhar, a tela simplesmente não mostra nada, depois de um minuto de espera |
| Folha pautada | Modo "Redação Guiada" não é tratado pela rota especificada |
| Folha pautada | Ano padrão "2024" exibido mesmo para propostas sem ano |
| `[topicCode]/page.tsx` e seed | Busca o tópico só pelo código (`3.1`), sem filtrar a disciplina. Quebra quando outras disciplinas tiverem tópicos com o mesmo código |
| Sidebar | Os links dos módulos (`/economia?mod=MOD-3`) não filtram nada: a página da trilha ignora o parâmetro |
| Insígnias | IDs de gradiente SVG fixos (`gold-grad-${rank}`) se repetem na trilha, que mostra dezenas de insígnias iguais. HTML inválido e frágil; resolver com `useId()` |
| Tutor | Gaveta sem `role="dialog"`, sem fechar com Esc nem clicando fora |
| Tutor | O texto de carregamento mostra o nome interno da função SQL à aluna |
| Seed de questões | Não é idempotente: rodar duas vezes duplica tudo |
| Importador | Se o Gemini devolver um código de tópico inexistente, o item vai em silêncio para o primeiro tópico (`0.1 Escassez`) |
| Importador | Chama o embedding com `text-embedding-004` — o mesmo bloqueador P0 já corrigido no `content_factory.py` |

---

## 5. O que está bom e deve ser mantido

- **A migração `20261113000002_advisor_hardening_and_storage.sql` está correta.** Os 14 índices cobrem todas as chaves estrangeiras que não tinham índice (as demais já eram cobertas por PK ou UNIQUE), o `search_path` foi fixado nas duas funções e o bucket privado fecha a lacuna de storage apontada na auditoria (item 4.9).
- **O conteúdo técnico do seed de questões é bom.** Os 6 gabaritos conferem: Renda Primária × Secundária no BPM6, os casos de Mundell-Fleming, o Trilema, a leitura de Furtado sobre 1930 e a natureza da URV. O problema é só o rótulo de procedência.
- **O importador de provas** tem a estrutura certa: contratos Pydantic, modo `--dry-run` para revisar antes de gravar, e ancoragem de cada gabarito comentado num trecho do acervo.
- **O Design System** é coerente de ponta a ponta: cores semânticas fixas para IS/LM/BP, folha pautada com numeração alinhada às 90 linhas, tipografia editorial.
- **O Tutor** trata erro corretamente e exibe a cadeia causal e as citações — é o componente mais próximo de pronto.

---

## 6. Estado do banco publicado (`kirzdbmgarpswegumuoy`)

Verificado com a chave pública do `.env.local` (somente leitura):

| Verificação | Resultado |
|---|---|
| Schema aplicado | ✅ `subjects`, `topics` e `document_chunks` existem |
| Chave pública bloqueada | ❌ **Ela ainda tem permissão de leitura nas tabelas (HTTP 200).** O `REVOKE` da migração `…000000_security_rls.sql` não está em vigor nesse banco — se estivesse, a resposta seria "permission denied" |
| RLS ligado | ❓ As leituras voltam vazias, o que é compatível tanto com RLS ligado quanto com banco sem seed. Daqui não dá para distinguir, porque a conexão MCP desta sessão não enxerga esse projeto |
| Chaves locais | ⚠️ `SUPABASE_SERVICE_ROLE_KEY` e `GEMINI_API_KEY` ainda são placeholders no `.env.local` |

Se o RLS estiver ligado, nenhuma linha vaza mesmo com o `GRANT` — a política padrão nega tudo para quem não tem policy. Mas é preciso confirmar. Rode no **SQL Editor** do Supabase:

```sql
-- RLS, permissão da chave pública e políticas, tabela a tabela
select
  c.relname                                         as tabela,
  c.relrowsecurity                                  as rls_ligado,
  has_table_privilege('anon', c.oid, 'select')      as anon_pode_ler,
  (select count(*) from pg_policies p
    where p.schemaname = 'public' and p.tablename = c.relname) as policies
from pg_class c
where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
order by c.relname;

-- O seed foi aplicado?
select
  (select count(*) from subjects) as disciplinas,  -- esperado: 9
  (select count(*) from modules)  as modulos,      -- esperado: 5
  (select count(*) from topics)   as topicos;      -- esperado: 28
```

O esperado é `rls_ligado = true` e `anon_pode_ler = false` nas 16 tabelas. Se `anon_pode_ler` vier `true`, basta reaplicar o trecho de `REVOKE` da migração de segurança.

---

## 7. Plano de integração

### Etapa A — Fundação visual
1. Traduzir os tokens para o Tailwind 4: bloco `@theme` com as cores, sombras e fontes; `@custom-variant dark`; utilitários para os dois gradientes; `@plugin "@tailwindcss/typography"`; classe `.cacd-ruled-paper`. Incluir o `emerald-600` que falta.
2. `layout.tsx` com as três fontes, script anti-flash de tema e menu mobile.
3. Renomear `src/components/economia/` → `src/components/economics/`, alinhando com o guia e com os imports dos artefatos. Adaptar o `CausalGraphTranslator` ao modo Pergaminho (item 2 do plano de ação do guia).

### Etapa B — Componentes sem dados falsos
4. Mover os 11 arquivos para os destinos como `.tsx`, corrigindo imports.
5. Remover todo dado inventado; estados vazios honestos; sidebar e header lendo dados reais.
6. Implementar a trava: derivar `locked` dos pré-requisitos e bloquear o acesso direto por URL.

### Etapa C — Fechar o ciclo
7. Rotas `/api/tutor/chat`, `/api/tps/attempt`, `/api/essay/evaluate` e `/api/flashcards`, com validação Zod da entrada.
8. Páginas que o menu promete: `/tps` (com o `TPSArena` do PDF), `/discursivas`, `/caderno-de-erros`, `/revisao` (com `ts-fsrs`).
9. Upload da folha manuscrita direto para o Storage.

### Etapa D — Dados e documentação
10. Seed de questões com a procedência correta; importador com o embedding corrigido, caminho certo e sem arquivamento silencioso.
11. Atualizar os dois guias para os caminhos reais — ou fundi-los no `AGENTS.md`, que é o que os agentes de fato carregam.

As Etapas A e B não dependem de chave nenhuma. A Etapa C precisa da `GEMINI_API_KEY` para ser testada de verdade.

---

## 8. Decisões que dependem de você

1. **As 6 questões e a discursiva do seed são transcrição da prova real?** Se não forem, entram como geradas por IA, sem ano nem banca.
2. **Os 3 mascotes:** usar ou descartar? Se forem para dar rosto ao Tutor, vale registrar isso como exceção explícita à regra 5 do guia.
3. **Status do tópico:** calculado pelo sistema (recomendado) ou ajustável à mão?
4. **Chaves:** preencher `SUPABASE_SERVICE_ROLE_KEY` e `GEMINI_API_KEY` no `.env.local`.
