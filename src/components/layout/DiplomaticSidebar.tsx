"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Compass,
  Database,
  Feather,
  FileCheck2,
  Layers,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { ShellData } from "@/lib/data/study-data";

interface StudyEnvironment {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Ambientes sem página ainda aparecem desabilitados, nunca como link quebrado. */
  available: boolean;
}

const STUDY_ENVIRONMENTS: StudyEnvironment[] = [
  { name: "Trilha Guiada do Edital", href: "/economia", icon: Compass, available: true },
  { name: "Tradutor de Gráficos & BP", href: "/economia/modelos", icon: TrendingUp, available: false },
  { name: "Arena TPS (Certo/Errado)", href: "/tps", icon: FileCheck2, available: false },
  { name: "Caderno de Erros", href: "/caderno-de-erros", icon: AlertTriangle, available: false },
  { name: "Oficina 3ª Fase (90 Linhas)", href: "/discursivas", icon: Feather, available: false },
  { name: "Revisão Espaçada (FSRS)", href: "/revisao", icon: Layers, available: false },
];

/** Disciplinas que já têm página de trilha. As demais mostram só o progresso. */
const SUBJECT_ROUTES: Record<string, string> = { economia: "/economia" };

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DiplomaticSidebar({ shell }: { shell: ShellData }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-72 select-none flex-col border-r border-travertine-200 bg-travertine-100 text-ink-900 dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-950 dark:text-travertine-100">
      {/* Identidade da Chancelaria */}
      <Link href="/" className="block border-b border-travertine-200 px-6 py-5 dark:border-itamaraty-navy-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-itamaraty-navy-700 font-serif text-lg font-bold text-travertine-50 shadow-sm dark:bg-itamaraty-gold-500 dark:text-itamaraty-navy-950">
            RB
          </div>
          <div>
            <p className="font-serif text-base font-bold tracking-tight text-ink-900 dark:text-travertine-50">
              Instituto Rio Branco
            </p>
            <p className="text-[11px] font-medium uppercase tracking-widest text-itamaraty-gold-600 dark:text-itamaraty-gold-400">
              Gabinete de Estudos CACD
            </p>
          </div>
        </div>
      </Link>

      <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-5" aria-label="Navegação principal">
        {/* Ambientes de estudo */}
        <div>
          <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-ink-500 dark:text-travertine-300">
            Ambientes de Estudo
          </p>
          <ul className="space-y-1">
            {STUDY_ENVIRONMENTS.map(({ name, href, icon: Icon, available }) => {
              if (!available) {
                return (
                  <li
                    key={href}
                    className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-ink-500/60 dark:text-travertine-300/40"
                    aria-disabled="true"
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="flex-1">{name}</span>
                    <span className="rounded border border-current px-1.5 py-px text-[9px] font-bold uppercase tracking-wider">
                      em breve
                    </span>
                  </li>
                );
              }
              const isActive = isActivePath(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                      isActive
                        ? "bg-itamaraty-navy-600 text-travertine-50 shadow-sm dark:bg-itamaraty-gold-500 dark:text-itamaraty-navy-950"
                        : "text-ink-700 hover:bg-travertine-200/60 dark:text-travertine-200 dark:hover:bg-itamaraty-navy-900"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span>{name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Módulos de Economia (vindos do banco) */}
        {shell.economiaModules.length > 0 && (
          <div className="rounded-2xl border border-travertine-200 bg-travertine-50 p-3.5 dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-900/70">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-itamaraty-gold-600 dark:text-itamaraty-gold-400">
              Trilha de Economia
            </p>
            <ul className="space-y-1">
              {shell.economiaModules.map((module) => (
                <li key={module.code}>
                  <Link
                    href={`/economia?mod=${encodeURIComponent(module.code)}`}
                    className="flex gap-2 rounded-lg px-2.5 py-1.5 text-xs text-ink-700 transition hover:bg-travertine-200/60 dark:text-travertine-200 dark:hover:bg-itamaraty-navy-800"
                  >
                    <span className="shrink-0 font-mono text-[11px] text-ink-500 dark:text-travertine-300">
                      {module.code}
                    </span>
                    <span className="line-clamp-2">{module.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* As 9 disciplinas do edital, com progresso real */}
        <div>
          <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-ink-500 dark:text-travertine-300">
            Disciplinas do Concurso
          </p>

          {shell.state === "unconfigured" && (
            <p className="px-3 text-xs leading-relaxed text-ink-500 dark:text-travertine-300">
              Banco de dados não configurado.
            </p>
          )}
          {shell.state === "error" && (
            <p className="px-3 text-xs leading-relaxed text-itamaraty-carmine-700 dark:text-itamaraty-carmine-500">
              Não foi possível carregar as disciplinas agora.
            </p>
          )}

          <ul className="space-y-1.5">
            {shell.subjects.map((subject) => {
              const route = SUBJECT_ROUTES[subject.slug];
              const hasTree = subject.topicsTotal > 0;
              const percent = hasTree ? Math.round((subject.theoryDone / subject.topicsTotal) * 100) : 0;
              const content = (
                <>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span
                      className={`font-semibold ${
                        hasTree ? "text-ink-900 dark:text-travertine-50" : "text-ink-500 dark:text-travertine-300"
                      }`}
                    >
                      {subject.name}
                    </span>
                    {hasTree ? (
                      <span
                        className="font-mono text-[11px] text-ink-500 dark:text-travertine-300"
                        title="Tópicos com a teoria concluída"
                      >
                        {subject.theoryDone}/{subject.topicsTotal}
                      </span>
                    ) : (
                      <span className="text-[10px] text-ink-500 dark:text-travertine-300">árvore pendente</span>
                    )}
                  </div>
                  {hasTree && (
                    <div
                      className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-travertine-200 dark:bg-itamaraty-navy-800"
                      role="progressbar"
                      aria-valuenow={percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${subject.name}: ${percent}% da teoria concluída`}
                    >
                      <div
                        className="h-full rounded-full bg-itamaraty-emerald-600 dark:bg-itamaraty-emerald-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  )}
                </>
              );
              return (
                <li key={subject.slug}>
                  {route ? (
                    <Link
                      href={route}
                      className="block rounded-xl border border-transparent px-3 py-2 transition hover:border-travertine-200 dark:hover:border-itamaraty-navy-800"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="px-3 py-2">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Rodapé: tamanho real do acervo indexado para o RAG */}
      <div className="flex items-center gap-2 border-t border-travertine-200 px-4 py-3 text-[11px] text-ink-500 dark:border-itamaraty-navy-800 dark:text-travertine-300">
        <Database className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          {shell.stats.indexedChunks === null
            ? "Acervo indisponível"
            : `Acervo: ${shell.stats.indexedChunks.toLocaleString("pt-BR")} trechos indexados`}
        </span>
      </div>
    </aside>
  );
}
