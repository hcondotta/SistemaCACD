import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AcervoStatePanel, HowToAddContent } from "@/components/acervo/AcervoPanels";
import { DOC_TYPE_LABELS } from "@/lib/acervo";
import { loadAcervoOrganizer } from "@/lib/data/acervo-data";

export const metadata: Metadata = { title: "Organizar o acervo" };

export default async function AcervoOrganizerPage() {
  const result = await loadAcervoOrganizer();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8">
      <Link
        href="/acervo"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-itamaraty-navy-600 hover:underline dark:text-itamaraty-gold-400"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Acervo
      </Link>
      <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-ink-900 dark:text-travertine-50">
        Organizar o acervo
      </h1>
      <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-ink-700 dark:text-travertine-200">
        Área de manutenção: o que entrou, o que falta processar e a que tópico da trilha cada seção pertence. A tela de
        estudo dela só mostra o resultado.
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,19rem)]">
        <section aria-labelledby="documentos">
          <h2 id="documentos" className="border-b-2 border-ink-900 pb-2 font-serif text-xl font-semibold text-ink-900 dark:border-travertine-100 dark:text-travertine-50">
            Documentos
          </h2>
          {result.state !== "ok" ? (
            <div className="mt-4">
              <AcervoStatePanel state={result.state} />
            </div>
          ) : result.documents.length === 0 ? (
            <p className="mt-4 text-sm text-ink-700 dark:text-travertine-200">Nenhum documento ainda. O passo a passo está ao lado.</p>
          ) : (
            <ul>
              {result.documents.map((document) => (
                <li
                  key={document.id}
                  className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 border-t border-travertine-200 py-4 first:border-t-0 dark:border-itamaraty-navy-800"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-serif text-base font-semibold text-ink-900 dark:text-travertine-50">{document.title}</p>
                    <p className="text-xs text-ink-500 dark:text-travertine-300">
                      {DOC_TYPE_LABELS[document.docType].singular}
                      {document.author ? ` · ${document.author}` : ""}
                      {document.filePath ? ` · ${document.filePath}` : ""}
                    </p>
                    {document.warnings > 0 && (
                      <p className="text-xs font-semibold text-itamaraty-gold-700 dark:text-itamaraty-gold-300">
                        {document.warnings} aviso(s) da extração: confira acervo/revisao/{document.title}.md
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-xs">
                    {document.ready ? (
                      <>
                        <span className="tabular-nums text-ink-500 dark:text-travertine-300">
                          {document.linkedSections} de {document.sectionCount} seções com tópico
                        </span>
                        <Link
                          href={`/acervo/organizar/${document.id}`}
                          className="rounded-lg border border-travertine-300 px-3 py-1.5 font-semibold text-ink-900 transition hover:border-itamaraty-gold-500 dark:border-itamaraty-navy-700 dark:text-travertine-50"
                        >
                          Ligar aos tópicos
                        </Link>
                      </>
                    ) : (
                      <span className="font-semibold text-itamaraty-gold-700 dark:text-itamaraty-gold-300">
                        Processamento incompleto: rode o atalho de novo
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside aria-labelledby="como-adicionar" className="rounded-2xl border border-travertine-200 bg-travertine-100 p-6 dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-900">
          <h2 id="como-adicionar" className="mb-4 font-serif text-lg font-semibold text-ink-900 dark:text-travertine-50">
            Como adicionar conteúdo
          </h2>
          <HowToAddContent />
        </aside>
      </div>
    </main>
  );
}
