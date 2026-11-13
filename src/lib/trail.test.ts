import { describe, expect, it } from "vitest";
import {
  advanceStatus,
  buildTrailModules,
  computeNetTpsAccuracy,
  deriveTopicStatus,
  resolveDiplomaticRank,
  summarizeTopics,
  type MasteryStatus,
  type ModuleRow,
  type ProgressRow,
  type TopicRow,
} from "./trail";

// ----------------------------------------------------------------------------
// Utilitários de teste: linhas completas, com todas as colunas que o banco
// devolve, para que um campo omitido não passe despercebido.
// ----------------------------------------------------------------------------
function topicRow(
  id: string,
  moduleId: string,
  code: string,
  title: string,
  pedagogicalOrder: number,
): TopicRow {
  return {
    id,
    module_id: moduleId,
    code,
    official_edital_ref: "Ponto 4",
    title,
    pedagogical_order: pedagogicalOrder,
    estimated_minutes: 120,
    is_critical_for_essay: true,
    created_at: "2026-11-12T00:00:00Z",
  };
}

function progressRow(topicId: string, status: MasteryStatus): ProgressRow {
  return {
    topic_id: topicId,
    status,
    tps_accuracy_rate: 0,
    essay_readiness_score: 0,
    last_studied_at: null,
    updated_at: "2026-11-12T00:00:00Z",
  };
}

describe("deriveTopicStatus", () => {
  it("tópico sem pré-requisitos e sem progresso fica disponível", () => {
    expect(deriveTopicStatus(undefined, [])).toBe("available");
  });

  it("preserva o progresso gravado quando os pré-requisitos estão cumpridos", () => {
    expect(deriveTopicStatus("studying_advanced", ["reviewing"])).toBe("studying_advanced");
  });

  it("bloqueia quando o pré-requisito só foi iniciado (Camada 1 ainda não concluída)", () => {
    expect(deriveTopicStatus(undefined, ["studying_base"])).toBe("locked");
  });

  it("libera quando o pré-requisito concluiu a Camada 1", () => {
    expect(deriveTopicStatus(undefined, ["studying_advanced"])).toBe("available");
  });

  it("bloqueia se QUALQUER pré-requisito estiver pendente, mesmo com os demais cumpridos", () => {
    expect(deriveTopicStatus(undefined, ["mastered", "reviewing", undefined])).toBe("locked");
  });

  it("nunca esconde atrás da trava um estudo já iniciado", () => {
    expect(deriveTopicStatus("studying_base", [undefined])).toBe("studying_base");
  });

  it("um 'available' gravado não é progresso e continua sujeito à trava", () => {
    expect(deriveTopicStatus("available", [undefined])).toBe("locked");
  });

  it("um 'locked' gravado e obsoleto é recalculado quando os pré-requisitos foram cumpridos", () => {
    expect(deriveTopicStatus("locked", ["mastered"])).toBe("available");
  });
});

describe("advanceStatus", () => {
  it.each([
    ["available", "camada_base_concluida", "studying_advanced"],
    ["studying_base", "camada_base_concluida", "studying_advanced"],
    ["studying_advanced", "camada_cacd_concluida", "reviewing"],
    ["available", "camada_cacd_concluida", "reviewing"],
    ["reviewing", "camada_base_concluida", "reviewing"],
    ["mastered", "camada_cacd_concluida", "mastered"],
  ] as const)("%s + %s → %s", (current, checkpoint, expected) => {
    expect(advanceStatus(current, checkpoint)).toBe(expected);
  });

  it("recusa avançar um tópico bloqueado", () => {
    expect(() => advanceStatus("locked", "camada_base_concluida")).toThrow(/bloqueado/i);
  });
});

describe("resolveDiplomaticRank", () => {
  it.each([
    ["locked", null, null],
    ["available", null, null],
    ["studying_base", null, "terceiro_secretario"],
    ["studying_advanced", null, "segundo_secretario"],
    ["reviewing", null, "primeiro_secretario"],
    ["reviewing", 74.9, "primeiro_secretario"],
    ["reviewing", 75, "conselheiro"],
    ["mastered", null, "embaixador"],
  ] as const)("%s com acerto %s → %s", (status, accuracy, expected) => {
    expect(resolveDiplomaticRank(status, accuracy)).toBe(expected);
  });
});

describe("computeNetTpsAccuracy", () => {
  it("sem itens respondidos não há escore — null, não zero", () => {
    expect(computeNetTpsAccuracy({ answered: 0, correct: 0, blank: 0 })).toBeNull();
  });

  it("cada erro anula um acerto, e itens em branco entram no denominador", () => {
    // 7 certos, 1 em branco, 2 errados: (7 - 2) / 10 = 50%
    expect(computeNetTpsAccuracy({ answered: 10, correct: 7, blank: 1 })).toBe(50);
  });

  it("pode ser negativo quando os erros superam os acertos", () => {
    expect(computeNetTpsAccuracy({ answered: 4, correct: 0, blank: 0 })).toBe(-100);
  });

  it("arredonda para uma casa decimal", () => {
    // 2 certos, 1 errado: 1 / 3 = 33,33...%
    expect(computeNetTpsAccuracy({ answered: 3, correct: 2, blank: 0 })).toBe(33.3);
  });
});

describe("summarizeTopics", () => {
  it("separa teoria concluída, estudo em andamento e tópicos bloqueados", () => {
    const summary = summarizeTopics([
      { status: "mastered" },
      { status: "reviewing" },
      { status: "studying_advanced" },
      { status: "studying_base" },
      { status: "available" },
      { status: "locked" },
      { status: "locked" },
    ]);
    expect(summary).toEqual({ total: 7, theoryDone: 2, inProgress: 2, locked: 2 });
  });
});

describe("buildTrailModules", () => {
  // Recorte real do seed: Mundell-Fleming (3.3) exige IS-LM (2.4),
  // Balanço de Pagamentos (3.1) e Câmbio (3.2). Linhas fora de ordem de propósito.
  const modules: ModuleRow[] = [
    {
      id: "m3",
      subject_id: "econ",
      code: "MOD-3",
      title: "Economia Internacional",
      description: null,
      pedagogical_order: 3,
    },
    {
      id: "m2",
      subject_id: "econ",
      code: "MOD-2",
      title: "Macroeconomia",
      description: "IS-LM",
      pedagogical_order: 2,
    },
  ];
  const topics: TopicRow[] = [
    topicRow("t33", "m3", "3.3", "Mundell-Fleming", 18),
    topicRow("t31", "m3", "3.1", "Balanço de Pagamentos", 16),
    topicRow("t32", "m3", "3.2", "Câmbio", 17),
    topicRow("t24", "m2", "2.4", "IS-LM", 13),
    topicRow("hb1", "mod-historia", "1.1", "Brasil Colônia", 1),
  ];
  const prerequisites = [
    { topic_id: "t33", prerequisite_topic_id: "t24" },
    { topic_id: "t33", prerequisite_topic_id: "t31" },
    { topic_id: "t33", prerequisite_topic_id: "t32" },
  ];
  const progress = [progressRow("t24", "reviewing"), progressRow("t31", "studying_advanced")];

  const buildFixtureTrail = () => buildTrailModules({ modules, topics, prerequisites, progress });

  it("ordena módulos e tópicos pela ordem pedagógica", () => {
    const trail = buildFixtureTrail();
    expect(trail.map((m) => m.code)).toEqual(["MOD-2", "MOD-3"]);
    expect(trail[1].topics.map((t) => t.code)).toEqual(["3.1", "3.2", "3.3"]);
  });

  it("descarta tópicos de módulos que não pertencem à disciplina", () => {
    const allCodes = buildFixtureTrail().flatMap((m) => m.topics.map((t) => t.code));
    expect(allCodes).toEqual(["2.4", "3.1", "3.2", "3.3"]);
  });

  it("bloqueia Mundell-Fleming enquanto Câmbio não tiver a Camada 1 concluída", () => {
    const mundellFleming = buildFixtureTrail()[1].topics[2];
    expect(mundellFleming.status).toBe("locked");
    expect(mundellFleming.prerequisites).toEqual([
      { code: "2.4", title: "IS-LM", isMet: true },
      { code: "3.1", title: "Balanço de Pagamentos", isMet: true },
      { code: "3.2", title: "Câmbio", isMet: false },
    ]);
  });

  it("aplica o progresso gravado aos tópicos sem pré-requisito", () => {
    const trail = buildFixtureTrail();
    expect(trail[0].topics[0].status).toBe("reviewing");
    expect(trail[1].topics[0].status).toBe("studying_advanced");
    expect(trail[1].topics[1].status).toBe("available");
  });

  it("registra quais tópicos cada pré-requisito destrava", () => {
    const trail = buildFixtureTrail();
    expect(trail[0].topics[0].unlocksCodes).toEqual(["3.3"]);
    expect(trail[1].topics[2].unlocksCodes).toEqual([]);
  });
});
