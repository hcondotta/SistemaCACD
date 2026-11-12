import { AlertTriangle, Info, Settings2 } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Painel de estado para quando não há dado real a mostrar: banco não
 * configurado, falha de consulta ou conteúdo ainda não gerado. É o substituto
 * honesto dos "fallbacks" com números inventados.
 */

const TONES = {
  info: {
    icon: Info,
    classes:
      "border-travertine-300 bg-travertine-100 text-ink-700 dark:border-itamaraty-navy-700 dark:bg-itamaraty-navy-900 dark:text-travertine-200",
    title: "text-ink-900 dark:text-travertine-50",
  },
  setup: {
    icon: Settings2,
    classes:
      "border-itamaraty-gold-500/50 bg-itamaraty-gold-500/10 text-ink-700 dark:text-travertine-200",
    title: "text-itamaraty-gold-700 dark:text-itamaraty-gold-300",
  },
  error: {
    icon: AlertTriangle,
    classes:
      "border-itamaraty-carmine-500/50 bg-itamaraty-carmine-500/10 text-ink-700 dark:text-travertine-200",
    title: "text-itamaraty-carmine-700 dark:text-itamaraty-carmine-500",
  },
} as const;

export function StatusPanel({
  tone,
  title,
  children,
}: {
  tone: keyof typeof TONES;
  title: string;
  children: ReactNode;
}) {
  const { icon: Icon, classes, title: titleClasses } = TONES[tone];
  return (
    <div className={`rounded-2xl border p-6 ${classes}`} role={tone === "error" ? "alert" : "status"}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 shrink-0 ${titleClasses}`} aria-hidden />
        <h2 className={`text-sm font-bold ${titleClasses}`}>{title}</h2>
      </div>
      <div className="mt-3 max-w-[68ch] text-sm leading-relaxed">{children}</div>
    </div>
  );
}

/** Texto padrão para o estado "banco não configurado". */
export function SupabaseSetupHint() {
  return (
    <p>
      Preencha <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
      <code className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code> no{" "}
      <code className="font-mono text-xs">.env.local</code> (o modelo está em{" "}
      <code className="font-mono text-xs">.env.example</code>) e reinicie o servidor.
    </p>
  );
}
