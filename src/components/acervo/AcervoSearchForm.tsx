import { Search } from "lucide-react";
import type { DocType } from "@/lib/acervo";
import { DOC_TYPE_LABELS } from "@/lib/acervo";

/** Busca por palavras no acervo. É um formulário GET comum: funciona sem JavaScript. */
export function AcervoSearchForm({ query = "", docType = null }: { query?: string; docType?: DocType | null }) {
  return (
    <form action="/acervo/busca" method="get" role="search" className="flex gap-2">
      <label htmlFor="acervo-busca" className="sr-only">
        Procurar no acervo
      </label>
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500 dark:text-travertine-300"
          aria-hidden
        />
        <input
          id="acervo-busca"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Procurar no acervo"
          autoComplete="off"
          className="w-full rounded-xl border border-travertine-300 bg-travertine-50 py-3 pl-10 pr-3 text-base text-ink-900 placeholder:text-ink-500 outline-none transition focus:border-itamaraty-gold-500 focus:ring-2 focus:ring-itamaraty-gold-500/40 dark:border-itamaraty-navy-700 dark:bg-itamaraty-navy-900 dark:text-travertine-50 dark:placeholder:text-travertine-300"
        />
      </div>
      {docType && <input type="hidden" name="tipo" value={DOC_TYPE_LABELS[docType].slug} />}
      <button
        type="submit"
        className="shrink-0 rounded-xl bg-itamaraty-navy-600 px-5 text-sm font-bold text-travertine-50 transition hover:bg-itamaraty-navy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-itamaraty-gold-500 dark:bg-itamaraty-gold-500 dark:text-itamaraty-navy-950 dark:hover:bg-itamaraty-gold-400"
      >
        Procurar
      </button>
    </form>
  );
}
