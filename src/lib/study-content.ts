import { z } from "zod";

/**
 * Validação, na fronteira com o banco, dos JSONs gerados pela fábrica de
 * conteúdo (pegadinhas, repertório e modelos causais).
 *
 * Esses campos vêm de saída de IA e podem chegar malformados. Um item inválido
 * é descartado — o loader registra o descarte no log do servidor —, em vez de
 * derrubar a página inteira do tópico.
 */

// ----------------------------------------------------------------------------
// Ficha em duas camadas
// ----------------------------------------------------------------------------

const TpsTrapSchema = z.object({
  wrong_claim: z.string().min(1),
  truth_mechanism: z.string().min(1),
  // O content_factory.py grava trap_category; o contrato original do PDF usava trap_type.
  trap_category: z.string().optional(),
  trap_type: z.string().optional(),
});

const RepertoireItemSchema = z.object({
  author_or_source: z.string().min(1),
  core_thesis: z.string().min(1),
  historical_data_or_milestone: z.string().min(1),
});

const LessonRowSchema = z.object({
  base_intuition_md: z.string(),
  cacd_deep_dive_md: z.string(),
  tps_traps_json: z.unknown(),
  essay_repertoire_json: z.unknown(),
});

export interface TpsTrap {
  wrongClaim: string;
  truthMechanism: string;
  category: string | null;
}

export interface RepertoireItem {
  authorOrSource: string;
  coreThesis: string;
  historicalMilestone: string;
}

export interface LessonContent {
  baseIntuitionMd: string;
  cacdDeepDiveMd: string;
  tpsTraps: TpsTrap[];
  essayRepertoire: RepertoireItem[];
}

function parseList<T>(value: unknown, schema: z.ZodType<T>): T[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const parsed = schema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

/** Lança se as duas camadas de texto (NOT NULL no banco) não forem strings. */
export function parseLessonContent(row: unknown): LessonContent {
  const lesson = LessonRowSchema.parse(row);
  return {
    baseIntuitionMd: lesson.base_intuition_md,
    cacdDeepDiveMd: lesson.cacd_deep_dive_md,
    tpsTraps: parseList(lesson.tps_traps_json, TpsTrapSchema).map((trap) => ({
      wrongClaim: trap.wrong_claim,
      truthMechanism: trap.truth_mechanism,
      category: trap.trap_category ?? trap.trap_type ?? null,
    })),
    essayRepertoire: parseList(lesson.essay_repertoire_json, RepertoireItemSchema).map((item) => ({
      authorOrSource: item.author_or_source,
      coreThesis: item.core_thesis,
      historicalMilestone: item.historical_data_or_milestone,
    })),
  };
}

// ----------------------------------------------------------------------------
// Modelos causais do Tradutor de Gráficos
// ----------------------------------------------------------------------------

const CausalStepSchema = z.object({
  step: z.number().int(),
  curve: z.enum(["IS", "LM", "BP", "CAMBIO"]),
  shift: z.string(),
  title: z.string(),
  mechanism: z.string(),
});

const CausalModelRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  model_family: z.string(),
  scenario_title: z.string(),
  context_parameters: z.record(z.string(), z.string()),
  causal_chain_steps: z.array(CausalStepSchema).min(1),
  bp_impact_summary: z.string().nullable(),
  model_essay_paragraph: z.string(),
});

export type CausalStep = z.infer<typeof CausalStepSchema>;
export type CausalModelData = z.infer<typeof CausalModelRowSchema>;

export function parseCausalModels(rows: unknown[]): CausalModelData[] {
  return rows.flatMap((row) => {
    const parsed = CausalModelRowSchema.safeParse(row);
    if (!parsed.success) return [];
    const steps = [...parsed.data.causal_chain_steps].sort((a, b) => a.step - b.step);
    return [{ ...parsed.data, causal_chain_steps: steps }];
  });
}
