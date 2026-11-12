"use client";

import React, { useState, useMemo } from "react";
import { Feather, Clock, Upload, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

export interface EssaySubcommand {
  item: string;
  prompt: string;
  max_points: number;
}

export interface RuledPaperProps {
  promptId: string;
  examYear?: number;
  title: string;
  motivatingText: string;
  commands: EssaySubcommand[];
  initialDraft?: string;
}

const CHARS_PER_RULED_LINE = 68;
const MAX_LINES = 90;
const MIN_REQUIRED_LINES = 60;

export default function RuledPaper90Lines({
  promptId,
  examYear = 2024,
  title,
  motivatingText,
  commands,
  initialDraft = "",
}: RuledPaperProps) {
  const [stageMode, setStageMode] = useState<"skeleton_only" | "guided_writing" | "full_simulation">(
    "full_simulation"
  );
  const [text, setText] = useState<string>(initialDraft);
  const [loading, setLoading] = useState(false);
  const [gradingResult, setGradingResult] = useState<any | null>(null);

  // Calcula quantas linhas pautadas o texto ocupa considerando quebras de parágrafo e largura da linha
  const occupiedLinesCount = useMemo(() => {
    if (!text.trim()) return 0;
    const paragraphs = text.split("\n");
    let total = 0;
    for (const p of paragraphs) {
      total += Math.max(1, Math.ceil(p.length / CHARS_PER_RULED_LINE));
    }
    return total;
  }, [text]);

  const wordCount = useMemo(() => {
    const trimmed = text.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [text]);

  const lineNumbers = Array.from({ length: MAX_LINES }, (_, i) => i + 1);

  async function handleSubmitToBoard() {
    setLoading(true);
    try {
      const response = await fetch("/api/essay/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptId,
          stageMode,
          contentText: text,
        }),
      });
      const data = await response.json();
      setGradingResult(data.grading || data.evaluation);
    } finally {
      setLoading(false);
    }
  }

  function handleHandwrittenUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Raw = (reader.result as string).split(",")[1];
      setLoading(true);
      try {
        const res = await fetch("/api/essay/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            promptId,
            stageMode: "full_simulation",
            handwrittenImageBase64: base64Raw,
            handwrittenMimeType: file.type,
          }),
        });
        const data = await res.json();
        if (data.grading?.transcribed_text) {
          setText(data.grading.transcribed_text);
        }
        setGradingResult(data.grading);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-6">
      {/* Barra Superior da Prova Discursiva */}
      <div className="rounded-2xl border border-travertine-200 dark:border-itamaraty-navy-800 bg-travertine-100 dark:bg-itamaraty-navy-900 p-5 shadow-parchment">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-travertine-200 dark:border-itamaraty-navy-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-itamaraty-navy-700 dark:bg-itamaraty-gold-500 px-2.5 py-0.5 font-mono text-[11px] font-bold text-white dark:text-itamaraty-navy-950">
                3ª FASE CACD • {examYear}
              </span>
              <span className="text-xs font-semibold text-itamaraty-gold-600 dark:text-itamaraty-gold-400">
                Caderno de Textos Definitivos (60 a 90 Linhas)
              </span>
            </div>
            <h2 className="mt-1.5 font-serif text-xl font-bold text-ink-900 dark:text-white">
              {title}
            </h2>
          </div>

          {/* Seletor dos 3 Estágios da Oficina */}
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-travertine-200 dark:border-itamaraty-navy-800 bg-travertine-50 dark:bg-itamaraty-navy-950 p-1">
            {[
              { id: "skeleton_only", label: "1. Modo Esqueleto" },
              { id: "guided_writing", label: "2. Redação Guiada" },
              { id: "full_simulation", label: "3. Simulado 90 Linhas" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStageMode(tab.id as any)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  stageMode === tab.id
                    ? "bg-itamaraty-navy-600 text-white dark:bg-itamaraty-gold-500 dark:text-itamaraty-navy-950"
                    : "text-ink-500 dark:text-travertine-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Texto Motivador e Comandos da Banca */}
        <div className="mt-4 space-y-3">
          <p className="font-serif text-sm leading-relaxed text-ink-700 dark:text-travertine-200">
            {motivatingText}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            {commands.map((cmd) => (
              <div
                key={cmd.item}
                className="rounded-xl border border-travertine-200 dark:border-itamaraty-navy-800 bg-travertine-50 dark:bg-itamaraty-navy-950 p-3"
              >
                <div className="flex items-center justify-between text-xs font-bold text-itamaraty-navy-700 dark:text-itamaraty-gold-400">
                  <span>Subcomando ({cmd.item})</span>
                  <span className="font-mono">{cmd.max_points.toFixed(1)} pts</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink-700 dark:text-travertine-200">
                  {cmd.prompt}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Painel de Métricas da Folha Pautada + Upload OCR */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-travertine-200 dark:border-itamaraty-navy-800 bg-travertine-100/80 dark:bg-itamaraty-navy-900 px-4 py-3">
        <div className="flex flex-wrap items-center gap-6 text-xs">
          <div>
            <span className="text-ink-500 dark:text-travertine-300">Linhas Ocupadas: </span>
            <strong
              className={`font-mono text-sm ${
                occupiedLinesCount < MIN_REQUIRED_LINES
                  ? "text-itamaraty-gold-600 dark:text-itamaraty-gold-400"
                  : occupiedLinesCount <= MAX_LINES
                  ? "text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400"
                  : "text-itamaraty-carmine-500"
              }`}
            >
              {String(occupiedLinesCount).padStart(2, "0")} / {MAX_LINES}
            </strong>
          </div>

          <div>
            <span className="text-ink-500 dark:text-travertine-300">Meta Mínima: </span>
            <strong className="font-mono text-ink-900 dark:text-white">60 linhas</strong>
          </div>

          <div>
            <span className="text-ink-500 dark:text-travertine-300">Palavras: </span>
            <strong className="font-mono text-ink-900 dark:text-white">{wordCount}</strong>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-travertine-300 dark:border-itamaraty-navy-700 bg-travertine-50 dark:bg-itamaraty-navy-800 px-3 py-1.5 text-xs font-semibold text-ink-900 dark:text-travertine-100 hover:border-itamaraty-gold-500 transition">
            <Upload className="h-3.5 w-3.5 text-itamaraty-gold-600 dark:text-itamaraty-gold-400" />
            <span>Enviar Foto da Folha Manuscrita (OCR)</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleHandwrittenUpload}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleSubmitToBoard}
            disabled={loading || !text.trim()}
            className="flex items-center gap-2 rounded-lg bg-itamaraty-navy-600 hover:bg-itamaraty-navy-700 dark:bg-itamaraty-gold-500 dark:hover:bg-itamaraty-gold-400 px-4 py-2 text-xs font-bold text-white dark:text-itamaraty-navy-950 disabled:opacity-40 transition"
          >
            <Feather className="h-3.5 w-3.5" />
            <span>{loading ? "Avaliando com Espelho RAG..." : "Corrigir com Banca IA"}</span>
          </button>
        </div>
      </div>

      {/* Folha Pautada Oficial Numerada (01 a 90) */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-travertine-200 dark:border-itamaraty-navy-800 shadow-parchment">
        <div className="max-h-[680px] overflow-y-auto flex bg-travertine-50 dark:bg-[#0B1626]">
          {/* Coluna Esquerda: Numeração Oficial das 90 Linhas */}
          <div
            aria-hidden="true"
            className="select-none border-r border-itamaraty-carmine-700/30 dark:border-itamaraty-gold-500/30 bg-travertine-100/70 dark:bg-itamaraty-navy-950/60 px-3 pt-[6px] text-right font-mono text-[11px]"
          >
            {lineNumbers.map((num) => {
              const isMinTarget = num === MIN_REQUIRED_LINES;
              const isMaxLimit = num === MAX_LINES;
              const isFilled = num <= occupiedLinesCount;
              return (
                <div
                  key={num}
                  style={{ height: "32px", lineHeight: "32px" }}
                  className={`flex items-center justify-end gap-1 ${
                    isMinTarget
                      ? "font-bold text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400"
                      : isMaxLimit
                      ? "font-bold text-itamaraty-carmine-500"
                      : isFilled
                      ? "text-ink-900 dark:text-travertine-200 font-semibold"
                      : "text-ink-500/50 dark:text-slate-600"
                  }`}
                >
                  {isMinTarget && <span title="Mínimo de 60 linhas">★</span>}
                  <span>{String(num).padStart(2, "0")}</span>
                </div>
              );
            })}
          </div>

          {/* Área de Escrita Calibrada com as Pautas de 32px */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={MAX_LINES}
            placeholder="Inicie sua dissertação sem deixar linhas em branco. Articule o mecanismo econômico (IS-LM-BP), os dados do Balanço de Pagamentos e a historiografia brasileira..."
            className="cacd-ruled-paper w-full resize-none bg-transparent px-5 font-serif text-[15px] tracking-normal focus:outline-none"
            style={{ minHeight: `${MAX_LINES * 32}px` }}
          />
        </div>
      </div>

      {/* Painel de Espelho Comentado e Reescrita Diplomática */}
      {gradingResult && (
        <div className="rounded-2xl border border-itamaraty-emerald-700/50 bg-travertine-100 dark:bg-itamaraty-navy-900 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-travertine-200 dark:border-itamaraty-navy-800 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400">
                Parecer da Banca Examinadora • Instituto Rio Branco
              </span>
              <h3 className="font-serif text-lg font-bold text-ink-900 dark:text-white">
                Nota Final Líquida: {gradingResult.final_net_score} / 30.00 pontos
              </h3>
            </div>
            <div className="font-mono text-xs text-ink-700 dark:text-travertine-200">
              Conteúdo: <strong>{gradingResult.total_content_score}</strong> | Desconto Norma Culta:{" "}
              <strong className="text-itamaraty-carmine-500">
                -{gradingResult.language_penalty_applied}
              </strong>
            </div>
          </div>

          {gradingResult.paragraph_reviews?.length ? (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-itamaraty-gold-600 dark:text-itamaraty-gold-400">
                Sugestões de Reescrita em Padrão Diplomático
              </h4>
              {gradingResult.paragraph_reviews.map((pr: any) => (
                <div
                  key={pr.paragraph_index}
                  className="rounded-xl border border-travertine-200 dark:border-itamaraty-navy-800 bg-travertine-50 dark:bg-itamaraty-navy-950 p-4 space-y-2"
                >
                  <div className="text-xs font-bold text-ink-900 dark:text-white">
                    Parágrafo {pr.paragraph_index} — {pr.diagnostic}
                  </div>
                  <p className="font-serif text-xs italic text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400 leading-relaxed">
                    &ldquo;{pr.diplomatic_rewrite}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}