"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Lock,
  CheckCircle2,
  ArrowRight,
  GitBranch,
  LayoutGrid,
  Sparkles,
  Clock,
  Feather,
  FileCheck2,
  BookOpen,
  Filter,
  ShieldAlert,
} from "lucide-react";
import ChanceryHeader from "@/components/layout/ChanceryHeader";
import ModuleEditorialCover from "@/components/economics/ModuleEditorialCover";
import {
  DiplomaticBadge,
  MasteryStatus,
  resolveDiplomaticRank,
  AthosBulcaoPattern,
} from "@/components/ui/DiplomaticBadges";

export interface TopicTrailNode {
  id: string;
  code: string;
  official_edital_ref: string;
  title: string;
  pedagogical_order: number;
  estimated_minutes: number;
  is_critical_for_essay: boolean;
  status: MasteryStatus;
  tps_accuracy_rate: number;
  essay_readiness_score: number;
  prerequisites: Array<{
    code: string;
    title: string;
    isMet: boolean;
  }>;
  unlocksCodes: string[];
}

export interface ModuleTrailSection {
  id: string;
  code: string;
  title: string;
  description: string;
  pedagogical_order: number;
  topics: TopicTrailNode[];
}

interface EconomicsTrailClientProps {
  modules: ModuleTrailSection[];
  dueFlashcardsCount: number;
}

export default function EconomicsTrailClient({
  modules,
  dueFlashcardsCount,
}: EconomicsTrailClientProps) {
  const [learningLayer, setLearningLayer] = useState<"base" | "cacd">("base");
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>("ALL");
  const [onlyEssayCritical, setOnlyEssayCritical] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"modules" | "dependency_graph">("modules");
  const [highlightedTopicCode, setHighlightedTopicCode] = useState<string | null>("3.3");

  // Estatísticas globais da aluna na trilha de Economia
  const stats = useMemo(() => {
    const allTopics = modules.flatMap((m) => m.topics);
    const total = allTopics.length;
    const mastered = allTopics.filter((t) => t.status === "mastered").length;
    const studying = allTopics.filter(
      (t) =>
        t.status === "studying_base" ||
        t.status === "studying_advanced" ||
        t.status === "reviewing"
    ).length;
    const avgAccuracy =
      allTopics.reduce((acc, t) => acc + (t.tps_accuracy_rate || 0), 0) /
      Math.max(1, total);

    return {
      total,
      mastered,
      studying,
      completionPct: Math.round(((mastered + studying * 0.5) / Math.max(1, total)) * 100),
      avgAccuracy: Number(avgAccuracy.toFixed(1)),
    };
  }, [modules]);

  const filteredModules = useMemo(() => {
    return modules
      .filter((m) => selectedModuleFilter === "ALL" || m.code === selectedModuleFilter)
      .map((m) => ({
        ...m,
        topics: m.topics.filter((t) => (!onlyEssayCritical ? true : t.is_critical_for_essay)),
      }))
      .filter((m) => m.topics.length > 0);
  }, [modules, selectedModuleFilter, onlyEssayCritical]);

  // Todos os tópicos que possuem pré-requisitos ou destravam outros tópicos (para a visão do Grafo)
  const graphNodes = useMemo(() => {
    return modules
      .flatMap((m) =>
        m.topics.map((t) => ({
          ...t,
          moduleCode: m.code,
          moduleTitle: m.title,
        }))
      )
      .filter((t) => t.prerequisites.length > 0 || t.unlocksCodes.length > 0);
  }, [modules]);

  return (
    <div className="flex min-h-screen flex-col bg-travertine-50 dark:bg-itamaraty-navy-950">
      {/* Header Institucional */}
      <ChanceryHeader
        currentRank="segundo_secretario"
        learningLayer={learningLayer}
        onLayerChange={setLearningLayer}
        dueFlashcardsCount={dueFlashcardsCount}
        netTpsAccuracy={stats.avgAccuracy || 78.4}
      />

      {/* Hero Banner Arquitetônico — Palácio Itamaraty & Síntese da Trilha */}
      <section className="relative overflow-hidden border-b border-travertine-200 dark:border-itamaraty-navy-800 bg-chancery-gradient text-travertine-50 px-6 py-8">
        <AthosBulcaoPattern className="opacity-[0.06] text-itamaraty-gold-400" />

        <div className="relative mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-itamaraty-gold-500/40 bg-itamaraty-navy-950/60 px-3 py-1 text-xs text-itamaraty-gold-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Arquitetura Pedagógica em 4 Camadas • Edital CACD Economia</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Trilha Guiada de Economia para o Instituto Rio Branco
            </h1>

            <p className="font-serif text-sm sm:text-base text-travertine-200 leading-relaxed max-w-2xl">
              Do instrumental gráfico Base Zero aos modelos de economia aberta
              (Mundell-Fleming e Balanço de Pagamentos) e à historiografia econômica
              brasileira para discursivas de 90 linhas.
            </p>

            {/* Métricas de Progresso na Disciplina */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="rounded-xl border border-itamaraty-navy-700 bg-itamaraty-navy-950/70 p-3">
                <span className="text-[11px] uppercase tracking-wider text-travertine-300">
                  Módulos
                </span>
                <p className="font-mono text-xl font-bold text-itamaraty-gold-400 mt-0.5">
                  05 Blocos
                </p>
              </div>
              <div className="rounded-xl border border-itamaraty-navy-700 bg-itamaraty-navy-950/70 p-3">
                <span className="text-[11px] uppercase tracking-wider text-travertine-300">
                  Tópicos do Edital
                </span>
                <p className="font-mono text-xl font-bold text-white mt-0.5">
                  {stats.total} Tópicos
                </p>
              </div>
              <div className="rounded-xl border border-itamaraty-navy-700 bg-itamaraty-navy-950/70 p-3">
                <span className="text-[11px] uppercase tracking-wider text-travertine-300">
                  Avanço Global
                </span>
                <p className="font-mono text-xl font-bold text-itamaraty-emerald-400 mt-0.5">
                  {stats.completionPct}%
                </p>
              </div>
              <div className="rounded-xl border border-itamaraty-navy-700 bg-itamaraty-navy-950/70 p-3">
                <span className="text-[11px] uppercase tracking-wider text-travertine-300">
                  Fila FSRS Hoje
                </span>
                <p className="font-mono text-xl font-bold text-amber-300 mt-0.5">
                  {dueFlashcardsCount} cards
                </p>
              </div>
            </div>
          </div>

          {/* Ilustração Arquitetônica Vetorial do Palácio dos Arcos (Espelho d'Água + Meteoro) */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl border border-itamaraty-gold-500/40 bg-itamaraty-navy-950/90 p-4 shadow-diplomatic">
              <svg viewBox="0 0 420 210" className="w-full h-auto rounded-lg">
                <defs>
                  <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#08111D" />
                    <stop offset="100%" stopColor="#18304E" />
                  </linearGradient>
                  <linearGradient id="water-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#07362A" />
                    <stop offset="100%" stopColor="#08111D" />
                  </linearGradient>
                </defs>
                <rect width="420" height="145" fill="url(#sky-grad)" />
                <rect y="145" width="420" height="65" fill="url(#water-grad)" />
                {/* Laje Superior e Base do Palácio */}
                <rect x="35" y="48" width="350" height="6" fill="#F3EFE6" />
                <rect x="35" y="140" width="350" height="5" fill="#F3EFE6" />
                {/* Colunata de Arcos Modernistas de Oscar Niemeyer */}
                {[0, 1, 2, 3, 4, 5, 6].map((idx) => {
                  const x = 45 + idx * 48;
                  return (
                    <g key={idx}>
                      <path
                        d={`M ${x} 140 L ${x} 85 A 20 20 0 0 1 ${x + 40} 85 L ${x + 40} 140 Z`}
                        fill="#1E4471"
                        fillOpacity="0.55"
                        stroke="#F3EFE6"
                        strokeWidth="2"
                      />
                      {/* Reflexo no Espelho d'Água */}
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
                {/* Escultura "Meteoro" de Bruno Giorgi em Ouro */}
                <circle
                  cx="115"
                  cy="126"
                  r="14"
                  fill="#C59B27"
                  stroke="#F3EFE6"
                  strokeWidth="1.5"
                />
                <circle cx="115" cy="162" r="11" fill="#C59B27" fillOpacity="0.3" />
              </svg>
              <div className="mt-3 flex items-center justify-between text-[11px] text-travertine-200">
                <span className="font-serif italic">
                  Palácio Itamaraty • Escada de Dependência Lógica do Edital
                </span>
                <span className="font-mono text-itamaraty-gold-400">CACD • Economia</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Barra de Filtros e Alternador entre Módulos vs Grafo de Pré-Requisitos */}
      <div className="sticky top-[61px] z-20 border-b border-travertine-200 dark:border-itamaraty-navy-800 bg-travertine-100/95 dark:bg-itamaraty-navy-900/95 backdrop-blur-md px-6 py-3">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-4">
          {/* Filtro por Módulo */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-ink-500 dark:text-travertine-300 mr-1" />
            {[
              { code: "ALL", label: "Todos os Módulos (5)" },
              { code: "MOD-0", label: "Mód. 0: Base Zero" },
              { code: "MOD-1", label: "Mód. 1: Micro" },
              { code: "MOD-2", label: "Mód. 2: Macro & IS-LM" },
              { code: "MOD-3", label: "Mód. 3: Câmbio & BP" },
              { code: "MOD-4", label: "Mód. 4: Brasil" },
            ].map((btn) => (
              <button
                key={btn.code}
                type="button"
                onClick={() => setSelectedModuleFilter(btn.code)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  selectedModuleFilter === btn.code
                    ? "bg-itamaraty-navy-700 text-white dark:bg-itamaraty-gold-500 dark:text-itamaraty-navy-950"
                    : "bg-travertine-50 dark:bg-itamaraty-navy-950 text-ink-700 dark:text-travertine-200 hover:border-itamaraty-gold-500"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Alternador de Visão (Cards Modulares vs Grafo de Pré-requisitos) + Filtro 3ª Fase */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOnlyEssayCritical((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                onlyEssayCritical
                  ? "border-itamaraty-gold-500 bg-itamaraty-gold-500/15 text-itamaraty-gold-600 dark:text-itamaraty-gold-300"
                  : "border-travertine-300 dark:border-itamaraty-navy-700 text-ink-700 dark:text-travertine-200"
              }`}
            >
              <Feather className="h-3.5 w-3.5" />
              <span>Críticos 3ª Fase (90 Linhas)</span>
            </button>

            <div className="flex rounded-xl border border-travertine-300 dark:border-itamaraty-navy-700 bg-travertine-50 dark:bg-itamaraty-navy-950 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("modules")}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  viewMode === "modules"
                    ? "bg-itamaraty-navy-600 text-white dark:bg-itamaraty-gold-500 dark:text-itamaraty-navy-950"
                    : "text-ink-500 dark:text-travertine-300"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Estante Modular</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("dependency_graph")}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  viewMode === "dependency_graph"
                    ? "bg-itamaraty-navy-600 text-white dark:bg-itamaraty-gold-500 dark:text-itamaraty-navy-950"
                    : "text-ink-500 dark:text-travertine-300"
                }`}
              >
                <GitBranch className="h-3.5 w-3.5" />
                <span>Grafo de Pré-requisitos</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Corpo Principal da Página */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 space-y-12">
        {/* VISÃO A: GRAFO INTERATIVO DE PRÉ-REQUISITOS PEDAGÓGICOS */}
        {viewMode === "dependency_graph" && (
          <section className="rounded-2xl border border-travertine-200 dark:border-itamaraty-navy-800 bg-travertine-100 dark:bg-itamaraty-navy-900 p-6 space-y-6 shadow-parchment">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-travertine-200 dark:border-itamaraty-navy-800 pb-4">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-itamaraty-gold-600 dark:text-itamaraty-gold-400">
                  Árvore de Dependência Lógica (`topic_prerequisites`)
                </span>
                <h2 className="font-serif text-xl font-bold text-ink-900 dark:text-white mt-0.5">
                  Por que estudamos nessa ordem antes de avançar para a História Econômica?
                </h2>
              </div>
              <p className="text-xs text-ink-500 dark:text-travertine-300 max-w-md">
                Clique em qualquer nó crítico abaixo para inspecionar quais conceitos de
                base ele exige e quais temas históricos ele destrava.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {graphNodes.map((node) => {
                const isSelected = highlightedTopicCode === node.code;
                return (
                  <div
                    key={node.code}
                    onClick={() => setHighlightedTopicCode(node.code)}
                    className={`cursor-pointer rounded-xl border p-4 transition space-y-3 ${
                      isSelected
                        ? "border-itamaraty-gold-500 bg-travertine-50 dark:bg-itamaraty-navy-950 shadow-diplomatic"
                        : "border-travertine-200 dark:border-itamaraty-navy-800 bg-travertine-50/70 dark:bg-itamaraty-navy-950/60 hover:border-itamaraty-gold-500/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-itamaraty-navy-700 dark:bg-itamaraty-gold-500 px-2 py-0.5 font-mono text-xs font-bold text-white dark:text-itamaraty-navy-950">
                        Tópico {node.code}
                      </span>
                      <span className="font-mono text-[11px] text-ink-500 dark:text-travertine-300">
                        {node.moduleCode}
                      </span>
                    </div>

                    <h3 className="font-serif text-sm font-bold text-ink-900 dark:text-white">
                      {node.title}
                    </h3>

                    {/* Pré-requisitos exigidos */}
                    {node.prerequisites.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-travertine-200 dark:border-itamaraty-navy-800">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500 dark:text-travertine-300">
                          Exige domínio prévio de:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {node.prerequisites.map((pre) => (
                            <span
                              key={pre.code}
                              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[11px] ${
                                pre.isMet
                                  ? "bg-itamaraty-emerald-950/30 text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400 border border-itamaraty-emerald-700/40"
                                  : "bg-itamaraty-carmine-900/20 text-itamaraty-carmine-500 border border-itamaraty-carmine-700/40"
                              }`}
                            >
                              {pre.isMet ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <Lock className="h-3 w-3" />
                              )}
                              {pre.code}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tópicos que este nó destrava */}
                    {node.unlocksCodes.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-travertine-200 dark:border-itamaraty-navy-800">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-itamaraty-gold-600 dark:text-itamaraty-gold-400">
                          Destrava diretamente:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {node.unlocksCodes.map((uCode) => (
                            <span
                              key={uCode}
                              className="rounded bg-itamaraty-gold-500/15 border border-itamaraty-gold-500/40 px-2 py-0.5 font-mono text-[11px] font-bold text-itamaraty-gold-600 dark:text-itamaraty-gold-300"
                            >
                              → Tópico {uCode}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <Link
                        href={`/economia/${node.code}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-itamaraty-navy-600 dark:text-itamaraty-gold-400 hover:underline"
                      >
                        <span>Abrir Estúdio do Tópico {node.code}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* VISÃO B: ESTANTE MODULAR COM AS 5 CAPAS EDITORIAIS E OS 24 TÓPICOS */}
        {filteredModules.map((mod) => {
          const modTopicsCount = mod.topics.length;
          const modCompleted = mod.topics.filter(
            (t) => t.status === "mastered" || t.status === "reviewing"
          ).length;
          const modProgressPct = Math.round(
            (modCompleted / Math.max(1, modTopicsCount)) * 100
          );

          return (
            <section
              key={mod.code}
              className="rounded-3xl border border-travertine-200 dark:border-itamaraty-navy-800 bg-travertine-100/70 dark:bg-itamaraty-navy-900/80 p-6 sm:p-8 space-y-6 shadow-parchment"
            >
              {/* Cabeçalho do Módulo com Capa Editorial Itamaraty */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center border-b border-travertine-200 dark:border-itamaraty-navy-800 pb-6">
                <div className="lg:col-span-4">
                  <ModuleEditorialCover moduleCode={mod.code} />
                </div>

                <div className="lg:col-span-8 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-md bg-itamaraty-navy-700 dark:bg-itamaraty-gold-500 px-2.5 py-1 font-mono text-xs font-bold text-white dark:text-itamaraty-navy-950">
                      {mod.code} • Etapa Pedagógica #{mod.pedagogical_order + 1}
                    </span>
                    <span className="font-mono text-xs font-bold text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400">
                      {modCompleted} de {modTopicsCount} tópicos consolidados ({modProgressPct}%)
                    </span>
                  </div>

                  <h2 className="font-serif text-2xl font-bold text-ink-900 dark:text-white">
                    {mod.title}
                  </h2>

                  <p className="font-serif text-sm text-ink-700 dark:text-travertine-200 leading-relaxed">
                    {mod.description}
                  </p>

                  {/* Barra de Progresso do Módulo */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-travertine-200 dark:bg-itamaraty-navy-950">
                    <div
                      className="h-full rounded-full bg-itamaraty-emerald-600 dark:bg-itamaraty-gold-500 transition-all"
                      style={{ width: `${Math.max(12, modProgressPct)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Grid de Tópicos do Módulo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mod.topics.map((topic) => {
                  const rankMeta = resolveDiplomaticRank(
                    topic.status,
                    topic.tps_accuracy_rate
                  );
                  const unmetPrereqs = topic.prerequisites.filter((p) => !p.isMet);
                  const isLockedByPrereq =
                    topic.status === "locked" && unmetPrereqs.length > 0;

                  return (
                    <div
                      key={topic.code}
                      className={`group relative flex flex-col justify-between rounded-2xl border p-5 transition ${
                        isLockedByPrereq
                          ? "border-travertine-200/80 dark:border-itamaraty-navy-800/70 bg-travertine-50/50 dark:bg-itamaraty-navy-950/50 opacity-85"
                          : "border-travertine-200 dark:border-itamaraty-navy-800 bg-travertine-50 dark:bg-itamaraty-navy-950 hover:border-itamaraty-gold-500 shadow-sm"
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Topo do Card: Código + Insígnia da Carreira */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded bg-itamaraty-navy-800 px-2 py-0.5 font-mono text-xs font-bold text-itamaraty-gold-300">
                                {topic.code}
                              </span>
                              <span className="font-mono text-[11px] text-ink-500 dark:text-travertine-300">
                                {topic.official_edital_ref}
                              </span>
                              {topic.is_critical_for_essay && (
                                <span className="rounded bg-itamaraty-gold-500/15 border border-itamaraty-gold-500/40 px-2 py-0.5 text-[10px] font-bold text-itamaraty-gold-600 dark:text-itamaraty-gold-300">
                                  ★ 3ª Fase
                                </span>
                              )}
                            </div>

                            <h3 className="font-serif text-base font-bold text-ink-900 dark:text-white group-hover:text-itamaraty-navy-600 dark:group-hover:text-itamaraty-gold-400 transition">
                              {topic.title}
                            </h3>
                          </div>

                          <DiplomaticBadge rank={rankMeta.rank} size="sm" />
                        </div>

                        {/* Grafo de Pré-requisitos Diretos do Tópico */}
                        {topic.prerequisites.length > 0 && (
                          <div className="rounded-xl border border-travertine-200 dark:border-itamaraty-navy-800 bg-travertine-100/70 dark:bg-itamaraty-navy-900/70 p-2.5 space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-ink-700 dark:text-travertine-200">
                              <GitBranch className="h-3.5 w-3.5 text-itamaraty-gold-600 dark:text-itamaraty-gold-400" />
                              <span>Pré-requisitos pedagógicos:</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {topic.prerequisites.map((pre) => (
                                <Link
                                  key={pre.code}
                                  href={`/economia/${pre.code}`}
                                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold transition ${
                                    pre.isMet
                                      ? "bg-itamaraty-emerald-950/25 text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400 border border-itamaraty-emerald-700/40"
                                      : "bg-amber-950/25 text-amber-700 dark:text-amber-300 border border-amber-600/40"
                                  }`}
                                  title={pre.title}
                                >
                                  {pre.isMet ? (
                                    <CheckCircle2 className="h-3 w-3" />
                                  ) : (
                                    <ShieldAlert className="h-3 w-3" />
                                  )}
                                  <span>
                                    {pre.code} ({pre.title.slice(0, 24)}...)
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Rodapé do Card: Métricas e Botão de Entrada no Estúdio */}
                      <div className="mt-5 flex items-center justify-between border-t border-travertine-200 dark:border-itamaraty-navy-800 pt-3.5">
                        <div className="flex items-center gap-3 text-xs text-ink-500 dark:text-travertine-300">
                          <span className="inline-flex items-center gap-1 font-mono">
                            <Clock className="h-3.5 w-3.5" />
                            {topic.estimated_minutes}m
                          </span>
                          <span>•</span>
                          <span className="font-mono">
                            TPS:{" "}
                            <strong className="text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400">
                              {topic.tps_accuracy_rate}%
                            </strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/economia/${topic.code}`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-itamaraty-navy-600 hover:bg-itamaraty-navy-700 dark:bg-itamaraty-gold-500 dark:hover:bg-itamaraty-gold-400 px-3.5 py-2 text-xs font-bold text-white dark:text-itamaraty-navy-950 transition"
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            <span>Estudar Tópico</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
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