"use client";

import { useState } from "react";

export interface ExamItemReveal {
  number: number;
  statement: string;
  answer: "C" | "E";
}

const ANSWER_STYLE = {
  C: "border-itamaraty-emerald-600/40 bg-itamaraty-emerald-500/10 text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400",
  E: "border-itamaraty-carmine-500/40 bg-itamaraty-carmine-500/10 text-itamaraty-carmine-700 dark:text-itamaraty-carmine-500",
} as const;

/** Itens Certo/Errado da prova: ela julga primeiro e só depois abre o gabarito oficial. */
export function ExamItemsReveal({ items, idPrefix }: { items: ExamItemReveal[]; idPrefix: string }) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const allRevealed = revealed.size === items.length;

  function toggle(number: number) {
    setRevealed((current) => {
      const next = new Set(current);
      if (next.has(number)) next.delete(number);
      else next.add(number);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setRevealed(allRevealed ? new Set() : new Set(items.map((item) => item.number)))}
          className="rounded-lg px-2.5 py-1 text-xs font-semibold text-itamaraty-navy-600 transition hover:bg-travertine-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-itamaraty-gold-500 dark:text-itamaraty-gold-400 dark:hover:bg-itamaraty-navy-800"
        >
          {allRevealed ? "Esconder o gabarito" : "Mostrar todo o gabarito"}
        </button>
      </div>
      <ol className="space-y-2.5">
        {items.map((item) => {
          const isOpen = revealed.has(item.number);
          const answerId = `${idPrefix}-item-${item.number}`;
          return (
            <li
              key={item.number}
              className="grid grid-cols-[2.25rem_1fr] gap-x-3 gap-y-2 rounded-xl border border-travertine-200 bg-travertine-50 p-4 sm:grid-cols-[2.25rem_1fr_auto] dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-950"
            >
              <span className="font-mono text-sm font-bold tabular-nums text-ink-500 dark:text-travertine-300">{item.number}</span>
              <p className="font-serif text-[1.05rem] leading-relaxed text-ink-900 dark:text-travertine-100">{item.statement}</p>
              <div className="col-start-2 flex items-center gap-2 sm:col-start-3 sm:row-start-1 sm:justify-end">
                {isOpen && (
                  <span
                    id={answerId}
                    className={`rounded-md border px-2 py-0.5 text-xs font-bold ${ANSWER_STYLE[item.answer]}`}
                  >
                    {item.answer === "C" ? "Certo" : "Errado"}
                  </span>
                )}
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={isOpen ? answerId : undefined}
                  onClick={() => toggle(item.number)}
                  className="rounded-lg border border-travertine-300 px-2.5 py-1 text-xs font-semibold text-ink-700 transition hover:border-itamaraty-gold-500 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-itamaraty-gold-500 dark:border-itamaraty-navy-700 dark:text-travertine-200 dark:hover:text-travertine-50"
                >
                  {isOpen ? "Esconder" : "Ver gabarito"}
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
