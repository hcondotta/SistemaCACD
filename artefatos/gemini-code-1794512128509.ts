"use client";

import React, { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BookOpen,
  Award,
  TrendingUp,
  AlertTriangle,
  Quote,
  MessageSquareText,
  Columns2,
  CheckCircle2,
  ArrowLeft,
  Clock,
  FileCheck2,
  Feather,
} from "lucide-react";
import ChanceryHeader from "@/components/layout/ChanceryHeader";
import CausalGraphTranslator, {
  CausalModelData,
} from "@/components/economics/CausalGraphTranslator";
import TutorRAGDrawer from "@/components/tutor/TutorRAGDrawer";
import {
  DiplomaticBadge,
  MasteryStatus,
  resolveDiplomaticRank,
  AthosBulcaoPattern,
} from "@/components/ui/DiplomaticBadges";

export interface TPSTrapItem {
  wrong_claim: string;
  truth_mechanism: string;
  trap_category?: string;
  trap_type?: string;
}

export interface EssayRepertoireItem {
  author_or_source: string;
  core_thesis: string;
  historical_data_or_milestone: string;
}

export interface TopicStudioClientProps {
  subjectId: string;
  topic: {
    id: string;
    code: string;
    title: string;
    official_edital_ref: string;
    estimated_minutes: number;
    is_critical_for_essay: boolean;
    module_code: string;
    module_title: string;
  };
  progress: {
    status: MasteryStatus;
    tps_accuracy_rate: number;
    essay_readiness_score: number;
  };
  prerequisites: Array<{ code: string; title: string }>;
  lesson: {
    base_intuition_md: string;
    cacd_deep_dive_md: string;
    tps_traps_json: TPSTrapItem[];
    essay_repertoire_json: EssayRepertoireItem[];
  };
  causalModels: CausalModelData[];
  dueFlashcardsCount: number;
}

export default function TopicStudioClient({
  subjectId,
  topic,
  progress,
  prerequisites,
  lesson,
  causalModels,
  dueFlashcardsCount,
}: TopicStudioClientProps) {
  const [learningLayer, setLearningLayer] = useState<"base" | "cacd">("base");
  const [sideBySideMode, setSideBySideMode] = useState(false);
  const [activeStudioTab, setActiveStudioTab] = useState<
    "ficha" | "graficos" | "armadilhas_repertorio"
  >("ficha");
  const [isTutorOpen, setIsTutorOpen] = useState(false);
  const [masteryStatus, setMasteryStatus] = useState<MasteryStatus>(progress.status);

  const currentRankMeta = resolveDiplomaticRank(masteryStatus, progress.tps_accuracy_rate);

  return (
    <div className="flex min-h-screen flex-col bg-travertine-50 dark:bg-itamaraty-navy-950">
      {/* Header Institucional com Alternador de Tema e Camada */}
      <ChanceryHeader
        currentRank={currentRankMeta.rank}
        learningLayer={learningLayer}
        onLayerChange={setLearningLayer}
        dueFlashcardsCount={dueFlashcardsCount}
        netTpsAccuracy={progress.tps_accuracy_rate || 76.5}
      />

      {/* Hero do Tópico com Padrão Athos Bulcão */}
      <section className="relative border-b border-travertine-200 dark:border-itamaraty-navy-800 bg-travertine-100/90 dark:bg-itamaraty-navy-900 px-6 py-6 overflow-hidden">
        <AthosBulcaoPattern className="opacity-[0.04] text-itamaraty-navy-700 dark:text-itamaraty-gold-400" />

        <div className="relative mx-auto max-w-6xl space-y-4">
          {/* Breadcrumb e Pré-requisitos */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <Link
                href="/economia"
                className="inline-flex items-center gap-1.5 font-semibold text-itamaraty-navy-600 dark:text-itamaraty-gold-400 hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Trilha de Economia</span>
              </Link>
              <span className="text-ink-500">•</span>
              <span className="font-mono font-bold text-ink-700 dark:text-travertine-200">
                {topic.module_code}: {topic.module_title}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {topic.is_critical_for_essay && (
                <span className="rounded-full border border-itamaraty-gold-500/50 bg-itamaraty-gold-500/15 px-3 py-0.5 text-[11px] font-bold text-itamaraty-gold-600 dark:text-itamaraty-gold-300">
                  ★ Alta Incidência na 3ª Fase (90 Linhas)
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-travertine-200/80 dark:bg-itamaraty-navy-800 px-2.5 py-0.5 font-mono text-[11px] text-ink-700 dark:text-travertine-200">
                <Clock className="h-3 w-3" />
                {topic.estimated_minutes} min
              </span>
            </div>
          </div>

          {/* Título do Tópico + Botão do Tutor RAG */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400">
                Tópico {topic.code} • Edital Oficial: {topic.official_edital_ref}
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink-900 dark:text-white">
                {topic.title}
              </h1>

              {prerequisites.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-ink-500 dark:text-travertine-300">
                  <span>Base necessária concluída:</span>
                  {prerequisites.map((pre) => (
                    <Link
                      key={pre.code}
                      href={`/economia/${pre.code}`}
                      className="rounded bg-travertine-200 dark:bg-itamaraty-navy-800 px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-900 dark:text-travertine-100 hover:border-itamaraty-gold-500"
                    >
                      {pre.code} — {pre.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Ações Rápidas do Estúdio */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsTutorOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-itamaraty-navy-600 hover:bg-itamaraty-navy-700 dark:bg-itamaraty-gold-500 dark:hover:bg-itamaraty-gold-400 px-4 py-2.5 text-xs font-bold text-white dark:text-itamaraty-navy-950 shadow-sm transition"
              >
                <MessageSquareText className="h-4 w-4" />
                <span>Abrir Tutor IA (Acervo RAG)</span>
              </button>

              <Link
                href={`/tps?topic=${topic.code}`}
                className="flex items-center gap-1.5 rounded-xl border border-travertine-300 dark:border-itamaraty-navy-700 bg-travertine-50 dark:bg-itamaraty-navy-800 px-3.5 py-2.5 text-xs font-semibold text-ink-900 dark:text-travertine-100 hover:border-itamaraty-gold-500 transition"
              >
                <FileCheck2 className="h-4 w-4 text-itamaraty-emerald-600 dark:text-itamaraty-emerald-400" />
                <span>Treinar TPS</span>
              </Link>

              <Link
                href={`/discursivas?topic=${topic.code}`}
                className="flex items-center gap-1.5 rounded-xl border border-travertine-300 dark:border-itamaraty-navy-700 bg-travertine-50 dark:bg-itamaraty-navy-800 px-3.5 py-2.5 text-xs font-semibold text-ink-900 dark:text-travertine-100 hover:border-itamaraty-gold-500 transition"
              >
                <Feather className="h-4 w-4 text-itamaraty-gold-600 dark:text-itamaraty-gold-400" />
                <span>Oficina 90 Linhas</span>
              </Link>
            </div>
          </div>

          {/* Abas de Navegação do Estúdio do Tópico */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-travertine-200 dark:border-itamaraty-navy-800">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveStudioTab("ficha")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  activeStudioTab === "ficha"
                    ? "bg-itamaraty-navy-700 text-white dark:bg-itamaraty-gold-500 dark:text-itamaraty-navy-950"
                    : "bg-travertine-50 dark:bg-itamaraty-navy-950 text-ink-700 dark:text-travertine-200"
                }`}
              >
                <BookOpen className="h-4 w-4" />
                <span>1. Ficha Teórica em Duas Camadas</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveStudioTab("graficos")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  activeStudioTab === "graficos"
                    ? "bg-itamaraty-navy-700 text-white dark:bg-itamaraty-gold-500 dark:text-itamaraty-navy-950"
                    : "bg-travertine-50 dark:bg-itamaraty-navy-950 text-ink-700 dark:text-travertine-200"
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                <span>2. Tradutor de Gráficos & BP ({causalModels.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveStudioTab("armadilhas_repertorio")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  activeStudioTab === "armadilhas_repertorio"
                    ? "bg-itamaraty-navy-700 text-white dark:bg-itamaraty-gold-500 dark:text-itamaraty-navy-950"
                    : "bg-travertine-50 dark:bg-itamaraty-navy-950 text-ink-700 dark:text-travertine-200"
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
                <span>
                  3. Armadilhas TPS ({lesson.tps_traps_json.length}) & Repertório 3ª Fase (
                  {lesson.essay_repertoire_json.length})
                </span>
              </button>
            </div>

            {/* Seletor de Progressão da Carreira no Tópico */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-ink-500 dark:text-travertine-300">Status do Tópico:</span>
              <select
                value={masteryStatus}
                onChange={(e) => setMasteryStatus(e.target.value as MasteryStatus)}
                className="rounded-lg border border-travertine-300 dark:border-itamaraty-navy-700 bg-travertine-50 dark:bg-itamaraty-navy-950 px-2.5 py-1.5 font-semibold text-ink-900 dark:text-travertine-100"
              >
                <option value="studying_base">1. Estudando Base Zero (3º Secretário)</option>
                <option value="studying_advanced">2. Aprofundando CACD (2º Secretário)</option>
                <option value="reviewing">3. Em Revisão FSRS (1º Secretário / Conselheiro)</option>
                <option value="mastered">4. Tópico Dominado (Embaixador)</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Conteúdo Principal do Estúdio */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 space-y-8">
        {/* ABA 1: FICHA EM DUAS CAMADAS (BASE ZERO vs RIGOR CACD) */}
        {activeStudioTab === "ficha" && (
          <div className="space-y-6">
            {/* Barra de Controle de Leitura */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-travertine-200 dark:border-itamaraty-navy-800 bg-travertine-100 dark:bg-itamaraty-navy-900 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSideBySideMode(false);
                    setLearningLayer("base");
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    !sideBySideMode && learningLayer === "base"
                      ? "bg-itamaraty-navy-600 text-white dark:bg-itamaraty-gold-500 dark:text-itamaraty-navy-950"
                      : "text-ink-700 dark:text-travertine-300"
                  }`}
                >
                  Camada 1: Intuição Base Zero
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSideBySideMode(false);
                    setLearningLayer("cacd");
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    !sideBySideMode && learningLayer === "cacd"
                      ? "bg-itamaraty-navy-600 text-white dark:bg-itamaraty-gold-500 dark:text-itamaraty-navy-950"
                      : "text-ink-700 dark:text-travertine-300"
                  }`}
                >
                  Camada 2: Rigor CACD (1ª e 3ª Fases)
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSideBySideMode((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  sideBySideMode
                    ? "border-itamaraty-gold-500 bg-itamaraty-gold-500/15 text-itamaraty-gold-600 dark:text-itamaraty-gold-300"
                    : "border-travertine-300 dark:border-itamaraty-navy-700 text-ink-700 dark:text-travertine-200"
                }`}
              >
                <Columns2 className="h-3.5 w-3.5" />
                <span>{sideBySideMode ? "Exibindo Lado a Lado" : "Comparar Camadas Lado a Lado"}</span>
              </button>
            </div>

            {/* Renderização Editorial das Fichas */}
            {sideBySideMode ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <article className="rounded-2xl border border-travertine-200 dark:border-itamaraty-navy-800 bg-travertine-50 dark:bg-itamaraty-navy-900 p-6 shadow-parchment">
                  <div className="mb-4 flex items-center gap-2 border-b border-travertine-200 dark:border-itamaraty-navy-800 pb-3">
                    <BookOpen className="h-4 w-4 text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400" />
                    <h2 className="font-serif text-base font-bold text-ink-900 dark:text-white">
                      Camada 1 • Intuição e Base Zero
                    </h2>
                  </div>
                  <div className="prose prose-slate dark:prose-invert max-w-none font-serif leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {lesson.base_intuition_md}
                    </ReactMarkdown>
                  </div>
                </article>

                <article className="rounded-2xl border border-itamaraty-gold-500/40 bg-travertine-50 dark:bg-itamaraty-navy-900 p-6 shadow-parchment">
                  <div className="mb-4 flex items-center gap-2 border-b border-travertine-200 dark:border-itamaraty-navy-800 pb-3">
                    <Award className="h-4 w-4 text-itamaraty-gold-600 dark:text-itamaraty-gold-400" />
                    <h2 className="font-serif text-base font-bold text-ink-900 dark:text-white">
                      Camada 2 • Aprofundamento Padrão Rio Branco
                    </h2>
                  </div>
                  <div className="prose prose-slate dark:prose-invert max-w-none font-serif leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {lesson.cacd_deep_dive_md}
                    </ReactMarkdown>
                  </div>
                </article>
              </div>
            ) : (
              <article className="mx-auto max-w-4xl rounded-2xl border border-travertine-200 dark:border-itamaraty-navy-800 bg-travertine-50 dark:bg-itamaraty-navy-900 p-8 shadow-parchment">
                <div className="mb-6 flex items-center justify-between border-b border-travertine-200 dark:border-itamaraty-navy-800 pb-4">
                  <div className="flex items-center gap-2">
                    {learningLayer === "base" ? (
                      <BookOpen className="h-5 w-5 text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400" />
                    ) : (
                      <Award className="h-5 w-5 text-itamaraty-gold-600 dark:text-itamaraty-gold-400" />
                    )}
                    <h2 className="font-serif text-xl font-bold text-ink-900 dark:text-white">
                      {learningLayer === "base"
                        ? "Camada 1: Construindo a Intuição Econômica (Base Zero)"
                        : "Camada 2: Rigor Técnico CACD, Modelos e Historiografia"}
                    </h2>
                  </div>

                  {learningLayer === "base" && (
                    <button
                      type="button"
                      onClick={() => setLearningLayer("cacd")}
                      className="text-xs font-bold text-itamaraty-navy-600 dark:text-itamaraty-gold-400 hover:underline"
                    >
                      Avançar para Rigor CACD →
                    </button>
                  )}
                </div>

                <div className="prose prose-lg dark:prose-invert max-w-[68ch] font-serif leading-[1.8] text-ink-900 dark:text-travertine-100">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {learningLayer === "base"
                      ? lesson.base_intuition_md
                      : lesson.cacd_deep_dive_md}
                  </ReactMarkdown>
                </div>
              </article>
            )}
          </div>
        )}

        {/* ABA 2: TRADUTOR INTERATIVO DE GRÁFICOS E MODELOS CAUSAIS */}
        {activeStudioTab === "graficos" && (
          <div className="space-y-4">
            <CausalGraphTranslator models={causalModels} />
          </div>
        )}

        {/* ABA 3: RADAR DE PEGADINHAS DO TPS + REPERTÓRIO DE 3ª FASE */}
        {activeStudioTab === "armadilhas_repertorio" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Coluna 1: Armadilhas Clássicas do TPS */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-itamaraty-carmine-500" />
                <h3 className="font-serif text-lg font-bold text-ink-900 dark:text-white">
                  Radar de Pegadinhas da Banca (TPS 1ª Fase)
                </h3>
              </div>

              {lesson.tps_traps_json.map((trap, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-itamaraty-carmine-700/40 bg-travertine-100 dark:bg-itamaraty-navy-900 p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-itamaraty-carmine-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Armadilha #{idx + 1} • {trap.trap_category || trap.trap_type || "Inversão Causal"}
                    </span>
                  </div>

                  <div className="rounded-xl bg-itamaraty-carmine-900/15 border border-itamaraty-carmine-700/30 p-3 text-xs">
                    <strong className="text-itamaraty-carmine-500">Como a banca induz ao erro: </strong>
                    <span className="italic text-ink-900 dark:text-travertine-100">
                      &ldquo;{trap.wrong_claim}&rdquo;
                    </span>
                  </div>

                  <div className="rounded-xl bg-itamaraty-emerald-950/20 border border-itamaraty-emerald-700/30 p-3 text-xs">
                    <strong className="text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400">
                      Mecanismo Correto:{" "}
                    </strong>
                    <span className="text-ink-900 dark:text-travertine-100">
                      {trap.truth_mechanism}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Coluna 2: Repertório Canônico para Discursivas de 90 Linhas */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Quote className="h-5 w-5 text-itamaraty-gold-600 dark:text-itamaraty-gold-400" />
                <h3 className="font-serif text-lg font-bold text-ink-900 dark:text-white">
                  Arsenal de Citações e Dados (3ª Fase • 60 a 90 Linhas)
                </h3>
              </div>

              {lesson.essay_repertoire_json.map((rep, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-itamaraty-gold-500/40 bg-travertine-100 dark:bg-itamaraty-navy-900 p-5 space-y-2.5"
                >
                  <div className="font-serif text-sm font-bold text-itamaraty-navy-700 dark:text-itamaraty-gold-400">
                    {rep.author_or_source}
                  </div>
                  <p className="font-serif text-xs leading-relaxed text-ink-900 dark:text-travertine-100">
                    <strong>Tese Central:</strong> {rep.core_thesis}
                  </p>
                  <div className="rounded-lg bg-travertine-50 dark:bg-itamaraty-navy-950 px-3 py-2 font-mono text-[11px] text-ink-700 dark:text-travertine-200">
                    <strong>Marco Histórico / Evidência:</strong> {rep.historical_data_or_milestone}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Gaveta Lateral Retrátil do Tutor RAG */}
      <TutorRAGDrawer
        isOpen={isTutorOpen}
        onClose={() => setIsTutorOpen(false)}
        subjectId={subjectId}
        topicId={topic.id}
        topicCode={topic.code}
        topicTitle={topic.title}
        learningLayer={learningLayer}
      />
    </div>
  );
}