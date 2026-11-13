import Link from "next/link";
import { DOC_TYPE_LABELS, DOC_TYPE_ORDER, type DocType } from "@/lib/acervo";

/** Filtro por tipo de material, com a contagem real de cada um. Tipos vazios ficam de fora. */
export function TypeTabs({
  basePath,
  counts,
  active,
  extraQuery = "",
}: {
  basePath: string;
  counts: Partial<Record<DocType, number>>;
  active: DocType | null;
  extraQuery?: string;
}) {
  const total = Object.values(counts).reduce((sum, value) => sum + (value ?? 0), 0);
  const tabs: Array<{ type: DocType | null; label: string; count: number }> = [
    { type: null, label: "Tudo", count: total },
    ...DOC_TYPE_ORDER.filter((type) => (counts[type] ?? 0) > 0).map((type) => ({
      type,
      label: DOC_TYPE_LABELS[type].plural,
      count: counts[type] ?? 0,
    })),
  ];
  const href = (type: DocType | null) => {
    const params = new URLSearchParams(extraQuery);
    if (type) params.set("tipo", DOC_TYPE_LABELS[type].slug);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <nav aria-label="Filtrar por tipo de material" className="-mx-1 overflow-x-auto">
      <ul className="flex min-w-max gap-1 border-b border-travertine-200 px-1 dark:border-itamaraty-navy-800">
        {tabs.map(({ type, label, count }) => {
          const isActive = type === active;
          return (
            <li key={label}>
              <Link
                href={href(type)}
                aria-current={isActive ? "page" : undefined}
                className={`-mb-px inline-flex items-baseline gap-1.5 border-b-2 px-3 py-2.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-itamaraty-gold-500 ${
                  isActive
                    ? "border-itamaraty-navy-600 font-bold text-ink-900 dark:border-itamaraty-gold-400 dark:text-travertine-50"
                    : "border-transparent font-medium text-ink-500 hover:text-ink-900 dark:text-travertine-300 dark:hover:text-travertine-50"
                }`}
              >
                {label}
                <span className="text-xs tabular-nums opacity-80">{count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
