import { describe, expect, it } from "vitest";
import { AdvanceTopicProgressSchema, AssignSectionTopicSchema, SaveTutorFlashcardSchema } from "./api-requests";

const TOPIC_ID = "9b2f6c1e-4d3a-4f8b-9c2d-1a2b3c4d5e6f";

describe("AdvanceTopicProgressSchema", () => {
  it("aceita um marco válido para um tópico", () => {
    const parsed = AdvanceTopicProgressSchema.safeParse({
      topicId: TOPIC_ID,
      checkpoint: "camada_base_concluida",
    });
    expect(parsed.success).toBe(true);
  });

  it("recusa identificador de tópico que não é UUID", () => {
    const parsed = AdvanceTopicProgressSchema.safeParse({
      topicId: "3.3",
      checkpoint: "camada_base_concluida",
    });
    expect(parsed.success).toBe(false);
  });

  it("recusa tentar marcar maestria diretamente", () => {
    const parsed = AdvanceTopicProgressSchema.safeParse({ topicId: TOPIC_ID, checkpoint: "mastered" });
    expect(parsed.success).toBe(false);
  });
});

describe("SaveTutorFlashcardSchema", () => {
  it("remove espaços das pontas antes de gravar", () => {
    const parsed = SaveTutorFlashcardSchema.parse({
      topicId: TOPIC_ID,
      frontPrompt: "  O que é a Trindade Impossível?  ",
      backAnswer: " Câmbio fixo, livre fluxo de capitais e autonomia monetária: só dois de três. ",
    });
    expect(parsed.frontPrompt).toBe("O que é a Trindade Impossível?");
    expect(parsed.backAnswer).toBe(
      "Câmbio fixo, livre fluxo de capitais e autonomia monetária: só dois de três.",
    );
  });

  it("recusa flashcard com frente vazia depois de remover os espaços", () => {
    const parsed = SaveTutorFlashcardSchema.safeParse({
      topicId: TOPIC_ID,
      frontPrompt: "   ",
      backAnswer: "Resposta",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("AssignSectionTopicSchema", () => {
  const SECTION_ID = "3f1e2d4c-5b6a-4789-8a1b-2c3d4e5f6a7b";

  it("liga uma seção a um tópico", () => {
    expect(AssignSectionTopicSchema.safeParse({ sectionId: SECTION_ID, topicId: TOPIC_ID }).success).toBe(true);
  });

  it("aceita tópico nulo para desfazer o vínculo", () => {
    expect(AssignSectionTopicSchema.parse({ sectionId: SECTION_ID, topicId: null }).topicId).toBeNull();
  });

  it("recusa id que não é UUID", () => {
    expect(AssignSectionTopicSchema.safeParse({ sectionId: "12", topicId: TOPIC_ID }).success).toBe(false);
  });
});
