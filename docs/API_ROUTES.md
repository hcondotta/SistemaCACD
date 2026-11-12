# Especificação das Rotas de API Next.js (App Router)

## 1. Rota `/api/tutor/chat` (POST) — Tutor RAG Híbrido Estrito
**Objetivo:** Responder dúvidas da aluna consultando exclusivamente o acervo confiável (`document_chunks`) via busca híbrida RRF.

### Fluxo de Execução:
1. Recebe `{ question: string, subjectId: string, topicId?: string, learningLayer: 'base' | 'cacd' }`.
2. Gera o vetor da pergunta com `gemini-embedding-001` (`outputDimensionality: 1536`, normalizado em L2) — use sempre `generateQueryEmbedding` de `src/lib/server-clients.ts`, nunca chame a API de embeddings direto.
3. Executa `supabase.rpc('hybrid_search_chunks', { query_text: question, query_embedding: vector, filter_subject_id: subjectId, filter_topic_id: topicId, match_count: 8 })`.
4. Envia os chunks recuperados ao `gemini-2.5-pro` exigindo resposta JSON validada por `TutorResponseSchema`.

### System Prompt Obrigatório:
> Você é o Tutor de Economia exclusivo para o CACD.
> REGRA DE OURO: Responda APENAS com base nos BLOCOS DE ACERVO CONFIÁVEL fornecidos no contexto. Se a informação não constar nos blocos, declare explicitamente que o ponto não está coberto nas fontes carregadas.
> Se `learningLayer = 'base'`, comece com uma explicação intuitiva (Base Zero), destrinchando o significado das variáveis e o movimento das curvas antes de introduzir o jargão técnico.
> Sempre preencha `causal_chain_summary` com os elos exatos de causa e efeito (ex: "Choque Fiscal -> Elevação de Juros Domésticos -> Influxo na Conta Financeira -> Apreciação Cambial -> Queda nas Exportações Líquidas").

## 2. Rota `/api/tps/attempt` (POST) — Julgamento de Item + Caderno de Erros Automático
**Objetivo:** Registrar a resposta da aluna no TPS e, caso ela erre ou marque confiança `doubt` ou `guess`, alimentar automaticamente a tabela `error_notebook` e criar um flashcard FSRS.

### Fluxo de Execução:
1. Recebe `{ itemId: string, selectedAnswer: 'C' | 'E' | 'B', confidence: 'certain' | 'doubt' | 'guess', timeSpentSeconds: number }`.
2. Busca o `tps_items` correspondente no banco e verifica `is_correct = (selectedAnswer === official_answer)`.
3. Insere o registro em `tps_attempts`.
4. **Gatilho do Caderno de Erros:** Se `selectedAnswer !== 'B'` e (`!is_correct` OU `confidence !== 'certain'`):
   - Chama `gemini-2.5-flash` com o enunciado, o gabarito comentado e a resposta marcada pela aluna, validando pelo schema `ErrorNotebookDiagnosisSchema`.
   - Faz `upsert` na tabela `error_notebook` (incrementando `error_count` se já existir).
   - Insere automaticamente o `remedial_flashcard` na tabela `flashcards` com `origin = 'error_notebook'`.

## 3. Rota `/api/essay/evaluate` (POST) — Oficina de Discursivas (Esqueleto + Simulado 90 Linhas + OCR)
**Objetivo:** Avaliar tanto o Modo Esqueleto quanto o Modo Simulado de 3ª Fase (aceitando texto digitado ou foto da folha manuscrita em base64/URL).

### Fluxo de Execução:
1. Recebe `{ promptId: string, stageMode: 'skeleton_only' | 'guided_writing' | 'full_simulation', outlineJson?: any, contentText?: string, handwrittenImageBase64?: string }`.
2. Busca os dados da questão em `essay_prompts` (incluindo `commands_json` e `grading_rubric_json`).
3. Executa `hybrid_search_chunks` usando o título e comandos da questão para trazer os trechos dos livros e fichamentos da aluna sobre o tema.
4. Se `stageMode === 'skeleton_only'`, valida com `EssaySkeletonEvaluationSchema`.
5. Se `stageMode === 'full_simulation'`:
   - Se houver `handwrittenImageBase64`, passa a imagem como parte multimodal para o `gemini-2.5-pro` transcrever fielmente a caligrafia antes de corrigir.
   - Avalia cada subcomando contra o espelho e contra o acervo RAG (`FullEssayGradingSchema`).
   - Salva o resultado em `essay_submissions` e insere automaticamente os `auto_flashcards_from_omissions` na tabela `flashcards` com `origin = 'essay_feedback'`.
---

## 4. Regras obrigatórias para TODAS as rotas

Estas regras valem para `/api/tutor/chat`, `/api/tps/attempt`, `/api/essay/evaluate` e qualquer rota futura.

### 4.1 Validação da ENTRADA com Zod (não apenas da saída da IA)
Os fluxos acima descrevem a validação do JSON devolvido pelo Gemini. Isso não basta: o corpo da requisição também precisa de um schema Zod em `src/lib/schemas/api-requests.ts`, aplicado com `safeParse` antes de qualquer consulta ao banco ou chamada de IA. Requisição inválida responde `400` com a lista de campos problemáticos — nunca segue adiante.

### 4.2 Nunca vazar `error.message` ao cliente
O padrão `catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }) }` expõe detalhes internos (nomes de tabela, chaves, stack do Postgres). O correto: registrar o erro completo no servidor com `console.error` e devolver ao cliente uma mensagem genérica mais um `requestId` para correlação.

### 4.3 Compatibilidade do `responseSchema` com o Gemini
O Gemini aceita apenas um subconjunto do OpenAPI 3.0. O projeto usa **Zod 4**, que já traz `z.toJSONSchema()` nativo — `zod-to-json-schema` NÃO é dependência deste projeto. Ainda assim a saída crua não serve: `$schema`, `$ref` e `additionalProperties` precisam ser removidos, e `z.optional()` produz `anyOf`, que o Gemini rejeita. Toda conversão passa por um helper único em `src/lib/gemini-schema.ts`, que gera o JSON Schema e o limpa. Ao escrever esse helper (Fase 2), confira a assinatura de `z.toJSONSchema` contra a versão de Zod instalada e cubra-o com um teste que valide o schema de cada contrato de `ai-contracts.ts`.

### 4.4 Teto de custo
`gemini-2.5-pro` só em raciocínio analítico pesado (correção de discursiva, síntese de trilha). Diagnóstico de erro de TPS e tira-dúvidas curto usam `gemini-2.5-flash`. Toda rota de IA respeita um limite de requisições por minuto configurado em `src/lib/rate-limit.ts`.
