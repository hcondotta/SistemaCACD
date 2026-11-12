import { z } from "zod";

// 1. Contrato do Tutor IA (RAG Estrito sem Alucinação)
export const TutorResponseSchema = z.object({
  direct_answer_md: z.string().describe("Resposta didática estruturada em Markdown"),
  base_analogy: z.string().optional().describe("Analogia intuitiva caso a dúvida envolva gráfico ou modelo matemático"),
  causal_chain_summary: z.array(z.string()).describe("Passo a passo da cadeia de causa e efeito (Ex: ['Aumento de G', 'Juros sobem', 'Câmbio aprecia'])"),
  citations_used: z.array(
    z.object({
      citation_label: z.string(),
      doc_title: z.string(),
      exact_quote_or_concept: z.string(),
    })
  ),
  suggested_flashcard: z.object({
    front_prompt: z.string(),
    back_answer: z.string(),
  }).optional(),
});

export type TutorResponse = z.infer<typeof TutorResponseSchema>;

// 2. Contrato de Avaliação de Esqueleto de Discursiva (Estágio 1)
export const EssaySkeletonEvaluationSchema = z.object({
  covers_all_prompt_commands: z.boolean(),
  causal_coherence_score: z.number().min(0).max(10),
  paragraph_feedbacks: z.array(
    z.object({
      paragraph_number: z.number(),
      status: z.enum(["solido", "incompleto", "desvio_causal"]),
      critique: z.string(),
      missing_concepts: z.array(z.string()),
      suggested_source_anchor: z.string(),
    })
  ),
  recommended_adjustments: z.string(),
});

export type EssaySkeletonEvaluation = z.infer<typeof EssaySkeletonEvaluationSchema>;

// 3. Contrato de Correção Completa de Discursiva de 60 a 90 Linhas (Estágio 3)
export const FullEssayGradingSchema = z.object({
  transcribed_text: z.string().describe("Texto integral da resposta (transcrito via OCR se enviado por foto)"),
  estimated_line_count: z.number(),
  command_breakdown: z.array(
    z.object({
      command_id: z.string(),
      max_points: z.number(),
      awarded_points: z.number(),
      present_elements: z.array(z.string()),
      omitted_elements: z.array(z.string()),
      rag_grounding_reference: z.string(),
    })
  ),
  total_content_score: z.number(),
  grammar_errors_count: z.number(),
  language_penalty_applied: z.number(),
  final_net_score: z.number(),
  paragraph_reviews: z.array(
    z.object({
      paragraph_index: z.number(),
      original_excerpt: z.string(),
      diagnostic: z.string(),
      diplomatic_rewrite: z.string(),
    })
  ),
  auto_flashcards_from_omissions: z.array(
    z.object({
      front_prompt: z.string(),
      back_answer: z.string(),
    })
  ),
});

export type FullEssayGrading = z.infer<typeof FullEssayGradingSchema>;

// 4. Diagnóstico Automático para o Caderno de Erros do TPS
export const ErrorNotebookDiagnosisSchema = z.object({
  root_cause: z.enum([
    "base_gap",
    "causal_graph_confusion",
    "historical_fact_swap",
    "wording_trap",
    "rushed_reading",
  ]),
  ai_diagnosis: z.string().describe("Explicação curta e direta da regra que a aluna confundiu"),
  remedial_flashcard: z.object({
    front_prompt: z.string(),
    back_answer: z.string(),
  }),
});