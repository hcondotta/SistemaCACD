// Implementação enxuta do FSRS (Free Spaced Repetition Scheduler) + Cálculo Líquido CACD

export type FSRSRating = 1 | 2 | 3 | 4; // 1: Again (Errou), 2: Hard (Difícil), 3: Good (Bom), 4: Easy (Fácil)

export interface FSRSCardState {
  state: number; // 0: New, 1: Learning, 2: Review, 3: Relearning
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  last_review_at?: string | null;
}

export function scheduleNextFSRSReview(
  card: FSRSCardState,
  rating: FSRSRating,
  now: Date = new Date()
): FSRSCardState & { next_review_at: string } {
  const lastDate = card.last_review_at ? new Date(card.last_review_at) : now;
  const elapsedDays = Math.max(
    0,
    Math.round((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  let { state, stability, difficulty, reps, lapses } = card;

  if (state === 0) {
    // Primeiro contato com o card
    difficulty = Math.min(10, Math.max(1, 5 - (rating - 3) * 1.2));
    stability = rating === 1 ? 0.5 : rating === 2 ? 1.5 : rating === 3 ? 3.5 : 7.0;
    state = rating === 1 ? 1 : 2;
  } else {
    // Atualização de Dificuldade e Estabilidade
    difficulty = Math.min(10, Math.max(1, difficulty - 0.8 * (rating - 3)));
    if (rating === 1) {
      lapses += 1;
      state = 3; // Relearning
      stability = Math.max(0.5, stability * 0.35);
    } else {
      state = 2; // Review
      const factor = rating === 2 ? 1.2 : rating === 3 ? (11 - difficulty) * 0.35 + 1.2 : (11 - difficulty) * 0.55 + 1.8;
      stability = Number((stability * factor).toFixed(4));
    }
  }

  reps += 1;
  const scheduledDays = rating === 1 ? 1 : Math.max(1, Math.round(stability));
  const nextDate = new Date(now.getTime() + scheduledDays * 24 * 60 * 60 * 1000);

  return {
    state,
    stability: Number(stability.toFixed(4)),
    difficulty: Number(difficulty.toFixed(4)),
    elapsed_days: elapsedDays,
    scheduled_days: scheduledDays,
    reps,
    lapses,
    last_review_at: now.toISOString(),
    next_review_at: nextDate.toISOString(),
  };
}

/**
 * Calcula a pontuação líquida padrão TPS do CACD (Cebraspe/IADES):
 * - Acerto: +0.25 (em questão de 4 itens valendo 1.0 ponto)
 * - Erro: -0.25 (ou penalidade configurável)
 * - Em Branco ('B'): 0.00
 */
export function calculateCACDNetScore(results: Array<{ selected: "C" | "E" | "B"; official: "C" | "E" }>) {
  let correct = 0;
  let wrong = 0;
  let blank = 0;

  for (const r of results) {
    if (r.selected === "B") {
      blank++;
    } else if (r.selected === r.official) {
      correct++;
    } else {
      wrong++;
    }
  }

  const netItems = correct - wrong;
  const netPercentage = results.length > 0 ? Number(((netItems / results.length) * 100).toFixed(1)) : 0;

  return { correct, wrong, blank, netItems, netPercentage };
}