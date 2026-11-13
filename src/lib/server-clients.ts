import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

/**
 * Clientes de servidor do projeto.
 *
 * Os clientes são criados sob demanda (lazy), nunca no topo do módulo. Isso é
 * deliberado: o Next.js avalia módulos durante o build, e um `throw` por
 * variável de ambiente ausente quebraria `npm run build` numa máquina que ainda
 * não tem o `.env.local` configurado.
 *
 * IMPORTANTE: estes clientes usam a SERVICE ROLE KEY e portanto ignoram o RLS.
 * Só podem ser importados em Server Components, Route Handlers e scripts de
 * servidor — nunca em código marcado com "use client".
 */

const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
const SUPABASE_KEY_ENV = "SUPABASE_SERVICE_ROLE_KEY";
const GEMINI_KEY_ENV = "GEMINI_API_KEY";

/**
 * Modelo de embedding oficial do projeto.
 *
 * O antigo `text-embedding-004` produz apenas 768 dimensões e foi descontinuado:
 * o parâmetro `outputDimensionality` usa Matryoshka para TRUNCAR para baixo,
 * nunca para expandir. Pedir 1536 dele é um erro garantido contra a coluna
 * `vector(1536)` do schema.
 */
export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 1536;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variável de ambiente ausente: ${name}. Copie .env.example para .env.local e preencha.`,
    );
  }
  return value;
}

/** Trechos dos valores de exemplo do .env.example, que não são chaves de verdade. */
const PLACEHOLDER_MARKERS = ["seu-projeto", "sua-chave"];

function hasRealValue(name: string): boolean {
  const value = process.env[name]?.trim();
  if (!value) return false;
  return !PLACEHOLDER_MARKERS.some((marker) => value.includes(marker));
}

/**
 * Permite que páginas renderizem um estado de "não configurado" em vez de
 * quebrar. Valores copiados do .env.example contam como não configurados:
 * tentar conectar com eles só produziria um erro de chave inválida.
 */
export function isSupabaseConfigured(): boolean {
  return hasRealValue(SUPABASE_URL_ENV) && hasRealValue(SUPABASE_KEY_ENV);
}

export function isGeminiConfigured(): boolean {
  return hasRealValue(GEMINI_KEY_ENV);
}

let cachedSupabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!cachedSupabaseAdmin) {
    cachedSupabaseAdmin = createClient(
      requireEnv(SUPABASE_URL_ENV),
      requireEnv(SUPABASE_KEY_ENV),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return cachedSupabaseAdmin;
}

let cachedAiClient: GoogleGenAI | null = null;

export function getAiClient(): GoogleGenAI {
  if (!cachedAiClient) {
    cachedAiClient = new GoogleGenAI({ apiKey: requireEnv(GEMINI_KEY_ENV) });
  }
  return cachedAiClient;
}

/**
 * Normaliza o vetor para norma L2 = 1.
 *
 * O `gemini-embedding-001` só entrega vetores pré-normalizados em 3072
 * dimensões. Em 1536 (nosso caso) a normalização é responsabilidade do cliente,
 * e sem ela a distância de cosseno do pgvector fica distorcida — o RAG degrada
 * em silêncio, sem erro nenhum.
 */
export function normalizeL2(vector: number[]): number[] {
  let sumOfSquares = 0;
  for (const value of vector) {
    sumOfSquares += value * value;
  }
  const magnitude = Math.sqrt(sumOfSquares);
  if (magnitude === 0) {
    throw new Error("Embedding degenerado: vetor de norma zero.");
  }
  return vector.map((value) => value / magnitude);
}

/** Gera o embedding normalizado de um texto, pronto para gravar ou consultar no pgvector. */
export async function generateQueryEmbedding(text: string): Promise<number[]> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Texto vazio: não há o que vetorizar.");
  }

  const response = await getAiClient().models.embedContent({
    model: EMBEDDING_MODEL,
    contents: trimmed,
    config: { outputDimensionality: EMBEDDING_DIMENSIONS },
  });

  const values = response.embeddings?.[0]?.values;
  if (!values) {
    throw new Error("A API de embeddings não retornou vetor algum.");
  }
  if (values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Dimensão inesperada: a coluna do banco espera ${EMBEDDING_DIMENSIONS}, o modelo devolveu ${values.length}.`,
    );
  }

  return normalizeL2(values);
}
