"use client";

import { useId } from "react";
import type { DiplomaticRank } from "@/lib/trail";

/**
 * Insígnias da carreira diplomática e padrão geométrico de Athos Bulcão.
 *
 * A regra que decide QUAL patente um tópico merece vive em `@/lib/trail`
 * (`resolveDiplomaticRank`, coberta por testes). Aqui fica só a apresentação.
 */

export interface RankMetadata {
  title: string;
  subtitle: string;
  stars: 1 | 2 | 3 | 4 | 5;
  accentColor: string;
}

export const DIPLOMATIC_RANKS: Record<DiplomaticRank, RankMetadata> = {
  terceiro_secretario: {
    title: "Terceiro-Secretário",
    subtitle: "Camada 1 em estudo • Intuição Base Zero",
    stars: 1,
    accentColor: "#38BDF8",
  },
  segundo_secretario: {
    title: "Segundo-Secretário",
    subtitle: "Camada 2 em estudo • Rigor CACD",
    stars: 2,
    accentColor: "#108565",
  },
  primeiro_secretario: {
    title: "Primeiro-Secretário",
    subtitle: "Teoria concluída • Consolidação no TPS e no FSRS",
    stars: 3,
    accentColor: "#C59B27",
  },
  conselheiro: {
    title: "Conselheiro",
    subtitle: "Domínio analítico • Acerto líquido de 75% ou mais",
    stars: 4,
    accentColor: "#D4AF37",
  },
  embaixador: {
    title: "Ministro de 1ª Classe (Embaixador)",
    subtitle: "Tópico dominado • Padrão Rio Branco",
    stars: 5,
    accentColor: "#E5C76B",
  },
};

/** IDs de SVG únicos por instância: a trilha exibe dezenas de insígnias iguais. */
function useSvgId(prefix: string): string {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

/** Padrão geométrico modular inspirado em Athos Bulcão (Palácio Itamaraty). */
export function AthosBulcaoPattern({ className = "opacity-[0.04]" }: { className?: string }) {
  const patternId = useSvgId("athos");
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
    >
      <defs>
        <pattern id={patternId} width="64" height="64" patternUnits="userSpaceOnUse">
          <path d="M0 0 L32 32 L0 64 Z" fill="currentColor" />
          <path d="M64 0 L32 32 L64 64 Z" fill="currentColor" fillOpacity="0.5" />
          <circle cx="32" cy="32" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}

const BADGE_SIZES = { sm: 36, md: 52, lg: 72 } as const;

/** Insígnia vetorial da Ordem de Rio Branco / carreira de Diplomata. */
export function DiplomaticBadge({
  rank,
  size = "md",
  showLabel = false,
}: {
  rank: DiplomaticRank;
  size?: keyof typeof BADGE_SIZES;
  showLabel?: boolean;
}) {
  const meta = DIPLOMATIC_RANKS[rank];
  const dimension = BADGE_SIZES[size];
  const goldId = useSvgId("gold");
  const navyId = useSvgId("navy");
  const gold = `url(#${goldId})`;

  return (
    <div className="inline-flex items-center gap-3">
      <div
        className="relative flex shrink-0 items-center justify-center rounded-full shadow-diplomatic"
        style={{ width: dimension, height: dimension }}
        title={`${meta.title} — ${meta.subtitle}`}
      >
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label={meta.title}
        >
          <defs>
            <linearGradient id={goldId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E5C76B" />
              <stop offset="50%" stopColor="#C59B27" />
              <stop offset="100%" stopColor="#8A6409" />
            </linearGradient>
            <radialGradient id={navyId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1E4471" />
              <stop offset="100%" stopColor="#08111D" />
            </radialGradient>
          </defs>

          {/* Resplendor externo: apenas Conselheiro e Embaixador */}
          {(rank === "conselheiro" || rank === "embaixador") && (
            <polygon
              points="50,2 61,18 80,10 78,29 96,35 84,50 96,65 78,71 80,90 61,82 50,98 39,82 20,90 22,71 4,65 16,50 4,35 22,29 20,10 39,18"
              fill={gold}
              opacity={rank === "embaixador" ? 0.95 : 0.6}
            />
          )}

          {/* Anel heráldico em Ouro Chancelaria */}
          <circle cx="50" cy="50" r="40" fill={`url(#${navyId})`} stroke={gold} strokeWidth="3.5" />

          {/* Ramo de café e louro estilizado */}
          <circle cx="50" cy="50" r="33" fill="none" stroke={meta.accentColor} strokeWidth="1.2" strokeDasharray="4 2" />

          {/* Estrelas da patente */}
          {meta.stars === 1 && <circle cx="50" cy="50" r="7" fill={gold} />}
          {meta.stars === 2 && (
            <>
              <circle cx="39" cy="50" r="6" fill={gold} />
              <circle cx="61" cy="50" r="6" fill={gold} />
            </>
          )}
          {meta.stars === 3 && (
            <>
              <circle cx="50" cy="37" r="5.5" fill={gold} />
              <circle cx="38" cy="57" r="5.5" fill={gold} />
              <circle cx="62" cy="57" r="5.5" fill={gold} />
            </>
          )}
          {meta.stars === 4 && (
            <>
              <circle cx="50" cy="34" r="5" fill={gold} />
              <circle cx="50" cy="66" r="5" fill={gold} />
              <circle cx="34" cy="50" r="5" fill={gold} />
              <circle cx="66" cy="50" r="5" fill={gold} />
            </>
          )}
          {meta.stars === 5 && (
            <polygon points="50,30 55,43 69,43 58,51 62,65 50,57 38,65 42,51 31,43 45,43" fill={gold} />
          )}
        </svg>
      </div>

      {showLabel && (
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-wider text-itamaraty-gold-600 dark:text-itamaraty-gold-400">
            {meta.title}
          </span>
          <span className="text-[11px] text-ink-500 dark:text-travertine-300">{meta.subtitle}</span>
        </div>
      )}
    </div>
  );
}
