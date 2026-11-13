"use server";

import { revalidatePath } from "next/cache";
import { questionNumberFromSectionTitle } from "@/lib/acervo";
import { AssignSectionTopicSchema } from "@/lib/schemas/api-requests";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/server-clients";

/**
 * Organização do acervo (área de manutenção). Mesma postura de `study-actions.ts`: entrada
 * validada com Zod, erro detalhado só no log e mensagem curta para a tela.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function assignSectionTopic(input: unknown): Promise<ActionResult> {
  const parsed = AssignSectionTopicSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Seção ou tópico inválido." };
  if (!isSupabaseConfigured()) return { ok: false, error: "O banco de dados não está configurado." };
  const { sectionId, topicId } = parsed.data;

  try {
    const supabase = getSupabaseAdmin();
    const { data: section, error: sectionError } = await supabase
      .from("document_sections")
      .select("id, source_document_id, position, title, source_documents!inner(doc_type)")
      .eq("id", sectionId)
      .maybeSingle();
    if (sectionError) throw sectionError;
    if (!section) return { ok: false, error: "Essa seção não existe mais no acervo." };

    if (topicId) {
      const { data: topic, error: topicError } = await supabase.from("topics").select("id").eq("id", topicId).maybeSingle();
      if (topicError) throw topicError;
      if (!topic) return { ok: false, error: "Esse tópico não existe na trilha." };
    }

    // 'manual' faz a escolha sobreviver a uma nova extração do mesmo arquivo.
    const { error: updateError } = await supabase
      .from("document_sections")
      .update({ topic_id: topicId, topic_assigned_by: "manual" })
      .eq("id", sectionId);
    if (updateError) throw updateError;

    // Os trechos da busca acompanham a seção de onde saíram.
    const { error: chunksError } = await supabase
      .from("document_chunks")
      .update({ topic_id: topicId })
      .eq("source_document_id", section.source_document_id)
      .eq("metadata->>section_position", String(section.position));
    if (chunksError) throw chunksError;

    // Numa prova, a questão leva junto os itens que ela vai treinar no TPS.
    const documentInfo = section.source_documents as unknown as { doc_type: string };
    const questionNumber = questionNumberFromSectionTitle(section.title);
    if (documentInfo.doc_type === "past_exam" && questionNumber !== null) {
      const { data: stem, error: stemError } = await supabase
        .from("tps_question_stems")
        .select("id")
        .eq("source_document_id", section.source_document_id)
        .eq("question_number", questionNumber)
        .maybeSingle();
      if (stemError) throw stemError;
      if (stem) {
        const { error: itemsError } = await supabase.from("tps_items").update({ topic_id: topicId }).eq("stem_id", stem.id);
        if (itemsError) throw itemsError;
      }
    }
  } catch (error) {
    console.error("[acervo-actions:assignSectionTopic]", error);
    return { ok: false, error: "Não foi possível salvar o tópico agora. Tente de novo." };
  }

  revalidatePath("/acervo", "layout");
  revalidatePath("/economia", "layout");
  return { ok: true };
}
