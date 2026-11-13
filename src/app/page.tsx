import Link from "next/link";
import { ArrowRight, BookOpen, Lock } from "lucide-react";
import { AthosBulcaoPattern } from "@/components/ui/DiplomaticBadges";
import { StatusPanel, SupabaseSetupHint } from "@/components/ui/StatusPanel";
import { loadShellData } from "@/lib/data/study-data";

/** Gabinete Geral: as 9 disciplinas do edital e o acesso à trilha de Economia. */
export default async function GabineteGeralPage() {
  const shell = await loadShellData();
  const economia = shell.subjects.find((s) => s.slug === "economia");

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-5 py-10 sm:px-8 sm:py-14">
      <header className="relative overflow-hidden rounded-3xl border border-travertine-200 bg-travertine-100 px-6 py-8 dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-900">
        <AthosBulcaoPattern className="opacity-[0.05] text-itamaraty-navy-700 dark:text-itamaraty-gold-400" />
        <div className="relative">
          <span className="text-xs font-semibold uppercase tracking-wider text-itamaraty-gold-600 dark:text-itamaraty-gold-400">
            Instituto Rio Branco • Gabinete Geral
          </span>
          <h1 className="mt-2 font-serif text-3xl font-bold text-ink-900 sm:text-4xl dark:text-travertine-50">
            Plataforma de Estudo do CACD
          </h1>
          <p className="mt-3 max-w-2xl font-serif text-sm leading-relaxed text-ink-700 sm:text-base dark:text-travertine-200">
            Trilhas sequenciais com trava de pré-requisito, fichas em duas camadas, tutor ancorado no seu próprio acervo,
            simulador de TPS e oficina de discursivas de 3ª Fase.
          </p>
        </div>
      </header>

      {shell.state === "unconfigured" && (
        <StatusPanel tone="setup" title="Banco de dados não configurado">
          <SupabaseSetupHint />
        </StatusPanel>
      )}

      {shell.state === "error" && (
        <StatusPanel tone="error" title="Não foi possível carregar o gabinete agora">
          <p>A consulta ao banco falhou. Os detalhes técnicos estão no log do servidor.</p>
        </StatusPanel>
      )}

      {shell.state === "ok" && (
        <>
          {economia && economia.topicsTotal > 0 && (
            <section className="flex flex-col justify-between gap-5 rounded-3xl bg-chancery-gradient p-6 text-travertine-50 shadow-diplomatic sm:flex-row sm:items-center sm:p-8">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-itamaraty-gold-300">Foco atual</span>
                <h2 className="mt-1 font-serif text-2xl font-bold">Trilha de {economia.name}</h2>
                <p className="mt-1 text-sm text-travertine-200">
                  <span className="font-mono">
                    {economia.theoryDone} de {economia.topicsTotal}
                  </span>{" "}
                  tópicos com a teoria concluída
                </p>
              </div>
              <Link
                href="/economia"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-itamaraty-gold-500 px-5 py-3 text-sm font-bold text-itamaraty-navy-950 transition hover:bg-itamaraty-gold-400"
              >
                <BookOpen className="h-4 w-4" aria-hidden />
                Abrir a trilha
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </section>
          )}

          <section aria-labelledby="disciplinas">
            <h2
              id="disciplinas"
              className="text-sm font-bold uppercase tracking-wider text-ink-700 dark:text-travertine-200"
            >
              Disciplinas do edital ({shell.subjects.length})
            </h2>

            {shell.subjects.length === 0 ? (
              <p className="mt-4 text-sm text-ink-500 dark:text-travertine-300">
                Nenhuma disciplina encontrada: o seed em <code className="font-mono">supabase/seed.sql</code> ainda não foi
                aplicado.
              </p>
            ) : (
              <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {shell.subjects.map((subject) => {
                  const hasTree = subject.topicsTotal > 0;
                  return (
                    <li
                      key={subject.slug}
                      className={`rounded-2xl border p-5 ${
                        hasTree
                          ? "border-itamaraty-gold-500/50 bg-travertine-100 dark:bg-itamaraty-navy-900"
                          : "border-travertine-200 bg-travertine-100/50 dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-900/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3
                          className={`font-serif text-base font-bold ${
                            hasTree ? "text-ink-900 dark:text-travertine-50" : "text-ink-500 dark:text-travertine-300"
                          }`}
                        >
                          {subject.name}
                        </h3>
                        {!hasTree && <Lock className="h-4 w-4 shrink-0 text-ink-500 dark:text-travertine-300" aria-hidden />}
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-ink-500 dark:text-travertine-300">
                        {hasTree
                          ? `${subject.theoryDone} de ${subject.topicsTotal} tópicos com a teoria concluída`
                          : "Árvore pedagógica ainda não construída"}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
