/**
 * Lógica pura da trilha pedagógica: trava de pré-requisitos, avanço de estudo,
 * patentes diplomáticas e escore líquido do TPS.
 *
 * Nada aqui toca o banco ou a interface. Os loaders de dados e as server actions
 * apenas buscam as linhas e delegam a decisão a estas funções, que são cobertas
 * por `trail.test.ts`.
 */

export type MasteryStatus =
  | "locked"
  | "available"
  | "studying_base"
  | "studying_advanced"
  | "reviewing"
  | "mastered";

/** Marcos de estudo que a aluna registra explicitamente no Estúdio do Tópico. */
export type StudyCheckpoint = "camada_base_concluida" | "camada_cacd_concluida";

export type DiplomaticRank =
  | "terceiro_secretario"
  | "segundo_secretario"
  | "primeiro_secretario"
  | "conselheiro"
  | "embaixador";

// ----------------------------------------------------------------------------
// Linhas do banco (espelham as colunas de supabase/migrations)
// ----------------------------------------------------------------------------

export interface ModuleRow {
  id: string;
  subject_id: string;
  code: string;
  title: string;
  description: string | null;
  pedagogical_order: number;
}

export interface TopicRow {
  id: string;
  module_id: string;
  code: string;
  official_edital_ref: string | null;
  title: string;
  pedagogical_order: number;
  estimated_minutes: number | null;
  is_critical_for_essay: boolean | null;
  created_at: string;
}

export interface PrerequisiteRow {
  topic_id: string;
  prerequisite_topic_id: string;
}

export interface ProgressRow {
  topic_id: string;
  status: MasteryStatus;
  tps_accuracy_rate: number | null;
  essay_readiness_score: number | null;
  last_studied_at: string | null;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// Estruturas entregues à interface
// ----------------------------------------------------------------------------

export interface TrailPrerequisite {
  code: string;
  title: string;
  isMet: boolean;
}

export interface TrailTopic {
  id: string;
  code: string;
  title: string;
  officialEditalRef: string | null;
  pedagogicalOrder: number;
  estimatedMinutes: number | null;
  isCriticalForEssay: boolean;
  status: MasteryStatus;
  prerequisites: TrailPrerequisite[];
  unlocksCodes: string[];
}

export interface TrailModule {
  id: string;
  code: string;
  title: string;
  description: string | null;
  pedagogicalOrder: number;
  topics: TrailTopic[];
}

export interface TopicsSummary {
  total: number;
  /** Tópicos com as duas camadas de teoria concluídas (em revisão ou dominados). */
  theoryDone: number;
  /** Tópicos iniciados e ainda na teoria. */
  inProgress: number;
  locked: number;
}

// ----------------------------------------------------------------------------
// Trava de pré-requisitos
// ----------------------------------------------------------------------------

/**
 * Um pré-requisito está cumprido quando a aluna concluiu pelo menos a Camada 1
 * (Intuição Base Zero) daquele tópico. Apenas iniciá-lo não basta.
 */
const PREREQUISITE_MET_STATUSES: ReadonlySet<MasteryStatus> = new Set([
  "studying_advanced",
  "reviewing",
  "mastered",
]);

/** Status que representam estudo de fato iniciado — nunca escondidos pela trava. */
const STARTED_STATUSES: ReadonlySet<MasteryStatus> = new Set([
  "studying_base",
  "studying_advanced",
  "reviewing",
  "mastered",
]);

export function isPrerequisiteMet(status: MasteryStatus | null | undefined): boolean {
  return status != null && PREREQUISITE_MET_STATUSES.has(status);
}

/**
 * Calcula o status exibido de um tópico a partir do progresso gravado e dos
 * status gravados de cada pré-requisito.
 *
 * O bloqueio é sempre derivado, nunca confiado ao valor gravado: um `locked`
 * antigo é recalculado, e um `available` gravado volta a bloquear se um
 * pré-requisito estiver pendente. Já o estudo iniciado é preservado mesmo que
 * um pré-requisito novo seja cadastrado depois — a trava não apaga progresso.
 */
export function deriveTopicStatus(
  stored: MasteryStatus | null | undefined,
  prerequisiteStatuses: Array<MasteryStatus | null | undefined>,
): MasteryStatus {
  if (stored != null && STARTED_STATUSES.has(stored)) {
    return stored;
  }
  return prerequisiteStatuses.every(isPrerequisiteMet) ? "available" : "locked";
}

// ----------------------------------------------------------------------------
// Avanço de estudo
// ----------------------------------------------------------------------------

const PROGRESSION: readonly MasteryStatus[] = [
  "available",
  "studying_base",
  "studying_advanced",
  "reviewing",
  "mastered",
];

const CHECKPOINT_TARGET: Record<StudyCheckpoint, MasteryStatus> = {
  camada_base_concluida: "studying_advanced",
  camada_cacd_concluida: "reviewing",
};

/**
 * Aplica um marco de estudo. O avanço é monotônico: registrar a Camada 1 num
 * tópico já em revisão não rebaixa nada. A maestria (`mastered`) não é
 * alcançável por marco — ela virá do desempenho no TPS e na revisão espaçada.
 */
export function advanceStatus(current: MasteryStatus, checkpoint: StudyCheckpoint): MasteryStatus {
  if (current === "locked") {
    throw new Error("Tópico bloqueado: conclua os pré-requisitos antes de registrar avanço.");
  }
  const target = CHECKPOINT_TARGET[checkpoint];
  return PROGRESSION.indexOf(target) > PROGRESSION.indexOf(current) ? target : current;
}

// ----------------------------------------------------------------------------
// Patentes da carreira diplomática
// ----------------------------------------------------------------------------

/** Acerto líquido mínimo no TPS do tópico para a patente de Conselheiro. */
const CONSELHEIRO_MIN_NET_ACCURACY = 75;

/**
 * Patente correspondente ao status do tópico. Tópicos bloqueados ou ainda não
 * iniciados não têm patente: a insígnia é conquistada, não atribuída.
 */
export function resolveDiplomaticRank(
  status: MasteryStatus,
  tpsAccuracy: number | null,
): DiplomaticRank | null {
  switch (status) {
    case "studying_base":
      return "terceiro_secretario";
    case "studying_advanced":
      return "segundo_secretario";
    case "reviewing":
      return tpsAccuracy !== null && tpsAccuracy >= CONSELHEIRO_MIN_NET_ACCURACY
        ? "conselheiro"
        : "primeiro_secretario";
    case "mastered":
      return "embaixador";
    default:
      return null;
  }
}

// ----------------------------------------------------------------------------
// Escore líquido do TPS (padrão Cebraspe/IADES)
// ----------------------------------------------------------------------------

/**
 * Percentual líquido: (certos − errados) ÷ total respondido, com os itens em
 * branco no denominador. Pode ser negativo. Sem itens respondidos não existe
 * escore — devolver zero seria afirmar um desempenho que não aconteceu.
 */
export function computeNetTpsAccuracy(counts: {
  answered: number;
  correct: number;
  blank: number;
}): number | null {
  if (counts.answered <= 0) {
    return null;
  }
  const wrong = counts.answered - counts.correct - counts.blank;
  const netPercentage = ((counts.correct - wrong) / counts.answered) * 100;
  return Math.round(netPercentage * 10) / 10;
}

export function summarizeTopics(topics: Array<{ status: MasteryStatus }>): TopicsSummary {
  let theoryDone = 0;
  let inProgress = 0;
  let locked = 0;
  for (const { status } of topics) {
    if (status === "reviewing" || status === "mastered") theoryDone += 1;
    else if (status === "studying_base" || status === "studying_advanced") inProgress += 1;
    else if (status === "locked") locked += 1;
  }
  return { total: topics.length, theoryDone, inProgress, locked };
}

// ----------------------------------------------------------------------------
// Montagem da trilha
// ----------------------------------------------------------------------------

function byPedagogicalOrder(a: { pedagogical_order: number }, b: { pedagogical_order: number }) {
  return a.pedagogical_order - b.pedagogical_order;
}

function appendTo(map: Map<string, string[]>, key: string, value: string) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

/**
 * Monta a trilha de uma disciplina a partir das linhas cruas do banco.
 *
 * Só entram os tópicos dos módulos informados, e só as arestas de
 * pré-requisito cujas duas pontas pertencem à trilha: pré-requisitos entre
 * disciplinas diferentes ainda não são modelados pelo sistema.
 */
export function buildTrailModules(input: {
  modules: ModuleRow[];
  topics: TopicRow[];
  prerequisites: PrerequisiteRow[];
  progress: ProgressRow[];
}): TrailModule[] {
  const modules = [...input.modules].sort(byPedagogicalOrder);
  const moduleIds = new Set(modules.map((m) => m.id));
  const subjectTopics = input.topics.filter((t) => moduleIds.has(t.module_id));
  const topicById = new Map(subjectTopics.map((t) => [t.id, t]));
  const storedStatusById = new Map(input.progress.map((p) => [p.topic_id, p.status]));

  const prerequisiteIdsByTopic = new Map<string, string[]>();
  const unlockedIdsByTopic = new Map<string, string[]>();
  for (const edge of input.prerequisites) {
    if (!topicById.has(edge.topic_id) || !topicById.has(edge.prerequisite_topic_id)) continue;
    appendTo(prerequisiteIdsByTopic, edge.topic_id, edge.prerequisite_topic_id);
    appendTo(unlockedIdsByTopic, edge.prerequisite_topic_id, edge.topic_id);
  }

  const topicsInOrder = (ids: string[] | undefined): TopicRow[] =>
    (ids ?? []).map((id) => topicById.get(id) as TopicRow).sort(byPedagogicalOrder);

  const toTrailTopic = (topic: TopicRow): TrailTopic => {
    const prerequisites = topicsInOrder(prerequisiteIdsByTopic.get(topic.id));
    const prerequisiteStatuses = prerequisites.map((p) => storedStatusById.get(p.id));
    return {
      id: topic.id,
      code: topic.code,
      title: topic.title,
      officialEditalRef: topic.official_edital_ref,
      pedagogicalOrder: topic.pedagogical_order,
      estimatedMinutes: topic.estimated_minutes,
      isCriticalForEssay: topic.is_critical_for_essay ?? false,
      status: deriveTopicStatus(storedStatusById.get(topic.id), prerequisiteStatuses),
      prerequisites: prerequisites.map((p, index) => ({
        code: p.code,
        title: p.title,
        isMet: isPrerequisiteMet(prerequisiteStatuses[index]),
      })),
      unlocksCodes: topicsInOrder(unlockedIdsByTopic.get(topic.id)).map((t) => t.code),
    };
  };

  return modules.map((module) => ({
    id: module.id,
    code: module.code,
    title: module.title,
    description: module.description,
    pedagogicalOrder: module.pedagogical_order,
    topics: subjectTopics
      .filter((t) => t.module_id === module.id)
      .sort(byPedagogicalOrder)
      .map(toTrailTopic),
  }));
}
