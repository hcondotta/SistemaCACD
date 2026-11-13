"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Clock, Feather, Filter, GitBranch, LayoutGrid, Lock, Sparkles } from "lucide-react";
import ModuleEditorialCover from "@/components/economics/ModuleEditorialCover";
import { MASTERY_STATUS_LABELS } from "@/components/economics/status-labels";
import { AthosBulcaoPattern, DiplomaticBadge } from "@/components/ui/DiplomaticBadges";
import type { SubjectTrail } from "@/lib/data/study-data";
import { resolveDiplomaticRank, type TrailTopic } from "@/lib/trail";

type ViewMode = "modules" | "dependency_graph";

const ALL_MODULES = "ALL";

/** Pré-requisito pendente: o que falta a aluna concluir para destravar o tópico. */
function UnmetPrerequisites({ topic }: { topic: TrailTopic }) {
  const unmet = topic.prerequisites.filter((p) => !p.isMet);
  if (unmet.length === 0) return null;
  return (
    <p className="text-[11px] leading-relaxed text-ink-500 dark:text-travertine-300">
      Conclua a Camada 1 de{" "}
      {unmet.map((p, index) => (
        <span key={p.code}>
          {index > 0 && (index === unmet.length - 1 ? " e " : ", ")}
          <Link href={`/economia/${p.code}`} className="font-mono font-semibold text-itamaraty-navy-600 hover:underline dark:text-itamaraty-gold-400">
            {p.code}
          </Link>
        </span>
      ))}{" "}
      para destravar.
    </p>
  );
}

export default function EconomicsTrailClient({
  trail,
  dueFlashcards,
  initialModuleCode,
}: {
  trail: SubjectTrail;
  dueFlashcards: number | null;
  initialModuleCode: string | null;
}) {
  const [selectedModule, setSelectedModule] = useState<string>(initialModuleCode ?? ALL_MODULES);
  const [onlyEssayCritical, setOnlyEssayCritical] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("modules");
  const [highlightedTopicCode, setHighlightedTopicCode] = useState<string | null>(null);
  const svgUid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const skyGradientId = `palacio-ceu-${svgUid}`;
  const waterGradientId = `palacio-agua-${svgUid}`;

  const { summary } = trail;

  const filteredModules = useMemo(
    () =>
      trail.modules
        .filter((m) => selectedModule === ALL_MODULES || m.code === selectedModule)
        .map((m) => ({ ...m, topics: m.topics.filter((t) => !onlyEssayCritical || t.isCriticalForEssay) }))
        .filter((m) => m.topics.length > 0),
    [trail.modules, selectedModule, onlyEssayCritical],
  );

  const graphNodes = useMemo(
    () =>
      trail.modules
        .flatMap((m) => m.topics.map((t) => ({ ...t, moduleCode: m.code })))
        .filter((t) => t.prerequisites.length > 0 || t.unlocksCodes.length > 0),
    [trail.modules],
  );

  return (
    <div className="flex flex-1 flex-col">
      {/* Hero: Palácio Itamaraty e síntese real da trilha */}
      <section className="relative overflow-hidden border-b border-travertine-200 bg-chancery-gradient px-5 py-8 text-travertine-50 sm:px-6 dark:border-itamaraty-navy-800">
        <AthosBulcaoPattern className="opacity-[0.06] text-itamaraty-gold-400" />

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-itamaraty-gold-500/40 bg-itamaraty-navy-950/60 px-3 py-1 text-xs text-itamaraty-gold-300">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              <span>
                {trail.modules.length} módulos sequenciais com trava de pré-requisito • Edital CACD
              </span>
            </div>

            <h1 className="font-serif text-3xl font-bold tracking-tight text-travertine-50 sm:text-4xl">
              Trilha Guiada de {trail.subject.name}
            </h1>

            <p className="max-w-2xl font-serif text-sm leading-relaxed text-travertine-200 sm:text-base">
              Do instrumental gráfico Base Zero aos modelos de economia aberta (Mundell-Fleming e Balanço de
              Pagamentos) e à historiografia econômica brasileira para as discursivas de 90 linhas.
            </p>

            {/* Métricas reais */}
            <dl className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
              {[
                { label: "Tópicos do edital", value: String(summary.total), tone: "text-travertine-50" },
                {
                  label: "Teoria concluída",
                  value: `${summary.theoryDone}/${summary.total}`,
                  tone: "text-itamaraty-emerald-400",
                },
                { label: "Em estudo", value: String(summary.inProgress), tone: "text-itamaraty-gold-300" },
                {
                  label: "FSRS hoje",
                  value: dueFlashcards === null ? "—" : `${dueFlashcards} cards`,
                  tone: "text-itamaraty-gold-400",
                },
              ].map((metric) => (
                <div key={metric.label} className="rounded-xl border border-itamaraty-navy-700 bg-itamaraty-navy-950/70 p-3">
                  <dt className="text-[11px] uppercase tracking-wider text-travertine-300">{metric.label}</dt>
                  <dd className={`mt-0.5 font-mono text-xl font-bold ${metric.tone}`}>{metric.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Palácio dos Arcos: espelho d'água e Meteoro */}
          <div className="hidden lg:col-span-5 lg:block">
            <div className="relative rounded-2xl border border-itamaraty-gold-500/40 bg-itamaraty-navy-950/90 p-4 shadow-diplomatic">
              <svg viewBox="0 0 420 210" className="h-auto w-full rounded-lg" aria-hidden="true">
                <defs>
                  <linearGradient id={skyGradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#08111D" />
                    <stop offset="100%" stopColor="#18304E" />
                  </linearGradient>
                  <linearGradient id={waterGradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#07362A" />
                    <stop offset="100%" stopColor="#08111D" />
                  </linearGradient>
                </defs>
                <rect width="420" height="145" fill={`url(#${skyGradientId})`} />
                <rect y="145" width="420" height="65" fill={`url(#${waterGradientId})`} />
                <rect x="35" y="48" width="350" height="6" fill="#F3EFE6" />
                <rect x="35" y="140" width="350" height="5" fill="#F3EFE6" />
                {[0, 1, 2, 3, 4, 5, 6].map((index) => {
                  const x = 45 + index * 48;
                  return (
                    <g key={index}>
                      <path
                        d={`M ${x} 140 L ${x} 85 A 20 20 0 0 1 ${x + 40} 85 L ${x + 40} 140 Z`}
                        fill="#1E4471"
                        fillOpacity="0.55"
                        stroke="#F3EFE6"
                        strokeWidth="2"
                      />
                      <path
                        d={`M ${x} 150 L ${x} 185 A 20 15 0 0 0 ${x + 40} 185 L ${x + 40} 150 Z`}
                        fill="none"
                        stroke="#E5C76B"
                        strokeWidth="1"
                        strokeOpacity="0.22"
                      />
                    </g>
                  );
                })}
                <circle cx="115" cy="126" r="14" fill="#C59B27" stroke="#F3EFE6" strokeWidth="1.5" />
                <circle cx="115" cy="162" r="11" fill="#C59B27" fillOpacity="0.3" />
              </svg>
              <div className="mt-3 flex items-center justify-between text-[11px] text-travertine-200">
                <span className="font-serif italic">Palácio Itamaraty • Escada de dependência lógica do edital</span>
                <span className="font-mono text-itamaraty-gold-400">CACD</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filtros e alternador de visão */}
      <div className="sticky top-14 z-20 border-b border-travertine-200 bg-travertine-100/95 px-5 py-3 backdrop-blur-md sm:px-6 dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-900/95">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por módulo">
            <Filter className="mr-1 h-3.5 w-3.5 text-ink-500 dark:text-travertine-300" aria-hidden />
            {[{ code: ALL_MODULES, label: `Todos (${trail.modules.length})` }, ...trail.modules.map((m) => ({ code: m.code, label: m.code }))].map(
              (option) => (
                <button
                  key={option.code}
                  type="button"
                  aria-pressed={selectedModule === option.code}
                  onClick={() => setSelectedModule(option.code)}
                  className={`rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold transition ${
                    selectedModule === option.code
                      ? "bg-itamaraty-navy-700 text-travertine-50 dark:bg-itamaraty-gold-500 dark:text-itamaraty-navy-950"
                      : "bg-travertine-50 text-ink-700 hover:text-ink-900 dark:bg-itamaraty-navy-950 dark:text-travertine-200"
                  }`}
                >
                  {option.label}
                </button>
              ),
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={onlyEssayCritical}
              onClick={() => setOnlyEssayCritical((previous) => !previous)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                onlyEssayCritical
                  ? "border-itamaraty-gold-500 bg-itamaraty-gold-500/15 text-itamaraty-gold-700 dark:text-itamaraty-gold-300"
                  : "border-travertine-300 text-ink-700 dark:border-itamaraty-navy-700 dark:text-travertine-200"
              }`}
            >
              <Feather className="h-3.5 w-3.5" aria-hidden />
              <span>Críticos 3ª Fase</span>
            </button>

            <div className="flex rounded-xl border border-travertine-300 bg-travertine-50 p-0.5 dark:border-itamaraty-navy-700 dark:bg-itamaraty-navy-950" role="group" aria-label="Visão">
              {([
                { id: "modules", label: "Estante Modular", icon: LayoutGrid },
                { id: "dependency_graph", label: "Grafo de Pré-requisitos", icon: GitBranch },
              ] as const).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={viewMode === id}
                  onClick={() => setViewMode(id)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    viewMode === id
                      ? "bg-itamaraty-navy-600 text-travertine-50 dark:bg-itamaraty-gold-500 dark:text-itamaraty-navy-950"
                      : "text-ink-500 dark:text-travertine-300"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-12 px-5 py-8 sm:px-6">
        {/* VISÃO A: grafo de pré-requisitos */}
        {viewMode === "dependency_graph" && (
          <section className="space-y-6 rounded-2xl border border-travertine-200 bg-travertine-100 p-6 shadow-parchment dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-900">
            <div className="flex flex-col justify-between gap-4 border-b border-travertine-200 pb-4 md:flex-row md:items-center dark:border-itamaraty-navy-800">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-itamaraty-gold-600 dark:text-itamaraty-gold-400">
                  Árvore de dependência lógica
                </span>
                <h2 className="mt-0.5 font-serif text-xl font-bold text-ink-900 dark:text-travertine-50">
                  Por que estudar nesta ordem
                </h2>
              </div>
              <p className="max-w-md text-xs text-ink-500 dark:text-travertine-300">
                Cada nó mostra a base que exige e o que destrava. Um pré-requisito conta como cumprido quando a Camada 1
                dele estiver concluída.
              </p>
            </div>

            {graphNodes.length === 0 ? (
              <p className="text-sm text-ink-500 dark:text-travertine-300">Nenhum pré-requisito cadastrado nesta trilha.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {graphNodes.map((node) => {
                  const isSelected = highlightedTopicCode === node.code;
                  const isLocked = node.status === "locked";
                  return (
                    <div
                      key={node.code}
                      onClick={() => setHighlightedTopicCode(node.code)}
                      className={`space-y-3 rounded-xl border p-4 transition ${
                        isSelected
                          ? "border-itamaraty-gold-500 bg-travertine-50 shadow-diplomatic dark:bg-itamaraty-navy-950"
                          : "border-travertine-200 bg-travertine-50/70 hover:border-itamaraty-gold-500/50 dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-950/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-itamaraty-navy-700 px-2 py-0.5 font-mono text-xs font-bold text-travertine-50 dark:bg-itamaraty-gold-500 dark:text-itamaraty-navy-950">
                          {node.code}
                        </span>
                        <span className="font-mono text-[11px] text-ink-500 dark:text-travertine-300">{node.moduleCode}</span>
                      </div>

                      <h3 className="font-serif text-sm font-bold text-ink-900 dark:text-travertine-50">{node.title}</h3>

                      {node.prerequisites.length > 0 && (
                        <div className="space-y-1 border-t border-travertine-200 pt-2 dark:border-itamaraty-navy-800">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500 dark:text-travertine-300">
                            Exige a Camada 1 de:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {node.prerequisites.map((pre) => (
                              <span
                                key={pre.code}
                                title={pre.title}
                                className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[11px] ${
                                  pre.isMet
                                    ? "border-itamaraty-emerald-700/40 bg-itamaraty-emerald-500/10 text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400"
                                    : "border-itamaraty-carmine-700/40 bg-itamaraty-carmine-500/10 text-itamaraty-carmine-700 dark:text-itamaraty-carmine-500"
                                }`}
                              >
                                {pre.isMet ? <CheckCircle2 className="h-3 w-3" aria-hidden /> : <Lock className="h-3 w-3" aria-hidden />}
                                {pre.code}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {node.unlocksCodes.length > 0 && (
                        <div className="space-y-1 border-t border-travertine-200 pt-2 dark:border-itamaraty-navy-800">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-itamaraty-gold-600 dark:text-itamaraty-gold-400">
                            Destrava diretamente:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {node.unlocksCodes.map((code) => (
                              <span
                                key={code}
                                className="rounded border border-itamaraty-gold-500/40 bg-itamaraty-gold-500/15 px-2 py-0.5 font-mono text-[11px] font-bold text-itamaraty-gold-700 dark:text-itamaraty-gold-300"
                              >
                                → {code}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-2">
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-ink-500 dark:text-travertine-300">
                            <Lock className="h-3.5 w-3.5" aria-hidden />
                            Bloqueado
                          </span>
                        ) : (
                          <Link
                            href={`/economia/${node.code}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-itamaraty-navy-600 hover:underline dark:text-itamaraty-gold-400"
                          >
                            Abrir o estúdio do tópico
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* VISÃO B: estante modular */}
        {viewMode === "modules" && filteredModules.length === 0 && (
          <p className="text-sm text-ink-500 dark:text-travertine-300">Nenhum tópico corresponde a este filtro.</p>
        )}

        {viewMode === "modules" &&
          filteredModules.map((mod) => {
            const done = mod.topics.filter((t) => t.status === "reviewing" || t.status === "mastered").length;
            const percent = Math.round((done / mod.topics.length) * 100);

            return (
              <section
                key={mod.code}
                aria-labelledby={`modulo-${mod.code}`}
                className="space-y-6 rounded-3xl border border-travertine-200 bg-travertine-100/70 p-6 shadow-parchment sm:p-8 dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-900/80"
              >
                <div className="grid grid-cols-1 items-center gap-6 border-b border-travertine-200 pb-6 lg:grid-cols-12 dark:border-itamaraty-navy-800">
                  <div className="lg:col-span-4">
                    <ModuleEditorialCover moduleCode={mod.code} />
                  </div>

                  <div className="space-y-3 lg:col-span-8">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-md bg-itamaraty-navy-700 px-2.5 py-1 font-mono text-xs font-bold text-travertine-50 dark:bg-itamaraty-gold-500 dark:text-itamaraty-navy-950">
                        {mod.code} • Etapa {mod.pedagogicalOrder + 1}
                      </span>
                      <span className="font-mono text-xs font-bold text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400">
                        {done} de {mod.topics.length} com a teoria concluída
                      </span>
                    </div>

                    <h2 id={`modulo-${mod.code}`} className="font-serif text-2xl font-bold text-ink-900 dark:text-travertine-50">
                      {mod.title}
                    </h2>

                    {mod.description && (
                      <p className="font-serif text-sm leading-relaxed text-ink-700 dark:text-travertine-200">{mod.description}</p>
                    )}

                    <div
                      className="h-2 w-full overflow-hidden rounded-full bg-travertine-200 dark:bg-itamaraty-navy-950"
                      role="progressbar"
                      aria-valuenow={percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${mod.code}: ${percent}% dos tópicos com a teoria concluída`}
                    >
                      <div
                        className="h-full rounded-full bg-itamaraty-emerald-600 transition-all dark:bg-itamaraty-gold-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {mod.topics.map((topic) => {
                    const rank = resolveDiplomaticRank(topic.status, null);
                    const isLocked = topic.status === "locked";

                    return (
                      <article
                        key={topic.code}
                        className={`group relative flex flex-col justify-between rounded-2xl border p-5 transition ${
                          isLocked
                            ? "border-travertine-200/80 bg-travertine-50/50 dark:border-itamaraty-navy-800/70 dark:bg-itamaraty-navy-950/50"
                            : "border-travertine-200 bg-travertine-50 shadow-sm hover:border-itamaraty-gold-500 dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-950"
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded bg-itamaraty-navy-800 px-2 py-0.5 font-mono text-xs font-bold text-itamaraty-gold-300">
                                  {topic.code}
                                </span>
                                {topic.officialEditalRef && (
                                  <span className="font-mono text-[11px] text-ink-500 dark:text-travertine-300">
                                    {topic.officialEditalRef}
                                  </span>
                                )}
                                {topic.isCriticalForEssay && (
                                  <span className="rounded border border-itamaraty-gold-500/40 bg-itamaraty-gold-500/15 px-2 py-0.5 text-[10px] font-bold text-itamaraty-gold-700 dark:text-itamaraty-gold-300">
                                    ★ 3ª Fase
                                  </span>
                                )}
                              </div>
                              <h3
                                className={`font-serif text-base font-bold ${
                                  isLocked ? "text-ink-500 dark:text-travertine-300" : "text-ink-900 dark:text-travertine-50"
                                }`}
                              >
                                {topic.title}
                              </h3>
                            </div>
                            {rank && <DiplomaticBadge rank={rank} size="sm" />}
                          </div>

                          {topic.prerequisites.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <GitBranch className="h-3.5 w-3.5 text-itamaraty-gold-600 dark:text-itamaraty-gold-400" aria-hidden />
                              {topic.prerequisites.map((pre) => (
                                <span
                                  key={pre.code}
                                  title={`${pre.code} — ${pre.title}`}
                                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold ${
                                    pre.isMet
                                      ? "border-itamaraty-emerald-700/40 bg-itamaraty-emerald-500/10 text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400"
                                      : "border-amber-trap-500/40 bg-amber-trap-500/10 text-amber-trap-500"
                                  }`}
                                >
                                  {pre.isMet ? <CheckCircle2 className="h-3 w-3" aria-hidden /> : <Lock className="h-3 w-3" aria-hidden />}
                                  {pre.code}
                                </span>
                              ))}
                            </div>
                          )}

                          {isLocked && <UnmetPrerequisites topic={topic} />}
                        </div>

                        <div className="mt-5 flex items-center justify-between gap-3 border-t border-travertine-200 pt-3.5 dark:border-itamaraty-navy-800">
                          <div className="flex items-center gap-3 text-xs text-ink-500 dark:text-travertine-300">
                            {topic.estimatedMinutes !== null && (
                              <span className="inline-flex items-center gap-1 font-mono">
                                <Clock className="h-3.5 w-3.5" aria-hidden />
                                {topic.estimatedMinutes} min
                              </span>
                            )}
                            <span>{MASTERY_STATUS_LABELS[topic.status]}</span>
                          </div>

                          {isLocked ? (
                            <span className="inline-flex items-center gap-1.5 rounded-xl border border-travertine-300 px-3.5 py-2 text-xs font-bold text-ink-500 dark:border-itamaraty-navy-700 dark:text-travertine-300">
                              <Lock className="h-3.5 w-3.5" aria-hidden />
                              Bloqueado
                            </span>
                          ) : (
                            <Link
                              href={`/economia/${topic.code}`}
                              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-itamaraty-navy-600 px-3.5 py-2 text-xs font-bold text-travertine-50 transition hover:bg-itamaraty-navy-700 dark:bg-itamaraty-gold-500 dark:text-itamaraty-navy-950 dark:hover:bg-itamaraty-gold-400"
                            >
                              <BookOpen className="h-3.5 w-3.5" aria-hidden />
                              Estudar
                              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                            </Link>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
      </main>
    </div>
  );
}
