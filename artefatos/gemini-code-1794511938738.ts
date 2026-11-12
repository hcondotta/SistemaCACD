"use client";

import React from "react";

export type DiplomaticRank =
  | "terceiro_secretario"
  | "segundo_secretario"
  | "primeiro_secretario"
  | "conselheiro"
  | "embaixador";

export type MasteryStatus =
  | "locked"
  | "available"
  | "studying_base"
  | "studying_advanced"
  | "reviewing"
  | "mastered";

export interface RankMetadata {
  rank: DiplomaticRank;
  title: string;
  subtitle: string;
  stars: number;
  accentColor: string;
}

export const DIPLOMATIC_RANKS: Record<DiplomaticRank, RankMetadata> = {
  terceiro_secretario: {
    rank: "terceiro_secretario",
    title: "Terceiro-Secretário",
    subtitle: "Camada 1 • Fundação e Intuição Base Zero",
    stars: 1,
    accentColor: "#38BDF8",
  },
  segundo_secretario: {
    rank: "segundo_secretario",
    title: "Segundo-Secretário",
    subtitle: "Camada 2 • Teoria e Modelos Causais",
    stars: 2,
    accentColor: "#108565",
  },
  primeiro_secretario: {
    rank: "primeiro_secretario",
    title: "Primeiro-Secretário",
    subtitle: "Consolidação TPS & Repetição Espaçada",
    stars: 3,
    accentColor: "#C59B27",
  },
  conselheiro: {
    rank: "conselheiro",
    title: "Conselheiro",
    subtitle: "Domínio Analítico • Precisão Líquida Alta",
    stars: 4,
    accentColor: "#D4AF37",
  },
  embaixador: {
    rank: "embaixador",
    title: "Ministro de 1ª Classe (Embaixador)",
    subtitle: "Excelência 3ª Fase • Padrão Rio Branco",
    stars: 5,
    accentColor: "#E5C76B",
  },
};

export function resolveDiplomaticRank(
  status: MasteryStatus,
  tpsAccuracyRate: number = 0
): RankMetadata {
  if (status === "mastered") return DIPLOMATIC_RANKS.embaixador;
  if (status === "reviewing" && tpsAccuracyRate >= 75) return DIPLOMATIC_RANKS.conselheiro;
  if (status === "reviewing") return DIPLOMATIC_RANKS.primeiro_secretario;
  if (status === "studying_advanced") return DIPLOMATIC_RANKS.segundo_secretario;
  return DIPLOMATIC_RANKS.terceiro_secretario;
}

/**
 * Padrão Geométrico Modular inspirado em Athos Bulcão (Palácio Itamaraty)
 */
export function AthosBulcaoPattern({ className = "opacity-[0.04]" }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
    >
      <defs>
        <pattern id="athos-itamaraty" width="64" height="64" patternUnits="userSpaceOnUse">
          <path d="M0 0 L32 32 L0 64 Z" fill="currentColor" />
          <path d="M64 0 L32 32 L64 64 Z" fill="currentColor" fillOpacity="0.5" />
          <circle cx="32" cy="32" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#athos-itamaraty)" />
    </svg>
  );
}

/**
 * Insígnia Vetorial da Ordem de Rio Branco / Carreira de Diplomata
 */
export function DiplomaticBadge({
  rank,
  size = "md",
  showLabel = false,
}: {
  rank: DiplomaticRank;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}) {
  const meta = DIPLOMATIC_RANKS[rank];
  const dimensions = size === "sm" ? 36 : size === "md" ? 52 : 72;

  return (
    <div className="inline-flex items-center gap-3">
      <div
        className="relative flex items-center justify-center rounded-full shadow-diplomatic"
        style={{ width: dimensions, height: dimensions }}
        title={`${meta.title} — ${meta.subtitle}`}
      >
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`gold-grad-${rank}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E5C76B" />
              <stop offset="50%" stopColor="#C59B27" />
              <stop offset="100%" stopColor="#8A6409" />
            </linearGradient>
            <radialGradient id={`navy-core-${rank}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1E4471" />
              <stop offset="100%" stopColor="#08111D" />
            </radialGradient>
          </defs>

          {/* Resplendor Externo (Apenas Conselheiro e Embaixador) */}
          {(rank === "conselheiro" || rank === "embaixador") && (
            <polygon
              points="50,2 61,18 80,10 78,29 96,35 84,50 96,65 78,71 80,90 61,82 50,98 39,82 20,90 22,71 4,65 16,50 4,35 22,29 20,10 39,18"
              fill={`url(#gold-grad-${rank})`}
              opacity={rank === "embaixador" ? 0.95 : 0.6}
            />
          )}

          {/* Anel Heráldico Externo (Ouro Chancelaria) */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill={`url(#navy-core-${rank})`}
            stroke={`url(#gold-grad-${rank})`}
            strokeWidth="3.5"
          />

          {/* Ramo de Café e Louro Estilizado */}
          <circle
            cx="50"
            cy="50"
            r="33"
            fill="none"
            stroke={meta.accentColor}
            strokeWidth="1.2"
            strokeDasharray="4 2"
          />

          {/* Estrelas de Patente no Centro */}
          {meta.stars === 1 && (
            <circle cx="50" cy="50" r="7" fill={`url(#gold-grad-${rank})`} />
          )}
          {meta.stars === 2 && (
            <>
              <circle cx="39" cy="50" r="6" fill={`url(#gold-grad-${rank})`} />
              <circle cx="61" cy="50" r="6" fill={`url(#gold-grad-${rank})`} />
            </>
          )}
          {meta.stars === 3 && (
            <>
              <circle cx="50" cy="37" r="5.5" fill={`url(#gold-grad-${rank})`} />
              <circle cx="38" cy="57" r="5.5" fill={`url(#gold-grad-${rank})`} />
              <circle cx="62" cy="57" r="5.5" fill={`url(#gold-grad-${rank})`} />
            </>
          )}
          {meta.stars === 4 && (
            <>
              <circle cx="50" cy="34" r="5" fill={`url(#gold-grad-${rank})`} />
              <circle cx="50" cy="66" r="5" fill={`url(#gold-grad-${rank})`} />
              <circle cx="34" cy="50" r="5" fill={`url(#gold-grad-${rank})`} />
              <circle cx="66" cy="50" r="5" fill={`url(#gold-grad-${rank})`} />
            </>
          )}
          {meta.stars === 5 && (
            <>
              <polygon
                points="50,30 55,43 69,43 58,51 62,65 50,57 38,65 42,51 31,43 45,43"
                fill={`url(#gold-grad-${rank})`}
              />
            </>
          )}
        </svg>
      </div>

      {showLabel && (
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-wider text-itamaraty-gold-600 dark:text-itamaraty-gold-400">
            {meta.title}
          </span>
          <span className="text-[11px] text-ink-500 dark:text-travertine-300">
            {meta.subtitle}
          </span>
        </div>
      )}
    </div>
  );
}