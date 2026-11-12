"use client";

import React, { useState } from "react";

export interface CausalStep {
  step: number;
  curve: "IS" | "LM" | "BP" | "CAMBIO";
  shift: string;
  title: string;
  mechanism: string;
}

export interface CausalModelData {
  id: string;
  slug: string;
  model_family: string;
  scenario_title: string;
  context_parameters: {
    regime_cambial: string;
    mobilidade_capital: string;
    choque: string;
  };
  causal_chain_steps: CausalStep[];
  bp_impact_summary: string;
  model_essay_paragraph: string;
}

interface Props {
  models: CausalModelData[];
}

export default function CausalGraphTranslator({ models }: Props) {
  const [selectedSlug, setSelectedSlug] = useState<string>(models[0]?.slug || "");
  const [activeStep, setActiveStep] = useState<number>(0);
  const [layerMode, setLayerMode] = useState<"base" | "cacd">("base");

  const currentModel = models.find((m) => m.slug === selectedSlug) || models[0];
  if (!currentModel) return null;

  const steps = currentModel.causal_chain_steps;
  const isShiftRight = activeStep >= 1;
  const isFinalStep = activeStep >= steps.length;

  return (
    <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6">
      {/* Cabeçalho e Seletor de Camada Didática */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            Tradutor Visual de Modelos • {currentModel.model_family}
          </span>
          <h2 className="text-xl font-bold text-white mt-1">
            {currentModel.scenario_title}
          </h2>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setLayerMode("base")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              layerMode === "base"
                ? "bg-amber-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            1. Intuição Base Zero
          </button>
          <button
            type="button"
            onClick={() => setLayerMode("cacd")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              layerMode === "cacd"
                ? "bg-amber-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            2. Rigor CACD (3ª Fase)
          </button>
        </div>
      </div>

      {/* Seletor de Cenário */}
      <div className="flex flex-wrap gap-2">
        {models.map((m) => (
          <button
            key={m.slug}
            type="button"
            onClick={() => {
              setSelectedSlug(m.slug);
              setActiveStep(0);
            }}
            className={`px-3 py-2 rounded-lg text-xs font-medium border transition ${
              m.slug === currentModel.slug
                ? "bg-slate-800 border-amber-500 text-amber-300"
                : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
            }`}
          >
            {m.scenario_title}
          </button>
        ))}
      </div>

      {/* Grid Principal: Gráfico SVG + Passo a Passo Causal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna Esquerda: Gráfico Interativo IS-LM-BP */}
        <div className="lg:col-span-6 bg-slate-950 rounded-xl p-4 border border-slate-800">
          <svg viewBox="0 0 400 300" className="w-full h-auto">
            {/* Eixos */}
            <line x1="50" y1="250" x2="360" y2="250" stroke="#64748b" strokeWidth="2" />
            <line x1="50" y1="250" x2="50" y2="30" stroke="#64748b" strokeWidth="2" />
            <text x="310" y="275" fill="#94a3b8" fontSize="11">Renda (Y)</text>
            <text x="15" y="45" fill="#94a3b8" fontSize="11">Juros (i)</text>

            {/* Curva BP (Horizontal para Perfeita Mobilidade) */}
            <line x1="50" y1="150" x2="350" y2="150" stroke="#10b981" strokeWidth="2.5" strokeDasharray="6 4" />
            <text x="315" y="142" fill="#10b981" fontSize="11" fontWeight="bold">BP (i = i*)</text>

            {/* Curva LM */}
            <line x1="80" y1="230" x2="310" y2="60" stroke="#38bdf8" strokeWidth="2.5" />
            <text x="315" y="65" fill="#38bdf8" fontSize="11" fontWeight="bold">LM</text>

            {/* Curva IS Original (IS1) */}
            <line x1="80" y1="70" x2="310" y2="230" stroke="#f59e0b" strokeWidth="2.5" />
            <text x="315" y="235" fill="#f59e0b" fontSize="11" fontWeight="bold">IS₁</text>

            {/* Curva IS Deslocada (IS2) */}
            {isShiftRight && (
              <line
                x1="130"
                y1="50"
                x2="350"
                y2="205"
                stroke="#f97316"
                strokeWidth="2.5"
                strokeDasharray={isFinalStep ? "4 4" : "0"}
                opacity={isFinalStep ? 0.45 : 1}
              />
            )}

            {/* Ponto de Equilíbrio Inicial E0 */}
            <circle cx="195" cy="150" r="5" fill="#f8fafc" />
            <text x="185" y="138" fill="#f8fafc" fontSize="11" fontWeight="bold">E₀</text>

            {/* Ponto de Pressão Intermediária E1 */}
            {activeStep >= 1 && !isFinalStep && (
              <>
                <circle cx="232" cy="120" r="5" fill="#f97316" />
                <text x="240" y="122" fill="#f97316" fontSize="11" fontWeight="bold">E₁ (i &gt; i*)</text>
              </>
            )}
          </svg>

          {/* Controles do Player Causal */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800">
            <span className="text-xs text-slate-400">
              Etapa selecionada: <strong className="text-white">Passo {activeStep} de {steps.length}</strong>
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                disabled={activeStep === 0}
                className="px-3 py-1 rounded bg-slate-800 text-xs disabled:opacity-40 hover:bg-slate-700"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setActiveStep(Math.min(steps.length, activeStep + 1))}
                disabled={activeStep === steps.length}
                className="px-3 py-1 rounded bg-amber-500 text-slate-950 font-bold text-xs disabled:opacity-40 hover:bg-amber-400"
              >
                Próximo Passo
              </button>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Cadeia Causal + Balanço de Pagamentos + Parágrafo 3ª Fase */}
        <div className="lg:col-span-6 space-y-4">
          <div className="space-y-2">
            {steps.map((s) => {
              const isCurrent = activeStep === s.step;
              const isPassed = activeStep > s.step;
              return (
                <div
                  key={s.step}
                  onClick={() => setActiveStep(s.step)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    isCurrent
                      ? "bg-slate-800/90 border-amber-500"
                      : isPassed
                      ? "bg-slate-900/60 border-slate-700 opacity-80"
                      : "bg-slate-950 border-slate-800 opacity-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400">
                      PASSO {s.step}: {s.title}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                      Curva: {s.curve}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    {s.mechanism}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Reflexo no Balanço de Pagamentos */}
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/60">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Reflexo no Balanço de Pagamentos (BPM6 / FMI)
            </h4>
            <p className="text-xs text-slate-200 mt-1 leading-relaxed">
              {currentModel.bp_impact_summary}
            </p>
          </div>

          {/* Parágrafo Modelo para Discursiva de 90 Linhas */}
          {layerMode === "cacd" && (
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-700/50">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Como Redigir na 3ª Fase (Parágrafo Padrão Rio Branco)
              </h4>
              <p className="text-xs text-slate-200 mt-2 leading-relaxed italic">
                &ldquo;{currentModel.model_essay_paragraph}&rdquo;
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}