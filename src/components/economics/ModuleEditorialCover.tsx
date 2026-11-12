"use client";

import { useId } from "react";

/**
 * Capas editoriais em SVG dos módulos de Economia, no estilo das publicações
 * da FUNAG. IDs de gradiente e padrão são únicos por instância, para que duas
 * capas do mesmo módulo na tela não disputem a mesma definição.
 */
export default function ModuleEditorialCover({
  moduleCode,
  className = "h-44 w-full",
}: {
  moduleCode: string;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const goldId = `cover-gold-${uid}`;
  const gridId = `cover-grid-${uid}`;
  const gold = `url(#${goldId})`;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-itamaraty-gold-500/30 bg-chancery-gradient shadow-diplomatic ${className}`}
    >
      <svg viewBox="0 0 400 220" className="h-full w-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id={goldId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E5C76B" />
            <stop offset="50%" stopColor="#C59B27" />
            <stop offset="100%" stopColor="#8A6409" />
          </linearGradient>
          <pattern id={gridId} width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#F3EFE6" strokeWidth="0.5" strokeOpacity="0.07" />
          </pattern>
        </defs>

        {/* Fundo geométrico */}
        <rect width="400" height="220" fill={`url(#${gridId})`} />

        {/* Moldura editorial dupla, estilo FUNAG */}
        <rect x="12" y="12" width="376" height="196" rx="6" fill="none" stroke={gold} strokeWidth="1" strokeOpacity="0.45" />

        {/* MOD-0: bússola, balança e eixos coordenados */}
        {moduleCode === "MOD-0" && (
          <g>
            <line x1="60" y1="170" x2="340" y2="170" stroke="#E5C76B" strokeWidth="1.5" strokeOpacity="0.5" />
            <line x1="90" y1="40" x2="90" y2="190" stroke="#E5C76B" strokeWidth="1.5" strokeOpacity="0.5" />
            <path d="M 90 170 Q 190 160 290 60" fill="none" stroke="#108565" strokeWidth="2.5" strokeDasharray="5 3" />
            <circle cx="220" cy="110" r="52" fill="none" stroke={gold} strokeWidth="2" />
            <circle cx="220" cy="110" r="42" fill="none" stroke="#F3EFE6" strokeWidth="0.8" strokeOpacity="0.4" />
            <polygon points="220,62 228,104 270,110 228,116 220,158 212,116 170,110 212,104" fill={gold} fillOpacity="0.85" />
            <circle cx="220" cy="110" r="5" fill="#08111D" />
          </g>
        )}

        {/* MOD-1: colunata modernista e curvas de oferta e demanda */}
        {moduleCode === "MOD-1" && (
          <g>
            <path
              d="M 40 190 L 40 120 A 30 30 0 0 1 100 120 L 100 190 M 115 190 L 115 120 A 30 30 0 0 1 175 120 L 175 190"
              fill="none"
              stroke="#F3EFE6"
              strokeWidth="1.2"
              strokeOpacity="0.18"
            />
            <polygon points="150,55 245,112 150,168" fill="#108565" fillOpacity="0.22" />
            <line x1="140" y1="45" x2="330" y2="175" stroke="#F59E0B" strokeWidth="3" />
            <line x1="140" y1="175" x2="330" y2="45" stroke="#38BDF8" strokeWidth="3" />
            <circle cx="235" cy="110" r="6" fill="#E5C76B" stroke="#08111D" strokeWidth="2" />
            <line x1="120" y1="110" x2="235" y2="110" stroke="#E5C76B" strokeWidth="1.2" strokeDasharray="3 3" />
            <line x1="235" y1="110" x2="235" y2="185" stroke="#E5C76B" strokeWidth="1.2" strokeDasharray="3 3" />
          </g>
        )}

        {/* MOD-2: silhueta do BACEN, fluxo circular e IS-LM */}
        {moduleCode === "MOD-2" && (
          <g>
            <circle cx="200" cy="110" r="64" fill="none" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="6 4" />
            <circle cx="200" cy="110" r="46" fill="none" stroke={gold} strokeWidth="2" />
            <rect x="182" y="58" width="14" height="104" rx="2" fill="#E5C76B" fillOpacity="0.8" />
            <rect x="204" y="58" width="14" height="104" rx="2" fill="#E5C76B" fillOpacity="0.8" />
            <rect x="168" y="98" width="64" height="18" rx="2" fill="#0F1E32" stroke="#E5C76B" strokeWidth="1.8" />
            <path d="M 85 65 L 315 165" stroke="#F59E0B" strokeWidth="2.2" strokeOpacity="0.7" />
            <path d="M 85 165 L 315 65" stroke="#38BDF8" strokeWidth="2.2" strokeOpacity="0.7" />
          </g>
        )}

        {/* MOD-3: esfera armilar (Meteoro) e curva BP */}
        {moduleCode === "MOD-3" && (
          <g>
            <line x1="45" y1="110" x2="355" y2="110" stroke="#10B981" strokeWidth="2.5" strokeDasharray="6 4" />
            <circle cx="200" cy="110" r="58" fill="#08111D" fillOpacity="0.6" stroke={gold} strokeWidth="2.5" />
            <ellipse cx="200" cy="110" rx="58" ry="22" fill="none" stroke="#E5C76B" strokeWidth="1.4" />
            <ellipse cx="200" cy="110" rx="24" ry="58" fill="none" stroke="#38BDF8" strokeWidth="1.4" />
            <circle cx="200" cy="110" r="7" fill="#10B981" />
          </g>
        )}

        {/* MOD-4: café, siderurgia (ISI) e estabilidade do Real */}
        {moduleCode === "MOD-4" && (
          <g>
            <path d="M 55 165 C 120 160, 145 120, 200 120 C 255 120, 285 65, 345 60" fill="none" stroke={gold} strokeWidth="3" />
            <circle cx="95" cy="152" r="18" fill="#0F1E32" stroke="#108565" strokeWidth="2" />
            <ellipse cx="95" cy="152" rx="6" ry="9" fill="#108565" />
            <circle cx="200" cy="120" r="22" fill="#0F1E32" stroke="#E5C76B" strokeWidth="2" />
            <circle cx="200" cy="120" r="9" fill="none" stroke="#E5C76B" strokeWidth="3" strokeDasharray="5 3" />
            <circle cx="310" cy="68" r="20" fill="#0F1E32" stroke="#38BDF8" strokeWidth="2" />
            <text x="310" y="73" textAnchor="middle" fill="#E5C76B" fontSize="13" fontWeight="bold" fontFamily="monospace">
              R$
            </text>
          </g>
        )}

        {/* Selo do código do módulo */}
        <rect x="24" y="22" width="66" height="24" rx="4" fill="#08111D" fillOpacity="0.85" stroke="#C59B27" strokeWidth="1" />
        <text x="57" y="38" textAnchor="middle" fill="#E5C76B" fontSize="11" fontWeight="bold" fontFamily="monospace">
          {moduleCode}
        </text>
      </svg>
    </div>
  );
}
