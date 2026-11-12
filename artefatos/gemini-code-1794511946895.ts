"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon, BookOpen, Award, Sparkles, Menu } from "lucide-react";
import { DiplomaticBadge, DiplomaticRank, AthosBulcaoPattern } from "@/components/ui/DiplomaticBadges";

interface ChanceryHeaderProps {
  currentRank?: DiplomaticRank;
  learningLayer: "base" | "cacd";
  onLayerChange: (layer: "base" | "cacd") => void;
  dueFlashcardsCount?: number;
  netTpsAccuracy?: number;
  onOpenMobileMenu?: () => void;
}

export default function ChanceryHeader({
  currentRank = "segundo_secretario",
  learningLayer,
  onLayerChange,
  dueFlashcardsCount = 14,
  netTpsAccuracy = 78.5,
  onOpenMobileMenu,
}: ChanceryHeaderProps) {
  const [theme, setTheme] = useState<"pergaminho" | "chancelaria">("pergaminho");

  useEffect(() => {
    const saved = localStorage.getItem("cacd-theme") as "pergaminho" | "chancelaria" | null;
    const initial = saved || "pergaminho";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "chancelaria");
  }, []);

  function toggleTheme() {
    const next = theme === "pergaminho" ? "chancelaria" : "pergaminho";
    setTheme(next);
    localStorage.setItem("cacd-theme", next);
    document.documentElement.classList.toggle("dark", next === "chancelaria");
  }

  return (
    <header className="relative sticky top-0 z-30 border-b border-travertine-200 dark:border-itamaraty-navy-800 bg-travertine-50/95 dark:bg-itamaraty-navy-900/95 backdrop-blur-md transition-colors">
      <AthosBulcaoPattern className="opacity-[0.03] text-itamaraty-navy-700 dark:text-itamaraty-gold-400" />

      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Esquerda: Botão Mobile + Identidade Institucional */}
        <div className="flex items-center gap-3">
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="rounded-lg p-2 text-ink-700 dark:text-travertine-200 lg:hidden hover:bg-travertine-100 dark:hover:bg-itamaraty-navy-800"
              aria-label="Abrir navegação"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <DiplomaticBadge rank={currentRank} size="sm" showLabel />
        </div>

        {/* Centro: Alternador Global de Camada Didática (Base Zero vs Rigor CACD) */}
        <div className="hidden md:flex items-center rounded-xl border border-travertine-200 dark:border-itamaraty-navy-800 bg-travertine-100 dark:bg-itamaraty-navy-950 p-1">
          <button
            type="button"
            onClick={() => onLayerChange("base")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              learningLayer === "base"
                ? "bg-itamaraty-navy-600 text-white dark:bg-itamaraty-gold-500 dark:text-itamaraty-navy-950 shadow-sm"
                : "text-ink-500 dark:text-travertine-300 hover:text-ink-900 dark:hover:text-white"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Camada 1: Intuição Base Zero</span>
          </button>

          <button
            type="button"
            onClick={() => onLayerChange("cacd")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              learningLayer === "cacd"
                ? "bg-itamaraty-navy-600 text-white dark:bg-itamaraty-gold-500 dark:text-itamaraty-navy-950 shadow-sm"
                : "text-ink-500 dark:text-travertine-300 hover:text-ink-900 dark:hover:text-white"
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            <span>Camada 2: Rigor CACD (3ª Fase)</span>
          </button>
        </div>

        {/* Direita: Indicadores Rápidos + Botão de Tema Pergaminho / Chancelaria */}
        <div className="flex items-center gap-3">
          {/* Indicador de Escore Líquido TPS */}
          <div className="hidden sm:flex items-center gap-3 rounded-xl border border-travertine-200 dark:border-itamaraty-navy-800 bg-travertine-100/70 dark:bg-itamaraty-navy-950/70 px-3 py-1.5 text-xs">
            <div>
              <span className="text-ink-500 dark:text-travertine-300">TPS Líquido: </span>
              <strong className="font-mono text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400">
                {netTpsAccuracy}%
              </strong>
            </div>
            <span className="text-travertine-300 dark:text-itamaraty-navy-700">|</span>
            <div>
              <span className="text-ink-500 dark:text-travertine-300">FSRS Hoje: </span>
              <strong className="font-mono text-itamaraty-gold-600 dark:text-itamaraty-gold-400">
                {dueFlashcardsCount} cards
              </strong>
            </div>
          </div>

          {/* Alternador Pergaminho Diurno / Chancelaria Noturna */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-2 rounded-xl border border-travertine-200 dark:border-itamaraty-navy-700 bg-travertine-100 dark:bg-itamaraty-navy-800 px-3 py-2 text-xs font-semibold text-ink-900 dark:text-travertine-100 hover:border-itamaraty-gold-500 transition"
            title="Alternar entre Modo Pergaminho (Diurno) e Modo Chancelaria (Noturno)"
          >
            {theme === "pergaminho" ? (
              <>
                <Sun className="h-4 w-4 text-itamaraty-gold-600" />
                <span className="hidden sm:inline">Pergaminho</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-itamaraty-gold-400" />
                <span className="hidden sm:inline">Chancelaria</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}