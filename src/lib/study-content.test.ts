import { describe, expect, it } from "vitest";
import { parseCausalModels, parseLessonContent } from "./study-content";

function lessonRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "lesson-1",
    topic_id: "topic-1",
    base_intuition_md: "## Intuição",
    cacd_deep_dive_md: "## Rigor CACD",
    tps_traps_json: [],
    essay_repertoire_json: [],
    updated_at: "2026-11-12T00:00:00Z",
    ...overrides,
  };
}

// Espelha a linha real semeada em supabase/seed.sql (cenário Mundell-Fleming).
function causalModelRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "model-1",
    topic_id: "topic-33",
    slug: "mf-flutuante-perfeita-exp-fiscal",
    model_family: "Mundell-Fleming",
    scenario_title: "Expansão Fiscal sob Câmbio Flutuante e Perfeita Mobilidade de Capitais",
    context_parameters: { regime_cambial: "flutuante", mobilidade_capital: "perfeita", choque: "fiscal_expansivo" },
    causal_chain_steps: [
      { step: 1, curve: "IS", shift: "direita", title: "Choque Fiscal Inicial", mechanism: "G sobe." },
      { step: 2, curve: "CAMBIO", shift: "apreciacao", title: "Apreciação", mechanism: "Capitais entram." },
    ],
    graph_config: { xAxis: "Renda (Y)", yAxis: "Juros (i)" },
    bp_impact_summary: "Superávit na Conta Financeira compensado pela Balança Comercial.",
    model_essay_paragraph: "Sob a ótica do modelo Mundell-Fleming...",
    created_at: "2026-11-12T00:00:00Z",
    ...overrides,
  };
}

describe("parseLessonContent", () => {
  it("aceita trap_type como sinônimo de trap_category", () => {
    const lesson = parseLessonContent(
      lessonRow({
        tps_traps_json: [{ wrong_claim: "A", truth_mechanism: "B", trap_type: "Inversão Causal" }],
      }),
    );
    expect(lesson.tpsTraps).toEqual([
      { wrongClaim: "A", truthMechanism: "B", category: "Inversão Causal" },
    ]);
  });

  it("descarta pegadinhas malformadas e mantém as válidas", () => {
    const lesson = parseLessonContent(
      lessonRow({
        tps_traps_json: [
          { wrong_claim: "A", truth_mechanism: "B", trap_category: "Troca Conceitual" },
          { wrong_claim: "sem mecanismo" },
          "texto solto",
        ],
      }),
    );
    expect(lesson.tpsTraps).toEqual([
      { wrongClaim: "A", truthMechanism: "B", category: "Troca Conceitual" },
    ]);
  });

  it("trata JSON que não é lista como lista vazia", () => {
    const lesson = parseLessonContent(lessonRow({ tps_traps_json: null, essay_repertoire_json: {} }));
    expect(lesson.tpsTraps).toEqual([]);
    expect(lesson.essayRepertoire).toEqual([]);
  });

  it("converte o repertório para os nomes usados na interface", () => {
    const lesson = parseLessonContent(
      lessonRow({
        essay_repertoire_json: [
          {
            author_or_source: "Celso Furtado",
            core_thesis: "Socialização das perdas",
            historical_data_or_milestone: "Convênio de Taubaté (1906)",
          },
        ],
      }),
    );
    expect(lesson.essayRepertoire).toEqual([
      {
        authorOrSource: "Celso Furtado",
        coreThesis: "Socialização das perdas",
        historicalMilestone: "Convênio de Taubaté (1906)",
      },
    ]);
  });
});

describe("parseCausalModels", () => {
  it("mantém o modelo semeado, com os passos na ordem", () => {
    const [model] = parseCausalModels([causalModelRow()]);
    expect(model.slug).toBe("mf-flutuante-perfeita-exp-fiscal");
    expect(model.causal_chain_steps.map((s) => s.curve)).toEqual(["IS", "CAMBIO"]);
  });

  it("descarta modelo com curva desconhecida em vez de quebrar o gráfico", () => {
    const models = parseCausalModels([
      causalModelRow(),
      causalModelRow({
        id: "model-2",
        slug: "modelo-quebrado",
        causal_chain_steps: [{ step: 1, curve: "XYZ", shift: "?", title: "?", mechanism: "?" }],
      }),
    ]);
    expect(models.map((m) => m.slug)).toEqual(["mf-flutuante-perfeita-exp-fiscal"]);
  });
});
