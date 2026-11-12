"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  Columns2,
  MessageSquareText,
  Quote,
  TrendingUp,
} from "lucide-react";
import CausalGraphTranslator from "@/components/economics/CausalGraphTranslator";
import { MASTERY_STATUS_LABELS } from "@/components/economics/status-labels";
import { useLearningLayer } from "@/components/layout/learning-layer";
import TutorRAGDrawer from "@/components/tutor/TutorRAGDrawer";
import { AthosBulcaoPattern, DiplomaticBadge } from "@/components/ui/DiplomaticBadges";
import { StatusPanel } from "@/components/ui/StatusPanel";
import { advanceTopicProgress } from "@/lib/actions/study-actions";
import type { TopicStudioData } from "@/lib/data/study-data";
import { advanceStatus, type MasteryStatus, type StudyCheckpoint } from "@/lib/trail";

type StudioTab = "ficha" | "graficos" | "armadilhas";

const CHECKPOINTS: Array<{ id: StudyCheckpoint; label: string; description: string }> = [
  {
    id: "camada_base_concluida",
    label: "Camada 1 · Intuição Base Zero",
    description: "Entendi as variáveis, os eixos e a lógica de causa e efeito.",
  },
  {
    id: "camada_cacd_concluida",
    label: "Camada 2 · Rigor CACD",
    description: "Domino o modelo formal, os autores e a conexão com a história econômica.",
  },
];

/** Um marco está cumprido quando aplicá-lo não mudaria mais nada (regra de `advanceStatus`). */
function isCheckpointDone(status: MasteryStatus, checkpoint: StudyCheckpoint): boolean {
  return status !== "locked" && advanceStatus(status, checkpoint) === status;
}

const markdownClasses = "prose prose-itamaraty font-serif";

export default function TopicStudioClient({
  data,
  tutorAvailable,
}: {
  data: TopicStudioData;
  tutorAvailable: boolean;
}) {
  const { learningLayer, setLearningLayer } = useLearningLayer();
  const [activeTab, setActiveTab] = useState<StudioTab>("ficha");
  const [sideBySide, setSideBySide] = useState(false);
  const [isTutorOpen, setIsTutorOpen] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [progressMessage, setProgressMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const { subject, topic, status, rank, prerequisites, lesson, causalModels } = data;

  function markCheckpoint(checkpoint: StudyCheckpoint) {
    setProgressMessage(null);
    startSaving(async () => {
      const result = await advanceTopicProgress({ topicId: topic.id, checkpoint });
      setProgressMessage(
        result.ok
          ? { tone: "ok", text: `Avanço registrado: ${MASTERY_STATUS_LABELS[result.data.status]}.` }
          : { tone: "error", text: result.error },
      );
    });
  }

  const tabs: Array<{ id: StudioTab; label: string; icon: typeof BookOpen }> = [
    { id: "ficha", label: "Ficha em duas camadas", icon: BookOpen },
    { id: "graficos", label: `Tradutor de gráficos (${causalModels.length})`, icon: TrendingUp },
    {
      id: "armadilhas",
      label: `Armadilhas (${lesson?.tpsTraps.length ?? 0}) e repertório (${lesson?.essayRepertoire.length ?? 0})`,
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="flex flex-1 flex-col">
      {/* Hero do tópico */}
      <section className="relative overflow-hidden border-b border-travertine-200 bg-travertine-100/90 px-5 py-6 sm:px-6 dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-900">
        <AthosBulcaoPattern className="opacity-[0.04] text-itamaraty-navy-700 dark:text-itamaraty-gold-400" />

        <div className="relative mx-auto max-w-6xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Link
                href="/economia"
                className="inline-flex items-center gap-1.5 font-semibold text-itamaraty-navy-600 hover:underline dark:text-itamaraty-gold-400"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                Trilha de {subject.name}
              </Link>
              <span className="text-ink-500" aria-hidden>
                •
              </span>
              <span className="font-mono font-bold text-ink-700 dark:text-travertine-200">
                {topic.moduleCode}: {topic.moduleTitle}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {topic.isCriticalForEssay && (
                <span className="rounded-full border border-itamaraty-gold-500/50 bg-itamaraty-gold-500/15 px-3 py-0.5 text-[11px] font-bold text-itamaraty-gold-700 dark:text-itamaraty-gold-300">
                  ★ Alta incidência na 3ª Fase
                </span>
              )}
              {topic.estimatedMinutes !== null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-travertine-200/80 px-2.5 py-0.5 font-mono text-[11px] text-ink-700 dark:bg-itamaraty-navy-800 dark:text-travertine-200">
                  <Clock className="h-3 w-3" aria-hidden />
                  {topic.estimatedMinutes} min
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="space-y-1">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400">
                Tópico {topic.code}
                {topic.officialEditalRef ? ` • Edital: ${topic.officialEditalRef}` : ""}
              </span>
              <h1 className="font-serif text-2xl font-bold text-ink-900 sm:text-3xl dark:text-travertine-50">{topic.title}</h1>

              {prerequisites.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-ink-500 dark:text-travertine-300">
                  <span>Pré-requisitos:</span>
                  {prerequisites.map((pre) => (
                    <Link
                      key={pre.code}
                      href={`/economia/${pre.code}`}
                      title={pre.isMet ? "Camada 1 concluída" : "Camada 1 ainda não concluída"}
                      className="inline-flex items-center gap-1 rounded bg-travertine-200 px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-900 hover:underline dark:bg-itamaraty-navy-800 dark:text-travertine-100"
                    >
                      {pre.isMet ? (
                        <CheckCircle2 className="h-3 w-3 text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400" aria-hidden />
                      ) : (
                        <Circle className="h-3 w-3" aria-hidden />
                      )}
                      {pre.code} — {pre.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              {rank && <DiplomaticBadge rank={rank} size="md" showLabel />}
              <div className="flex flex-col items-start gap-1 lg:items-end">
                <button
                  type="button"
                  onClick={() => setIsTutorOpen(true)}
                  disabled={!tutorAvailable}
                  className="flex items-center gap-2 rounded-xl bg-itamaraty-navy-600 px-4 py-2.5 text-xs font-bold text-travertine-50 shadow-sm transition hover:bg-itamaraty-navy-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-itamaraty-gold-500 dark:text-itamaraty-navy-950 dark:hover:bg-itamaraty-gold-400"
                >
                  <MessageSquareText className="h-4 w-4" aria-hidden />
                  Abrir Tutor IA (acervo RAG)
                </button>
                {!tutorAvailable && (
                  <span className="text-[11px] text-ink-500 dark:text-travertine-300">
                    O Tutor depende da chave do Gemini e do acervo indexado.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Abas do estúdio */}
          <div className="flex flex-wrap gap-2 border-t border-travertine-200 pt-3 dark:border-itamaraty-navy-800" role="tablist">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  activeTab === id
                    ? "bg-itamaraty-navy-700 text-travertine-50 dark:bg-itamaraty-gold-500 dark:text-itamaraty-navy-950"
                    : "bg-travertine-50 text-ink-700 dark:bg-itamaraty-navy-950 dark:text-travertine-200"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-5 py-8 sm:px-6">
        {/* ABA 1: ficha em duas camadas + marcos de estudo */}
        {activeTab === "ficha" && (
          <div className="space-y-6">
            {lesson ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-travertine-200 bg-travertine-100 px-5 py-3.5 dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-900">
                  <div className="flex items-center gap-2" role="group" aria-label="Camada da ficha">
                    {(["base", "cacd"] as const).map((layer) => (
                      <button
                        key={layer}
                        type="button"
                        aria-pressed={!sideBySide && learningLayer === layer}
                        onClick={() => {
                          setSideBySide(false);
                          setLearningLayer(layer);
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                          !sideBySide && learningLayer === layer
                            ? "bg-itamaraty-navy-600 text-travertine-50 dark:bg-itamaraty-gold-500 dark:text-itamaraty-navy-950"
                            : "text-ink-700 dark:text-travertine-300"
                        }`}
                      >
                        {layer === "base" ? "Camada 1: Intuição Base Zero" : "Camada 2: Rigor CACD"}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    aria-pressed={sideBySide}
                    onClick={() => setSideBySide((previous) => !previous)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      sideBySide
                        ? "border-itamaraty-gold-500 bg-itamaraty-gold-500/15 text-itamaraty-gold-700 dark:text-itamaraty-gold-300"
                        : "border-travertine-300 text-ink-700 dark:border-itamaraty-navy-700 dark:text-travertine-200"
                    }`}
                  >
                    <Columns2 className="h-3.5 w-3.5" aria-hidden />
                    {sideBySide ? "Exibindo lado a lado" : "Comparar lado a lado"}
                  </button>
                </div>

                {sideBySide ? (
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {([
                      { title: "Camada 1 • Intuição e Base Zero", icon: BookOpen, body: lesson.baseIntuitionMd },
                      { title: "Camada 2 • Aprofundamento padrão Rio Branco", icon: Award, body: lesson.cacdDeepDiveMd },
                    ] as const).map(({ title, icon: Icon, body }) => (
                      <article
                        key={title}
                        className="rounded-2xl border border-travertine-200 bg-travertine-50 p-6 shadow-parchment dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-900"
                      >
                        <div className="mb-4 flex items-center gap-2 border-b border-travertine-200 pb-3 dark:border-itamaraty-navy-800">
                          <Icon className="h-4 w-4 text-itamaraty-gold-600 dark:text-itamaraty-gold-400" aria-hidden />
                          <h2 className="font-serif text-base font-bold text-ink-900 dark:text-travertine-50">{title}</h2>
                        </div>
                        <div className={`${markdownClasses} max-w-none`}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <article className="mx-auto max-w-4xl rounded-2xl border border-travertine-200 bg-travertine-50 p-6 shadow-parchment sm:p-8 dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-900">
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-travertine-200 pb-4 dark:border-itamaraty-navy-800">
                      <h2 className="font-serif text-xl font-bold text-ink-900 dark:text-travertine-50">
                        {learningLayer === "base"
                          ? "Camada 1: construindo a intuição econômica"
                          : "Camada 2: rigor técnico, modelos e historiografia"}
                      </h2>
                      {learningLayer === "base" && (
                        <button
                          type="button"
                          onClick={() => setLearningLayer("cacd")}
                          className="text-xs font-bold text-itamaraty-navy-600 hover:underline dark:text-itamaraty-gold-400"
                        >
                          Avançar para o Rigor CACD →
                        </button>
                      )}
                    </div>
                    <div className={`${markdownClasses} max-w-[68ch] sm:prose-lg`}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {learningLayer === "base" ? lesson.baseIntuitionMd : lesson.cacdDeepDiveMd}
                      </ReactMarkdown>
                    </div>
                  </article>
                )}
              </>
            ) : (
              <StatusPanel tone="info" title="A ficha deste tópico ainda não foi gerada">
                <p>
                  As fichas em duas camadas são produzidas pela fábrica de conteúdo a partir do seu acervo (livros,
                  apostilas, aulas e fichamentos). Enquanto isso, estude pelo seu próprio material e registre o avanço
                  abaixo — a trilha destrava os próximos tópicos do mesmo jeito.
                </p>
              </StatusPanel>
            )}

            {/* Marcos de estudo: o que alimenta a trava de pré-requisitos */}
            <section
              aria-labelledby="marcos-de-estudo"
              className="rounded-2xl border border-travertine-200 bg-travertine-100 p-5 dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-900"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="marcos-de-estudo" className="font-serif text-base font-bold text-ink-900 dark:text-travertine-50">
                  Registrar avanço
                </h2>
                <span className="text-xs text-ink-500 dark:text-travertine-300">
                  Situação atual: <strong>{MASTERY_STATUS_LABELS[status]}</strong>
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink-500 dark:text-travertine-300">
                Concluir a Camada 1 destrava os tópicos que dependem deste. A patente de Conselheiro e a maestria virão do
                seu desempenho no TPS e na revisão espaçada.
              </p>

              <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {CHECKPOINTS.map((checkpoint) => {
                  const done = isCheckpointDone(status, checkpoint.id);
                  return (
                    <li
                      key={checkpoint.id}
                      className={`flex items-start justify-between gap-3 rounded-xl border p-4 ${
                        done
                          ? "border-itamaraty-emerald-700/40 bg-itamaraty-emerald-500/10"
                          : "border-travertine-200 bg-travertine-50 dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-950"
                      }`}
                    >
                      <div className="flex gap-2.5">
                        {done ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400" aria-hidden />
                        ) : (
                          <Circle className="mt-0.5 h-4 w-4 shrink-0 text-ink-500 dark:text-travertine-300" aria-hidden />
                        )}
                        <div>
                          <p className="text-xs font-bold text-ink-900 dark:text-travertine-50">{checkpoint.label}</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-ink-500 dark:text-travertine-300">
                            {checkpoint.description}
                          </p>
                        </div>
                      </div>
                      {done ? (
                        <span className="shrink-0 text-[11px] font-bold text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400">
                          Concluída
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isSaving || status === "locked"}
                          onClick={() => markCheckpoint(checkpoint.id)}
                          className="shrink-0 rounded-lg bg-itamaraty-navy-600 px-3 py-1.5 text-[11px] font-bold text-travertine-50 transition hover:bg-itamaraty-navy-700 disabled:opacity-40 dark:bg-itamaraty-gold-500 dark:text-itamaraty-navy-950 dark:hover:bg-itamaraty-gold-400"
                        >
                          {isSaving ? "Salvando…" : "Marcar como concluída"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>

              {progressMessage && (
                <p
                  role={progressMessage.tone === "error" ? "alert" : "status"}
                  className={`mt-3 text-xs font-semibold ${
                    progressMessage.tone === "ok"
                      ? "text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400"
                      : "text-itamaraty-carmine-700 dark:text-itamaraty-carmine-500"
                  }`}
                >
                  {progressMessage.text}
                </p>
              )}
            </section>
          </div>
        )}

        {/* ABA 2: tradutor de gráficos */}
        {activeTab === "graficos" &&
          (causalModels.length > 0 ? (
            <CausalGraphTranslator models={causalModels} />
          ) : (
            <StatusPanel tone="info" title="Nenhum modelo causal cadastrado para este tópico">
              <p>
                O tradutor de gráficos mostra, passo a passo, como um choque desloca as curvas e se reflete no Balanço de
                Pagamentos. Por enquanto só o cenário de Mundell-Fleming (tópico 3.3) está cadastrado.
              </p>
            </StatusPanel>
          ))}

        {/* ABA 3: pegadinhas do TPS e repertório da 3ª Fase */}
        {activeTab === "armadilhas" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-itamaraty-carmine-500" aria-hidden />
                <h2 className="font-serif text-lg font-bold text-ink-900 dark:text-travertine-50">Radar de pegadinhas da banca</h2>
              </div>
              {!lesson || lesson.tpsTraps.length === 0 ? (
                <p className="text-sm text-ink-500 dark:text-travertine-300">
                  Nenhuma pegadinha registrada ainda. Elas são extraídas do acervo junto com a ficha do tópico.
                </p>
              ) : (
                lesson.tpsTraps.map((trap, index) => (
                  <div
                    key={index}
                    className="space-y-3 rounded-2xl border border-itamaraty-carmine-700/40 bg-travertine-100 p-5 dark:bg-itamaraty-navy-900"
                  >
                    <span className="inline-block rounded bg-itamaraty-carmine-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-travertine-50">
                      Armadilha {index + 1}
                      {trap.category ? ` • ${trap.category}` : ""}
                    </span>
                    <div className="rounded-xl border border-itamaraty-carmine-700/30 bg-itamaraty-carmine-500/10 p-3 text-xs">
                      <strong className="text-itamaraty-carmine-700 dark:text-itamaraty-carmine-500">Como a banca induz ao erro: </strong>
                      <span className="italic text-ink-900 dark:text-travertine-100">&ldquo;{trap.wrongClaim}&rdquo;</span>
                    </div>
                    <div className="rounded-xl border border-itamaraty-emerald-700/30 bg-itamaraty-emerald-500/10 p-3 text-xs">
                      <strong className="text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400">Mecanismo correto: </strong>
                      <span className="text-ink-900 dark:text-travertine-100">{trap.truthMechanism}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Quote className="h-5 w-5 text-itamaraty-gold-600 dark:text-itamaraty-gold-400" aria-hidden />
                <h2 className="font-serif text-lg font-bold text-ink-900 dark:text-travertine-50">Arsenal de citações e dados</h2>
              </div>
              {!lesson || lesson.essayRepertoire.length === 0 ? (
                <p className="text-sm text-ink-500 dark:text-travertine-300">
                  Nenhum item de repertório registrado ainda. Ele é extraído do acervo junto com a ficha do tópico.
                </p>
              ) : (
                lesson.essayRepertoire.map((item, index) => (
                  <div
                    key={index}
                    className="space-y-2.5 rounded-2xl border border-itamaraty-gold-500/40 bg-travertine-100 p-5 dark:bg-itamaraty-navy-900"
                  >
                    <p className="font-serif text-sm font-bold text-itamaraty-navy-700 dark:text-itamaraty-gold-400">{item.authorOrSource}</p>
                    <p className="font-serif text-xs leading-relaxed text-ink-900 dark:text-travertine-100">
                      <strong>Tese central:</strong> {item.coreThesis}
                    </p>
                    <p className="rounded-lg bg-travertine-50 px-3 py-2 font-mono text-[11px] text-ink-700 dark:bg-itamaraty-navy-950 dark:text-travertine-200">
                      <strong>Marco histórico / evidência:</strong> {item.historicalMilestone}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {tutorAvailable && (
        <TutorRAGDrawer
          isOpen={isTutorOpen}
          onClose={() => setIsTutorOpen(false)}
          subjectId={subject.id}
          topicId={topic.id}
          topicCode={topic.code}
          topicTitle={topic.title}
        />
      )}
    </div>
  );
}
