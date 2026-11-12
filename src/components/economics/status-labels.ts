import type { MasteryStatus } from "@/lib/trail";

/** Vocabulário exibido para cada status de tópico. */
export const MASTERY_STATUS_LABELS: Record<MasteryStatus, string> = {
  locked: "Bloqueado",
  available: "Disponível",
  studying_base: "Camada 1 em estudo",
  studying_advanced: "Camada 2 em estudo",
  reviewing: "Teoria concluída",
  mastered: "Dominado",
};
