"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import ChanceryHeader, { type HeaderStats } from "./ChanceryHeader";
import { LearningLayerProvider } from "./learning-layer";

/**
 * Moldura do app: sidebar fixa a partir de 1024 px, gaveta de navegação abaixo
 * disso (celular e tablet na vertical) e o header comum a todas as páginas.
 */
export default function AppShell({
  sidebar,
  stats,
  children,
}: {
  sidebar: ReactNode;
  stats: HeaderStats;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);

  // Navegou para outra página: a gaveta fecha sozinha.
  useEffect(() => {
    setIsNavigationOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isNavigationOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsNavigationOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isNavigationOpen]);

  return (
    <LearningLayerProvider>
      <div className="flex min-h-screen">
        <div className="sticky top-0 hidden h-screen shrink-0 lg:block">{sidebar}</div>
        <div className="flex min-w-0 flex-1 flex-col">
          <ChanceryHeader stats={stats} onOpenNavigation={() => setIsNavigationOpen(true)} />
          {children}
        </div>
      </div>

      {isNavigationOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Navegação">
          <button
            type="button"
            className="absolute inset-0 bg-itamaraty-navy-950/60 backdrop-blur-sm"
            aria-label="Fechar navegação"
            onClick={() => setIsNavigationOpen(false)}
          />
          <div className="relative h-full max-w-[85vw] shadow-diplomatic">
            {sidebar}
            <button
              type="button"
              autoFocus
              onClick={() => setIsNavigationOpen(false)}
              className="absolute right-3 top-5 rounded-lg p-1.5 text-ink-500 transition hover:bg-travertine-200 dark:text-travertine-300 dark:hover:bg-itamaraty-navy-800"
              aria-label="Fechar navegação"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </LearningLayerProvider>
  );
}
