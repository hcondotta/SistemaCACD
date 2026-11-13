"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLearningLayer } from "@/components/layout/learning-layer";
import type { CausalModelData } from "@/lib/study-content";

/**
 * Tradutor visual de modelos causais (IS-LM-BP).
 *
 * A moldura acompanha os modos Pergaminho e Chancelaria; o quadro do gráfico
 * fica sempre escuro, como uma lousa, porque as cores semânticas das curvas
 * (IS ouro, LM azul, BP esmeralda, choque coral) foram escolhidas para alto
 * contraste sobre fundo escuro. O parágrafo-modelo de 3ª Fase segue a camada
 * didática global.
 */
export default function CausalGraphTranslator({ models }: { models: CausalModelData[] }) {
  const { learningLayer } = useLearningLayer();
  const [selectedSlug, setSelectedSlug] = useState<string>(models[0]?.slug ?? "");
  const [activeStep, setActiveStep] = useState<number>(0);

  const currentModel = models.find((m) => m.slug === selectedSlug) ?? models[0];
  if (!currentModel) return null;

  const steps = currentModel.causal_chain_steps;
  const isShiftRight = activeStep >= 1;
  const isFinalStep = activeStep >= steps.length;

  return (
    <div className="space-y-6 rounded-2xl border border-travertine-200 bg-travertine-100 p-6 shadow-parchment dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-900">
      {/* Cabeçalho */}
      <div className="border-b border-travertine-200 pb-4 dark:border-itamaraty-navy-800">
        <span className="text-xs font-semibold uppercase tracking-wider text-itamaraty-gold-600 dark:text-itamaraty-gold-400">
          Tradutor Visual de Modelos • {currentModel.model_family}
        </span>
        <h2 className="mt-1 font-serif text-xl font-bold text-ink-900 dark:text-travertine-50">
          {currentModel.scenario_title}
        </h2>
      </div>

      {/* Seletor de cenário */}
      {models.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {models.map((model) => (
            <button
              key={model.slug}
              type="button"
              aria-pressed={model.slug === currentModel.slug}
              onClick={() => {
                setSelectedSlug(model.slug);
                setActiveStep(0);
              }}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                model.slug === currentModel.slug
                  ? "border-itamaraty-gold-500 bg-travertine-50 text-itamaraty-gold-700 dark:bg-itamaraty-navy-800 dark:text-itamaraty-gold-300"
                  : "border-travertine-200 bg-travertine-50 text-ink-500 hover:border-travertine-300 dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-950 dark:text-travertine-300 dark:hover:border-itamaraty-navy-700"
              }`}
            >
              {model.scenario_title}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Quadro do gráfico: sempre escuro, para o contraste das cores semânticas */}
        <div className="rounded-xl border border-itamaraty-navy-800 bg-itamaraty-navy-950 p-4 lg:col-span-6">
          <svg
            viewBox="0 0 400 300"
            className="h-auto w-full"
            role="img"
            aria-label={`Gráfico IS-LM-BP: ${currentModel.scenario_title}, passo ${activeStep} de ${steps.length}`}
          >
            {/* Eixos */}
            <line x1="50" y1="250" x2="360" y2="250" className="stroke-ink-500" strokeWidth="2" />
            <line x1="50" y1="250" x2="50" y2="30" className="stroke-ink-500" strokeWidth="2" />
            <text x="310" y="275" fontSize="11" className="fill-travertine-300">
              Renda (Y)
            </text>
            <text x="15" y="45" fontSize="11" className="fill-travertine-300">
              Juros (i)
            </text>

            {/* Curva BP: horizontal sob perfeita mobilidade de capitais */}
            <line x1="50" y1="150" x2="350" y2="150" className="stroke-econ-bp" strokeWidth="2.5" strokeDasharray="6 4" />
            <text x="315" y="142" fontSize="11" fontWeight="bold" className="fill-econ-bp">
              BP (i = i*)
            </text>

            {/* Curva LM */}
            <line x1="80" y1="230" x2="310" y2="60" className="stroke-econ-lm" strokeWidth="2.5" />
            <text x="315" y="65" fontSize="11" fontWeight="bold" className="fill-econ-lm">
              LM
            </text>

            {/* Curva IS original */}
            <line x1="80" y1="70" x2="310" y2="230" className="stroke-econ-is" strokeWidth="2.5" />
            <text x="315" y="235" fontSize="11" fontWeight="bold" className="fill-econ-is">
              IS₁
            </text>

            {/* Curva IS deslocada pelo choque */}
            {isShiftRight && (
              <line
                x1="130"
                y1="50"
                x2="350"
                y2="205"
                className="stroke-econ-shock"
                strokeWidth="2.5"
                strokeDasharray={isFinalStep ? "4 4" : "0"}
                opacity={isFinalStep ? 0.45 : 1}
              />
            )}

            {/* Equilíbrio inicial E0 */}
            <circle cx="195" cy="150" r="5" className="fill-travertine-50" />
            <text x="185" y="138" fontSize="11" fontWeight="bold" className="fill-travertine-50">
              E₀
            </text>

            {/* Pressão intermediária E1 */}
            {activeStep >= 1 && !isFinalStep && (
              <>
                <circle cx="232" cy="120" r="5" className="fill-econ-shock" />
                <text x="240" y="122" fontSize="11" fontWeight="bold" className="fill-econ-shock">
                  E₁ (i &gt; i*)
                </text>
              </>
            )}
          </svg>

          {/* Controles do player causal */}
          <div className="mt-4 flex items-center justify-between border-t border-itamaraty-navy-800 pt-3">
            <span className="text-xs text-travertine-300">
              Passo <strong className="font-mono text-travertine-50">{activeStep}</strong> de{" "}
              <span className="font-mono">{steps.length}</span>
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                disabled={activeStep === 0}
                className="flex items-center gap-1 rounded bg-itamaraty-navy-800 px-3 py-1 text-xs text-travertine-100 transition hover:bg-itamaraty-navy-700 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setActiveStep(Math.min(steps.length, activeStep + 1))}
                disabled={activeStep === steps.length}
                className="flex items-center gap-1 rounded bg-itamaraty-gold-500 px-3 py-1 text-xs font-bold text-itamaraty-navy-950 transition hover:bg-itamaraty-gold-400 disabled:opacity-40"
              >
                Próximo passo
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        {/* Cadeia causal, Balanço de Pagamentos e parágrafo de 3ª Fase */}
        <div className="space-y-4 lg:col-span-6">
          <ol className="space-y-2">
            {steps.map((step) => {
              const isCurrent = activeStep === step.step;
              const isPassed = activeStep > step.step;
              return (
                <li key={step.step}>
                  <button
                    type="button"
                    onClick={() => setActiveStep(step.step)}
                    aria-current={isCurrent ? "step" : undefined}
                    className={`w-full rounded-xl border p-3.5 text-left transition ${
                      isCurrent
                        ? "border-itamaraty-gold-500 bg-travertine-50 dark:bg-itamaraty-navy-800"
                        : isPassed
                          ? "border-travertine-300 bg-travertine-50/70 opacity-90 dark:border-itamaraty-navy-700 dark:bg-itamaraty-navy-950/70"
                          : "border-travertine-200 bg-travertine-50/50 opacity-60 dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-950"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-itamaraty-gold-700 dark:text-itamaraty-gold-400">
                        Passo {step.step}: {step.title}
                      </span>
                      <span className="shrink-0 rounded border border-travertine-300 px-2 py-0.5 font-mono text-[11px] text-ink-700 dark:border-itamaraty-navy-700 dark:text-travertine-300">
                        {step.curve}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-700 dark:text-travertine-200">
                      {step.mechanism}
                    </p>
                  </button>
                </li>
              );
            })}
          </ol>

          {currentModel.bp_impact_summary && (
            <div className="rounded-xl border border-itamaraty-emerald-700/40 bg-itamaraty-emerald-500/10 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400">
                Reflexo no Balanço de Pagamentos (BPM6 / FMI)
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-900 dark:text-travertine-100">
                {currentModel.bp_impact_summary}
              </p>
            </div>
          )}

          {learningLayer === "cacd" ? (
            <div className="rounded-xl border border-itamaraty-gold-500/50 bg-itamaraty-gold-500/10 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-itamaraty-gold-700 dark:text-itamaraty-gold-300">
                Como redigir na 3ª Fase (parágrafo padrão Rio Branco)
              </h3>
              <p className="mt-2 font-serif text-sm italic leading-relaxed text-ink-900 dark:text-travertine-100">
                &ldquo;{currentModel.model_essay_paragraph}&rdquo;
              </p>
            </div>
          ) : (
            <p className="text-xs text-ink-500 dark:text-travertine-300">
              O parágrafo-modelo para a discursiva aparece na Camada 2 (Rigor CACD).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
