"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Camada didática global: "base" (Camada 1 — Intuição Base Zero) ou "cacd"
 * (Camada 2 — Rigor CACD). É uma preferência da aluna, não de uma página:
 * fica salva no navegador e vale para a trilha, o estúdio e o Tutor.
 */

export type LearningLayer = "base" | "cacd";

const STORAGE_KEY = "cacd-learning-layer";

interface LearningLayerContextValue {
  learningLayer: LearningLayer;
  setLearningLayer: (layer: LearningLayer) => void;
}

const LearningLayerContext = createContext<LearningLayerContextValue | null>(null);

export function LearningLayerProvider({ children }: { children: ReactNode }) {
  const [learningLayer, setLayerState] = useState<LearningLayer>("base");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "base" || saved === "cacd") setLayerState(saved);
    } catch {
      // Armazenamento bloqueado (navegação privada): segue com a Camada 1.
    }
  }, []);

  const setLearningLayer = useCallback((layer: LearningLayer) => {
    setLayerState(layer);
    try {
      window.localStorage.setItem(STORAGE_KEY, layer);
    } catch {
      // Sem armazenamento, a escolha vale só até recarregar a página.
    }
  }, []);

  const value = useMemo(() => ({ learningLayer, setLearningLayer }), [learningLayer, setLearningLayer]);
  return <LearningLayerContext.Provider value={value}>{children}</LearningLayerContext.Provider>;
}

export function useLearningLayer(): LearningLayerContextValue {
  const context = useContext(LearningLayerContext);
  if (!context) {
    throw new Error("useLearningLayer precisa ser usado dentro de <LearningLayerProvider>.");
  }
  return context;
}
