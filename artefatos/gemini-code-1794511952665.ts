"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  TrendingUp,
  FileCheck2,
  Feather,
  Layers,
  AlertTriangle,
  Globe2,
  Scale,
  BookMarked,
  Languages,
  Landmark,
} from "lucide-react";

export interface SubjectNavItem {
  slug: string;
  name: string;
  progress: number;
  isPriority?: boolean;
}

const CACD_SUBJECTS: SubjectNavItem[] = [
  { slug: "economia", name: "Economia", progress: 42, isPriority: true },
  { slug: "historia-do-brasil", name: "História do Brasil", progress: 65 },
  { slug: "politica-internacional", name: "Política Internacional", progress: 58 },
  { slug: "historia-mundial", name: "História Mundial", progress: 50 },
  { slug: "direito-internacional", name: "Direito Internacional", progress: 48 },
  { slug: "direito-interno", name: "Direito Interno", progress: 40 },
  { slug: "geografia", name: "Geografia", progress: 55 },
  { slug: "portugues", name: "Língua Portuguesa", progress: 72 },
  { slug: "ingles", name: "Língua Inglesa", progress: 70 },
];

const ECONOMIA_MODULES = [
  { code: "MOD-0", title: "0. Fundação e Gráficos (Base Zero)", href: "/economia?mod=MOD-0" },
  { code: "MOD-1", title: "1. Microeconomia Aplicada", href: "/economia?mod=MOD-1" },
  { code: "MOD-2", title: "2. Macroeconomia e IS-LM", href: "/economia?mod=MOD-2" },
  { code: "MOD-3", title: "3. Câmbio, BP e Mundell-Fleming", href: "/economia?mod=MOD-3" },
  { code: "MOD-4", title: "4. História Econômica do Brasil", href: "/economia?mod=MOD-4" },
];

export default function DiplomaticSidebar() {
  const pathname = usePathname();

  const mainStudios = [
    { name: "Trilha Guiada do Edital", href: "/economia", icon: Compass },
    { name: "Tradutor de Gráficos & BP", href: "/economia/modelos", icon: TrendingUp },
    { name: "Arena TPS (Certo/Errado)", href: "/tps", icon: FileCheck2 },
    { name: "Caderno de Erros", href: "/caderno-de-erros", icon: AlertTriangle },
    { name: "Oficina 3ª Fase (90 Linhas)", href: "/discursivas", icon: Feather },
    { name: "Revisão Espaçada (FSRS)", href: "/revisao", icon: Layers },
  ];

  return (
    <aside className="flex h-screen w-72 flex-col border-r border-travertine-200 dark:border-itamaraty-navy-800 bg-travertine-100/80 dark:bg-itamaraty-navy-950 text-ink-900 dark:text-travertine-100 select-none">
      {/* Cabeçalho da Chancelaria */}
      <div className="border-b border-travertine-200 dark:border-itamaraty-navy-800 px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-itamaraty-navy-700 dark:bg-itamaraty-gold-500 text-white dark:text-itamaraty-navy-950 font-serif font-bold text-lg shadow-sm">
            RB
          </div>
          <div>
            <h1 className="font-serif text-base font-bold tracking-tight text-ink-900 dark:text-white">
              Instituto Rio Branco
            </h1>
            <p className="text-[11px] font-medium uppercase tracking-widest text-itamaraty-gold-600 dark:text-itamaraty-gold-400">
              Gabinete de Estudos CACD
            </p>
          </div>
        </div>
      </div>

      {/* Navegação Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {/* Bloco 1: Estúdios de Treinamento */}
        <div>
          <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-ink-500 dark:text-travertine-300 mb-2">
            Ambientes de Estudo
          </p>
          <nav className="space-y-1">
            {mainStudios.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                    isActive
                      ? "bg-itamaraty-navy-600 text-white dark:bg-itamaraty-gold-500 dark:text-itamaraty-navy-950 shadow-sm"
                      : "text-ink-700 dark:text-travertine-200 hover:bg-travertine-200/60 dark:hover:bg-itamaraty-navy-900"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bloco 2: Árvore Modular de Economia (Foco Prioritário) */}
        <div className="rounded-2xl border border-travertine-200 dark:border-itamaraty-navy-800 bg-travertine-50 dark:bg-itamaraty-navy-900/70 p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-itamaraty-gold-600 dark:text-itamaraty-gold-400">
              Trilha de Economia
            </span>
            <span className="font-mono text-[11px] font-bold text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400">
              24 Tópicos
            </span>
          </div>
          <div className="space-y-1">
            {ECONOMIA_MODULES.map((mod) => (
              <Link
                key={mod.code}
                href={mod.href}
                className="block rounded-lg px-2.5 py-1.5 text-xs text-ink-700 dark:text-travertine-200 hover:bg-travertine-200/60 dark:hover:bg-itamaraty-navy-800 transition"
              >
                {mod.title}
              </Link>
            ))}
          </div>
        </div>

        {/* Bloco 3: As 9 Disciplinas do Edital */}
        <div>
          <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-ink-500 dark:text-travertine-300 mb-2">
            Disciplinas do Concurso (9)
          </p>
          <div className="space-y-2">
            {CACD_SUBJECTS.map((subj) => (
              <Link
                key={subj.slug}
                href={`/${subj.slug}`}
                className="block rounded-xl border border-transparent hover:border-travertine-200 dark:hover:border-itamaraty-navy-800 px-3 py-2 transition"
              >
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={`font-semibold ${
                      subj.isPriority
                        ? "text-itamaraty-navy-700 dark:text-itamaraty-gold-400 font-bold"
                        : "text-ink-700 dark:text-travertine-200"
                    }`}
                  >
                    {subj.name}
                  </span>
                  <span className="font-mono text-[11px] text-ink-500 dark:text-travertine-300">
                    {subj.progress}%
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-travertine-200 dark:bg-itamaraty-navy-800">
                  <div
                    className={`h-full rounded-full ${
                      subj.isPriority
                        ? "bg-itamaraty-gold-500"
                        : "bg-itamaraty-emerald-600 dark:bg-itamaraty-emerald-500"
                    }`}
                    style={{ width: `${subj.progress}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Rodapé com Acervo RAG */}
      <div className="border-t border-travertine-200 dark:border-itamaraty-navy-800 px-4 py-3 text-[11px] text-ink-500 dark:text-travertine-300 flex items-center justify-between">
        <span>RAG Estrito Ativo</span>
        <span className="font-mono text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400">
          pgvector • RRF
        </span>
      </div>
    </aside>
  );
}