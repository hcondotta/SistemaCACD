import { cache } from "react";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/server-clients";
import {
  parseCausalModels,
  parseLessonContent,
  type CausalModelData,
  type LessonContent,
} from "@/lib/study-content";
import {
  buildTrailModules,
  computeNetTpsAccuracy,
  deriveTopicStatus,
  isPrerequisiteMet,
  resolveDiplomaticRank,
  summarizeTopics,
  type DiplomaticRank,
  type MasteryStatus,
  type ModuleRow,
  type PrerequisiteRow,
  type ProgressRow,
  type TopicRow,
  type TopicsSummary,
  type TrailModule,
  type TrailPrerequisite,
} from "@/lib/trail";

/**
 * Loaders de servidor. Buscam as linhas no Supabase e delegam toda decisão
 * (trava, status, patente, escore) às funções puras de `trail.ts`.
 *
 * Regras:
 * - Nada de dado inventado. Sem banco configurado, falha de consulta ou banco
 *   vazio, o loader devolve um estado explícito e a página mostra isso.
 * - Erros vão completos para o log do servidor; a interface recebe só o estado.
 * - `cache()` deduplica as chamadas de uma mesma requisição (layout, página e
 *   generateMetadata pedem os mesmos dados).
 */

const TOPIC_COLUMNS =
  "id, module_id, code, official_edital_ref, title, pedagogical_order, estimated_minutes, is_critical_for_essay, created_at";
const PROGRESS_COLUMNS =
  "topic_id, status, tps_accuracy_rate, essay_readiness_score, last_studied_at, updated_at";

function logLoadError(scope: string, error: unknown) {
  console.error(`[study-data:${scope}]`, error);
}

// ----------------------------------------------------------------------------
// Moldura do app: sidebar e indicadores do header
// ----------------------------------------------------------------------------

export interface ShellSubject {
  slug: string;
  name: string;
  topicsTotal: number;
  theoryDone: number;
}

export interface ShellStats {
  dueFlashcards: number | null;
  netTpsAccuracy: number | null;
  indexedChunks: number | null;
}

export interface ShellData {
  state: "ok" | "unconfigured" | "error";
  subjects: ShellSubject[];
  economiaModules: Array<{ code: string; title: string }>;
  stats: ShellStats;
}

const EMPTY_STATS: ShellStats = { dueFlashcards: null, netTpsAccuracy: null, indexedChunks: null };

export const loadShellData = cache(async (): Promise<ShellData> => {
  if (!isSupabaseConfigured()) {
    return { state: "unconfigured", subjects: [], economiaModules: [], stats: EMPTY_STATS };
  }

  try {
    const supabase = getSupabaseAdmin();
    const nowIso = new Date().toISOString();

    const [subjectsRes, modulesRes, topicsRes, progressRes, dueRes, answeredRes, correctRes, blankRes, chunksRes] =
      await Promise.all([
        supabase.from("subjects").select("id, slug, name, display_order").order("display_order"),
        supabase.from("modules").select("id, subject_id, code, title, pedagogical_order").order("pedagogical_order"),
        supabase.from("topics").select("id, module_id"),
        supabase.from("topic_progress").select("topic_id, status"),
        supabase.from("flashcards").select("id", { count: "exact", head: true }).lte("next_review_at", nowIso),
        supabase.from("tps_attempts").select("id", { count: "exact", head: true }),
        supabase.from("tps_attempts").select("id", { count: "exact", head: true }).eq("is_correct", true),
        supabase.from("tps_attempts").select("id", { count: "exact", head: true }).eq("selected_answer", "B"),
        // Só conta o que o Tutor consegue usar: trecho com vetor (o acervo sem IA não tem).
        supabase.from("document_chunks").select("id", { count: "exact", head: true }).not("embedding", "is", null),
      ]);

    const failure = [subjectsRes, modulesRes, topicsRes, progressRes, dueRes, answeredRes, correctRes, blankRes, chunksRes]
      .map((res) => res.error)
      .find(Boolean);
    if (failure) {
      logLoadError("shell", failure);
      return { state: "error", subjects: [], economiaModules: [], stats: EMPTY_STATS };
    }

    const subjects = (subjectsRes.data ?? []) as Array<{ id: string; slug: string; name: string }>;
    const modules = (modulesRes.data ?? []) as Array<Pick<ModuleRow, "id" | "subject_id" | "code" | "title">>;
    const topics = (topicsRes.data ?? []) as Array<Pick<TopicRow, "id" | "module_id">>;
    const progress = (progressRes.data ?? []) as Array<Pick<ProgressRow, "topic_id" | "status">>;

    const subjectIdByModule = new Map(modules.map((m) => [m.id, m.subject_id]));
    const statusByTopic = new Map(progress.map((p) => [p.topic_id, p.status]));
    const statusesBySubject = new Map<string, Array<{ status: MasteryStatus }>>();
    for (const topic of topics) {
      const subjectId = subjectIdByModule.get(topic.module_id);
      if (!subjectId) continue;
      const list = statusesBySubject.get(subjectId) ?? [];
      list.push({ status: statusByTopic.get(topic.id) ?? "available" });
      statusesBySubject.set(subjectId, list);
    }

    const economia = subjects.find((s) => s.slug === "economia");

    return {
      state: "ok",
      subjects: subjects.map((subject) => {
        const summary = summarizeTopics(statusesBySubject.get(subject.id) ?? []);
        return {
          slug: subject.slug,
          name: subject.name,
          topicsTotal: summary.total,
          theoryDone: summary.theoryDone,
        };
      }),
      economiaModules: modules
        .filter((m) => m.subject_id === economia?.id)
        .map((m) => ({ code: m.code, title: m.title })),
      stats: {
        dueFlashcards: dueRes.count ?? 0,
        netTpsAccuracy: computeNetTpsAccuracy({
          answered: answeredRes.count ?? 0,
          correct: correctRes.count ?? 0,
          blank: blankRes.count ?? 0,
        }),
        indexedChunks: chunksRes.count ?? 0,
      },
    };
  } catch (error) {
    logLoadError("shell", error);
    return { state: "error", subjects: [], economiaModules: [], stats: EMPTY_STATS };
  }
});

// ----------------------------------------------------------------------------
// Trilha de uma disciplina
// ----------------------------------------------------------------------------

export interface SubjectTrail {
  subject: { id: string; slug: string; name: string };
  modules: TrailModule[];
  summary: TopicsSummary;
}

export type TrailResult =
  | { state: "unconfigured" }
  | { state: "error" }
  | { state: "not_found" }
  | { state: "ok"; trail: SubjectTrail };

export const loadSubjectTrail = cache(async (subjectSlug: string): Promise<TrailResult> => {
  if (!isSupabaseConfigured()) return { state: "unconfigured" };

  try {
    const supabase = getSupabaseAdmin();

    const subjectRes = await supabase.from("subjects").select("id, slug, name").eq("slug", subjectSlug).maybeSingle();
    if (subjectRes.error) throw subjectRes.error;
    if (!subjectRes.data) return { state: "not_found" };
    const subject = subjectRes.data as SubjectTrail["subject"];

    const modulesRes = await supabase
      .from("modules")
      .select("id, subject_id, code, title, description, pedagogical_order")
      .eq("subject_id", subject.id);
    if (modulesRes.error) throw modulesRes.error;
    const modules = (modulesRes.data ?? []) as ModuleRow[];
    if (modules.length === 0) {
      return { state: "ok", trail: { subject, modules: [], summary: summarizeTopics([]) } };
    }

    const topicsRes = await supabase.from("topics").select(TOPIC_COLUMNS).in("module_id", modules.map((m) => m.id));
    if (topicsRes.error) throw topicsRes.error;
    const topics = (topicsRes.data ?? []) as TopicRow[];
    const topicIds = topics.map((t) => t.id);

    let prerequisites: PrerequisiteRow[] = [];
    let progress: ProgressRow[] = [];
    if (topicIds.length > 0) {
      const [prereqRes, progressRes] = await Promise.all([
        supabase.from("topic_prerequisites").select("topic_id, prerequisite_topic_id").in("topic_id", topicIds),
        supabase.from("topic_progress").select(PROGRESS_COLUMNS).in("topic_id", topicIds),
      ]);
      if (prereqRes.error) throw prereqRes.error;
      if (progressRes.error) throw progressRes.error;
      prerequisites = (prereqRes.data ?? []) as PrerequisiteRow[];
      progress = (progressRes.data ?? []) as ProgressRow[];
    }

    const trailModules = buildTrailModules({ modules, topics, prerequisites, progress });
    return {
      state: "ok",
      trail: {
        subject,
        modules: trailModules,
        summary: summarizeTopics(trailModules.flatMap((m) => m.topics)),
      },
    };
  } catch (error) {
    logLoadError(`trail:${subjectSlug}`, error);
    return { state: "error" };
  }
});

// ----------------------------------------------------------------------------
// Estúdio de um tópico
// ----------------------------------------------------------------------------

export interface TopicStudioData {
  subject: { id: string; slug: string; name: string };
  topic: {
    id: string;
    code: string;
    title: string;
    officialEditalRef: string | null;
    estimatedMinutes: number | null;
    isCriticalForEssay: boolean;
    moduleCode: string;
    moduleTitle: string;
  };
  status: MasteryStatus;
  rank: DiplomaticRank | null;
  prerequisites: TrailPrerequisite[];
  lesson: LessonContent | null;
  causalModels: CausalModelData[];
}

export type TopicStudioResult =
  | { state: "unconfigured" }
  | { state: "error" }
  | { state: "not_found" }
  | { state: "ok"; data: TopicStudioData };

function countList(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

export const loadTopicStudio = cache(
  async (subjectSlug: string, topicCode: string): Promise<TopicStudioResult> => {
    if (!isSupabaseConfigured()) return { state: "unconfigured" };

    try {
      const supabase = getSupabaseAdmin();

      const subjectRes = await supabase.from("subjects").select("id, slug, name").eq("slug", subjectSlug).maybeSingle();
      if (subjectRes.error) throw subjectRes.error;
      if (!subjectRes.data) return { state: "not_found" };
      const subject = subjectRes.data as TopicStudioData["subject"];

      const modulesRes = await supabase.from("modules").select("id, code, title").eq("subject_id", subject.id);
      if (modulesRes.error) throw modulesRes.error;
      const modules = (modulesRes.data ?? []) as Array<Pick<ModuleRow, "id" | "code" | "title">>;
      if (modules.length === 0) return { state: "not_found" };

      // O código do tópico ("3.3") só é único dentro da disciplina: a busca é
      // sempre restrita aos módulos dela.
      const topicRes = await supabase
        .from("topics")
        .select(TOPIC_COLUMNS)
        .eq("code", topicCode)
        .in("module_id", modules.map((m) => m.id))
        .maybeSingle();
      if (topicRes.error) throw topicRes.error;
      if (!topicRes.data) return { state: "not_found" };
      const topic = topicRes.data as TopicRow;
      const module = modules.find((m) => m.id === topic.module_id);

      const [lessonRes, modelsRes, ownProgressRes, edgesRes] = await Promise.all([
        supabase.from("topic_lessons").select("*").eq("topic_id", topic.id).maybeSingle(),
        supabase.from("causal_models").select("*").eq("topic_id", topic.id).order("created_at"),
        supabase.from("topic_progress").select("status").eq("topic_id", topic.id).maybeSingle(),
        supabase.from("topic_prerequisites").select("prerequisite_topic_id").eq("topic_id", topic.id),
      ]);
      for (const res of [lessonRes, modelsRes, ownProgressRes, edgesRes]) {
        if (res.error) throw res.error;
      }

      const prerequisiteIds = ((edgesRes.data ?? []) as Array<{ prerequisite_topic_id: string }>).map(
        (edge) => edge.prerequisite_topic_id,
      );
      let prerequisiteTopics: Array<Pick<TopicRow, "id" | "code" | "title" | "pedagogical_order">> = [];
      const prerequisiteStatusById = new Map<string, MasteryStatus>();
      if (prerequisiteIds.length > 0) {
        const [preTopicsRes, preProgressRes] = await Promise.all([
          supabase.from("topics").select("id, code, title, pedagogical_order").in("id", prerequisiteIds),
          supabase.from("topic_progress").select("topic_id, status").in("topic_id", prerequisiteIds),
        ]);
        if (preTopicsRes.error) throw preTopicsRes.error;
        if (preProgressRes.error) throw preProgressRes.error;
        prerequisiteTopics = [...((preTopicsRes.data ?? []) as typeof prerequisiteTopics)].sort(
          (a, b) => a.pedagogical_order - b.pedagogical_order,
        );
        for (const row of (preProgressRes.data ?? []) as Array<Pick<ProgressRow, "topic_id" | "status">>) {
          prerequisiteStatusById.set(row.topic_id, row.status);
        }
      }

      const ownStatus = (ownProgressRes.data as { status: MasteryStatus } | null)?.status;
      const status = deriveTopicStatus(
        ownStatus,
        prerequisiteTopics.map((p) => prerequisiteStatusById.get(p.id)),
      );

      let lesson: LessonContent | null = null;
      if (lessonRes.data) {
        try {
          lesson = parseLessonContent(lessonRes.data);
          const raw = lessonRes.data as { tps_traps_json: unknown; essay_repertoire_json: unknown };
          const dropped =
            countList(raw.tps_traps_json) - lesson.tpsTraps.length +
            (countList(raw.essay_repertoire_json) - lesson.essayRepertoire.length);
          if (dropped > 0) {
            console.warn(`[study-data:topic:${topicCode}] ${dropped} item(ns) malformado(s) descartado(s) da ficha.`);
          }
        } catch (error) {
          logLoadError(`topic:${topicCode}:lesson`, error);
        }
      }

      const rawModels = (modelsRes.data ?? []) as unknown[];
      const causalModels = parseCausalModels(rawModels);
      if (causalModels.length < rawModels.length) {
        console.warn(
          `[study-data:topic:${topicCode}] ${rawModels.length - causalModels.length} modelo(s) causal(is) malformado(s) descartado(s).`,
        );
      }

      return {
        state: "ok",
        data: {
          subject,
          topic: {
            id: topic.id,
            code: topic.code,
            title: topic.title,
            officialEditalRef: topic.official_edital_ref,
            estimatedMinutes: topic.estimated_minutes,
            isCriticalForEssay: topic.is_critical_for_essay ?? false,
            moduleCode: module?.code ?? "",
            moduleTitle: module?.title ?? "",
          },
          status,
          // O acerto no TPS por tópico chega com a Arena TPS (Etapa C).
          rank: resolveDiplomaticRank(status, null),
          prerequisites: prerequisiteTopics.map((p) => ({
            code: p.code,
            title: p.title,
            isMet: isPrerequisiteMet(prerequisiteStatusById.get(p.id)),
          })),
          lesson,
          causalModels,
        },
      };
    } catch (error) {
      logLoadError(`topic:${subjectSlug}:${topicCode}`, error);
      return { state: "error" };
    }
  },
);

// ----------------------------------------------------------------------------
// Estado de trava de um tópico (usado pelas server actions)
// ----------------------------------------------------------------------------

export async function loadTopicLockState(
  topicId: string,
): Promise<{ found: false } | { found: true; storedStatus: MasteryStatus | undefined; prerequisiteStatuses: Array<MasteryStatus | undefined> }> {
  const supabase = getSupabaseAdmin();

  const [topicRes, ownProgressRes, edgesRes] = await Promise.all([
    supabase.from("topics").select("id").eq("id", topicId).maybeSingle(),
    supabase.from("topic_progress").select("status").eq("topic_id", topicId).maybeSingle(),
    supabase.from("topic_prerequisites").select("prerequisite_topic_id").eq("topic_id", topicId),
  ]);
  for (const res of [topicRes, ownProgressRes, edgesRes]) {
    if (res.error) throw res.error;
  }
  if (!topicRes.data) return { found: false };

  const prerequisiteIds = ((edgesRes.data ?? []) as Array<{ prerequisite_topic_id: string }>).map(
    (edge) => edge.prerequisite_topic_id,
  );
  const statusById = new Map<string, MasteryStatus>();
  if (prerequisiteIds.length > 0) {
    const preProgressRes = await supabase.from("topic_progress").select("topic_id, status").in("topic_id", prerequisiteIds);
    if (preProgressRes.error) throw preProgressRes.error;
    for (const row of (preProgressRes.data ?? []) as Array<Pick<ProgressRow, "topic_id" | "status">>) {
      statusById.set(row.topic_id, row.status);
    }
  }

  return {
    found: true,
    storedStatus: (ownProgressRes.data as { status: MasteryStatus } | null)?.status,
    prerequisiteStatuses: prerequisiteIds.map((id) => statusById.get(id)),
  };
}
