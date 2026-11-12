"use client";

import { useEffect, useState } from "react";
import { Award, BookOpen, Menu, Moon, Sun } from "lucide-react";
import { AthosBulcaoPattern } from "@/components/ui/DiplomaticBadges";
import { useLearningLayer, type LearningLayer } from "./learning-layer";

export interface HeaderStats {
  dueFlashcards: number | null;
  netTpsAccuracy: number | null;
}

type Theme = "pergaminho" | "chancelaria";

/** Mesma chave lida pelo script anti-flash do layout. */
const THEME_STORAGE_KEY = "cacd-theme";

const LAYER_OPTIONS: Array<{ id: LearningLayer; shortLabel: string; fullLabel: string; icon: typeof BookOpen }> = [
  { id: "base", shortLabel: "Base Zero", fullLabel: "Camada 1 · Intuição Base Zero", icon: BookOpen },
  { id: "cacd", shortLabel: "Rigor CACD", fullLabel: "Camada 2 · Rigor CACD", icon: Award },
];

function formatNetAccuracy(value: number | null): string {
  if (value === null) return "—";
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export default function ChanceryHeader({
  stats,
  onOpenNavigation,
}: {
  stats: HeaderStats;
  onOpenNavigation: () => void;
}) {
  const { learningLayer, setLearningLayer } = useLearningLayer();
  // null até montar: o tema real só é conhecido no navegador (classe .dark aplicada pelo script do layout).
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "chancelaria" : "pergaminho");
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "chancelaria" ? "pergaminho" : "chancelaria";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "chancelaria");
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Sem armazenamento, o tema vale só até recarregar a página.
    }
  }

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-travertine-200 bg-travertine-50/95 backdrop-blur-md transition-colors dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-900/95">
      <AthosBulcaoPattern className="opacity-[0.03] text-itamaraty-navy-700 dark:text-itamaraty-gold-400" />

      <div className="relative mx-auto flex h-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Esquerda: menu e identidade — só abaixo de 1024 px; acima, a sidebar já cumpre esse papel */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={onOpenNavigation}
            className="rounded-lg p-2 text-ink-700 transition hover:bg-travertine-100 dark:text-travertine-200 dark:hover:bg-itamaraty-navy-800"
            aria-label="Abrir navegação"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="hidden font-serif text-sm font-bold text-ink-900 sm:inline dark:text-travertine-50">
            Gabinete CACD
          </span>
        </div>

        {/* Centro: camada didática global, visível em qualquer tamanho de tela */}
        <div
          className="flex items-center rounded-xl border border-travertine-200 bg-travertine-100 p-1 dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-950"
          role="group"
          aria-label="Camada didática"
        >
          {LAYER_OPTIONS.map(({ id, shortLabel, fullLabel, icon: Icon }) => {
            const isActive = learningLayer === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setLearningLayer(id)}
                aria-pressed={isActive}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition sm:px-3 ${
                  isActive
                    ? "bg-itamaraty-navy-600 text-travertine-50 shadow-sm dark:bg-itamaraty-gold-500 dark:text-itamaraty-navy-950"
                    : "text-ink-500 hover:text-ink-900 dark:text-travertine-300 dark:hover:text-travertine-50"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="xl:hidden">{shortLabel}</span>
                <span className="hidden xl:inline">{fullLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Direita: indicadores reais e tema */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 rounded-xl border border-travertine-200 bg-travertine-100/70 px-3 py-1.5 text-xs md:flex dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-950/70">
            <div title="Acerto líquido no TPS: (certos − errados) ÷ itens respondidos">
              <span className="text-ink-500 dark:text-travertine-300">TPS líquido: </span>
              <strong className="font-mono text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400">
                {formatNetAccuracy(stats.netTpsAccuracy)}
              </strong>
            </div>
            <span className="text-travertine-300 dark:text-itamaraty-navy-700" aria-hidden>
              |
            </span>
            <div title="Flashcards com revisão vencida">
              <span className="text-ink-500 dark:text-travertine-300">FSRS hoje: </span>
              <strong className="font-mono text-itamaraty-gold-600 dark:text-itamaraty-gold-400">
                {stats.dueFlashcards === null ? "—" : `${stats.dueFlashcards} cards`}
              </strong>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-2 rounded-xl border border-travertine-200 bg-travertine-100 px-3 py-2 text-xs font-semibold text-ink-900 transition hover:border-itamaraty-gold-500 dark:border-itamaraty-navy-700 dark:bg-itamaraty-navy-800 dark:text-travertine-100"
            title="Alternar entre Modo Pergaminho (diurno) e Modo Chancelaria (noturno)"
            aria-label={theme === "chancelaria" ? "Mudar para o Modo Pergaminho" : "Mudar para o Modo Chancelaria"}
          >
            {theme === null ? (
              <span className="h-4 w-4" aria-hidden />
            ) : theme === "pergaminho" ? (
              <>
                <Sun className="h-4 w-4 text-itamaraty-gold-600" aria-hidden />
                <span className="hidden sm:inline">Pergaminho</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-itamaraty-gold-400" aria-hidden />
                <span className="hidden sm:inline">Chancelaria</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
