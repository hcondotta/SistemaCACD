import Link from "next/link";

/**
 * Verbete de sumário: título, linha pontilhada e a localização na ponta (página ou minutagem),
 * como num índice de livro. O recuo segue o nível da seção dentro do documento.
 */
export function SumarioEntry({
  href,
  title,
  locator,
  topicCode,
  depth = 0,
  current = false,
}: {
  href: string;
  title: string;
  locator: string | null;
  topicCode?: string | null;
  depth?: number;
  current?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "location" : undefined}
      className={`group flex items-end gap-2 rounded-md py-1.5 pr-1 text-sm leading-snug outline-none transition focus-visible:ring-2 focus-visible:ring-itamaraty-gold-500 ${
        current
          ? "font-semibold text-itamaraty-navy-700 dark:text-itamaraty-gold-300"
          : "text-ink-700 hover:text-ink-900 dark:text-travertine-200 dark:hover:text-travertine-50"
      }`}
      style={{ paddingLeft: `${Math.min(depth, 4) * 1.1}rem` }}
    >
      <span className="min-w-0 group-hover:underline group-hover:decoration-itamaraty-gold-500 group-hover:underline-offset-4">
        {title}
      </span>
      {topicCode && (
        <span className="mb-px shrink-0 font-mono text-[11px] font-semibold text-itamaraty-gold-700 dark:text-itamaraty-gold-400">
          {topicCode}
        </span>
      )}
      {/* A linha pontilhada só existe para levar o olho até a página; sem página, não há linha. */}
      {locator && (
        <>
          <span
            aria-hidden
            className="mb-[0.3em] min-w-5 flex-1 border-b border-dotted border-ink-500/45 dark:border-travertine-300/35"
          />
          <span className="shrink-0 text-xs tabular-nums text-ink-500 dark:text-travertine-300">{locator}</span>
        </>
      )}
    </Link>
  );
}
