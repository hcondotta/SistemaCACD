"use server";

import { revalidatePath } from "next/cache";
import { loadTopicLockState } from "@/lib/data/study-data";
import { AdvanceTopicProgressSchema, SaveTutorFlashcardSchema } from "@/lib/schemas/api-requests";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/server-clients";
import { advanceStatus, deriveTopicStatus, type MasteryStatus } from "@/lib/trail";

/**
 * Server actions de estudo. Cada uma valida a entrada com Zod, revalida a trava
 * no servidor (a interface nunca é a única barreira) e registra o erro completo
 * no log — o cliente recebe apenas uma mensagem curta.
 *
 * Atenção: enquanto o app não tiver login (previsto para o deploy), estas
 * actions aceitam chamadas de qualquer visitante, como o restante do app.
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function advanceTopicProgress(input: unknown): Promise<ActionResult<{ status: MasteryStatus }>> {
  const parsed = AdvanceTopicProgressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requisição inválida." };
  if (!isSupabaseConfigured()) return { ok: false, error: "Banco de dados não configurado." };

  const { topicId, checkpoint } = parsed.data;

  try {
    const lockState = await loadTopicLockState(topicId);
    if (!lockState.found) return { ok: false, error: "Tópico não encontrado." };

    const current = deriveTopicStatus(lockState.storedStatus, lockState.prerequisiteStatuses);
    if (current === "locked") {
      return { ok: false, error: "Tópico bloqueado: conclua a Camada 1 dos pré-requisitos primeiro." };
    }

    const next = advanceStatus(current, checkpoint);
    if (next !== current) {
      const now = new Date().toISOString();
      const { error } = await getSupabaseAdmin()
        .from("topic_progress")
        .upsert({ topic_id: topicId, status: next, last_studied_at: now, updated_at: now }, { onConflict: "topic_id" });
      if (error) throw error;
      revalidatePath("/", "layout");
    }

    return { ok: true, data: { status: next } };
  } catch (error) {
    console.error("[advanceTopicProgress]", error);
    return { ok: false, error: "Não foi possível registrar o avanço agora. Tente de novo." };
  }
}

export async function saveTutorFlashcard(input: unknown): Promise<ActionResult<{ flashcardId: string }>> {
  const parsed = SaveTutorFlashcardSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Flashcard inválido." };
  if (!isSupabaseConfigured()) return { ok: false, error: "Banco de dados não configurado." };

  const { topicId, frontPrompt, backAnswer } = parsed.data;

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("flashcards")
      // "manual": foi a aluna quem decidiu guardar o card sugerido pelo Tutor.
      .insert({ topic_id: topicId, origin: "manual", front_prompt: frontPrompt, back_answer: backAnswer })
      .select("id")
      .single();
    if (error) throw error;

    revalidatePath("/", "layout");
    return { ok: true, data: { flashcardId: (data as { id: string }).id } };
  } catch (error) {
    console.error("[saveTutorFlashcard]", error);
    return { ok: false, error: "Não foi possível salvar o flashcard agora." };
  }
}
