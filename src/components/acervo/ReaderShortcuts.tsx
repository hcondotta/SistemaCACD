"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Setas ← e → passam de seção, como virar a página; ignoradas enquanto ela digita. */
export function ReaderShortcuts({ previousHref, nextHref }: { previousHref: string | null; nextHref: string | null }) {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "ArrowLeft" && previousHref) router.push(previousHref);
      if (event.key === "ArrowRight" && nextHref) router.push(nextHref);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, previousHref, nextHref]);

  return null;
}
