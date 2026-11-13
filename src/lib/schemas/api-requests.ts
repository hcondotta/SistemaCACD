import { z } from "zod";

/**
 * Schemas de ENTRADA de server actions e rotas de API.
 *
 * Todo corpo de requisição passa por `safeParse` antes de tocar o banco ou a
 * IA (docs/API_ROUTES.md, seção 4.1). A validação da SAÍDA da IA fica em
 * `ai-contracts.ts`.
 */

/**
 * Marcos de estudo que a aluna registra no Estúdio do Tópico. A maestria não
 * está aqui de propósito: ela é calculada pelo desempenho, nunca declarada.
 */
export const AdvanceTopicProgressSchema = z.object({
  topicId: z.uuid(),
  checkpoint: z.enum(["camada_base_concluida", "camada_cacd_concluida"]),
});

export type AdvanceTopicProgressInput = z.infer<typeof AdvanceTopicProgressSchema>;

/** Flashcard sugerido pelo Tutor que a aluna decide guardar na fila FSRS. */
export const SaveTutorFlashcardSchema = z.object({
  topicId: z.uuid(),
  frontPrompt: z.string().trim().min(1).max(500),
  backAnswer: z.string().trim().min(1).max(2000),
});

export type SaveTutorFlashcardInput = z.infer<typeof SaveTutorFlashcardSchema>;

/** Organização do acervo: ligar (ou desligar, com null) uma seção a um tópico da trilha. */
export const AssignSectionTopicSchema = z.object({
  sectionId: z.uuid(),
  topicId: z.uuid().nullable(),
});
export type AssignSectionTopicInput = z.infer<typeof AssignSectionTopicSchema>;
