/*
 * Contrato de direção do Acervo (impeccable)
 * THESIS: o acervo é um índice remissivo — o sumário de todos os livros, aulas e provas dela,
 *   verbete por verbete, com a página na ponta da linha pontilhada. Recusa a grade de cartões
 *   de "biblioteca digital".
 * OWN-WORLD: Itamaraty/Rio Branco — travertino e tinta no claro, marinho da Chancelaria no escuro,
 *   dourado só em códigos de tópico e foco; Newsreader nos títulos e na leitura, Plus Jakarta na
 *   interface, algarismos tabulares; linhas pontilhadas de sumário e fios de 1px.
 * STORY: ela vê o que já está no acervo, chega à seção pelo sumário ou pela busca e lê com a
 *   fonte e a página à vista; no tópico, encontra o material e as questões de prova ligados a ele.
 * FIRST VIEWPORT: título "Acervo" com a contagem real, busca larga, abas de tipo com contagem e,
 *   logo abaixo, o primeiro documento como verbete principal ao lado do seu sumário pontilhado.
 * FORM: estrutura 7 de 7 (fichário / índice remissivo); seed e0791a91.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AcervoSearchForm } from "@/components/acervo/AcervoSearchForm";
import { AcervoStatePanel, HowToAddContent } from "@/components/acervo/AcervoPanels";
import { SumarioEntry } from "@/components/acervo/SumarioEntry";
import { TypeTabs } from "@/components/acervo/TypeTabs";
import { countLabel, DOC_TYPE_LABELS, DOC_TYPE_ORDER, docTypeFromSlug, formatTimestamp, type DocType } from "@/lib/acervo";
import { loadAcervoIndex, type AcervoDocument } from "@/lib/data/acervo-data";

export const metadata: Metadata = { title: "Acervo" };

function documentFacts(document: AcervoDocument): string {
  const facts: string[] = [];
  if (document.pages) facts.push(countLabel(document.pages, "página", "páginas"));
  if (document.durationSeconds) facts.push(formatTimestamp(document.durationSeconds));
  facts.push(countLabel(document.sectionCount, "seção", "seções"));
  if (document.figures) {
    facts.push(
      document.docType === "video_transcript"
        ? countLabel(document.figures, "slide", "slides")
        : countLabel(document.figures, "figura", "figuras"),
    );
  }
  if (document.examItems !== null) facts.push(countLabel(document.examItems, "item com gabarito", "itens com gabarito"));
  return facts.join(" · ");
}

function DocumentEntry({ document }: { document: AcervoDocument }) {
  const readerHref = (position: number) => `/acervo/${document.id}?secao=${position}`;
  const topLevel = Math.min(...document.entries.map((entry) => entry.level), 1);
  return (
    <article className="grid gap-x-10 gap-y-4 border-t border-travertine-200 py-8 first:border-t-0 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] dark:border-itamaraty-navy-800">
      <header className="space-y-2">
        <h3 className="font-serif text-xl font-semibold leading-snug text-ink-900 text-balance dark:text-travertine-50">
          <Link href={readerHref(document.entries[0]?.position ?? 0)} className="hover:underline hover:decoration-itamaraty-gold-500 hover:underline-offset-4">
            {document.title}
          </Link>
        </h3>
        {document.author && <p className="text-sm text-ink-700 dark:text-travertine-200">{document.author}</p>}
        <p className="text-xs leading-relaxed text-ink-500 dark:text-travertine-300">
          {DOC_TYPE_LABELS[document.docType].singular} · {documentFacts(document)}
        </p>
        <Link
          href={readerHref(document.entries[0]?.position ?? 0)}
          className="inline-flex items-center gap-1.5 pt-1 text-sm font-semibold text-itamaraty-navy-600 hover:underline dark:text-itamaraty-gold-400"
        >
          Começar a ler
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </header>

      <div>
        <ul>
          {document.entries.map((entry) => (
            <li key={entry.position}>
              <SumarioEntry
                href={readerHref(entry.position)}
                title={entry.title}
                locator={entry.locator}
                topicCode={entry.topicCode}
                depth={entry.level - topLevel}
              />
            </li>
          ))}
        </ul>
        {document.hiddenEntries > 0 && (
          <Link
            href={readerHref(document.entries[0]?.position ?? 0)}
            className="mt-2 inline-block text-xs font-semibold text-ink-500 hover:text-ink-900 hover:underline dark:text-travertine-300 dark:hover:text-travertine-50"
          >
            + {document.hiddenEntries} {document.hiddenEntries === 1 ? "seção" : "seções"} no sumário completo
          </Link>
        )}
      </div>
    </article>
  );
}

export default async function AcervoPage({ searchParams }: { searchParams: Promise<{ tipo?: string | string[] }> }) {
  const { tipo } = await searchParams;
  const active = docTypeFromSlug(Array.isArray(tipo) ? tipo[0] : tipo);
  const result = await loadAcervoIndex();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8">
      <header className="space-y-5">
        <div className="space-y-2">
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink-900 dark:text-travertine-50">Acervo</h1>
          <p className="max-w-[62ch] text-sm leading-relaxed text-ink-700 dark:text-travertine-200">
            {result.state === "ok" && result.documents.length > 0
              ? `${result.documents.length} ${result.documents.length === 1 ? "documento" : "documentos"} e ${result.totalSections} seções do seu próprio material — livros, aulas, provas e anotações, com a página de cada trecho.`
              : "Os livros, aulas, provas e anotações dela, lidos aqui dentro com a página de cada trecho."}
          </p>
        </div>
        {result.state === "ok" && result.documents.length > 0 && (
          <>
            <AcervoSearchForm docType={active} />
            <TypeTabs basePath="/acervo" counts={result.counts} active={active} />
          </>
        )}
      </header>

      <div className="mt-6">
        {result.state !== "ok" ? (
          <AcervoStatePanel state={result.state} />
        ) : result.documents.length === 0 ? (
          <section className="grid gap-8 rounded-2xl border border-travertine-200 bg-travertine-100 p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-900">
            <div className="space-y-2">
              <h2 className="font-serif text-2xl font-semibold text-ink-900 dark:text-travertine-50">O acervo ainda está vazio</h2>
              <p className="text-sm leading-relaxed text-ink-700 dark:text-travertine-200">
                Nada foi extraído ainda. Quando o primeiro livro, aula ou prova entrar, o sumário dele aparece aqui,
                seção por seção.
              </p>
              {result.pendingDocuments > 0 && (
                <p className="text-sm font-semibold text-itamaraty-gold-700 dark:text-itamaraty-gold-300">
                  {result.pendingDocuments} documento(s) começaram a ser processados e não terminaram: rode o
                  atalho de novo.
                </p>
              )}
            </div>
            <HowToAddContent />
          </section>
        ) : (
          DOC_TYPE_ORDER.filter((type) => !active || type === active).map((type: DocType) => {
            const documents = result.documents.filter((document) => document.docType === type);
            if (documents.length === 0) return null;
            return (
              <section key={type} aria-labelledby={`tipo-${type}`} className="mt-10 first:mt-4">
                <h2
                  id={`tipo-${type}`}
                  className="flex items-baseline gap-3 border-b-2 border-ink-900 pb-2 font-serif text-2xl font-semibold text-ink-900 dark:border-travertine-100 dark:text-travertine-50"
                >
                  {DOC_TYPE_LABELS[type].plural}
                  <span className="font-sans text-sm font-medium tabular-nums text-ink-500 dark:text-travertine-300">
                    {documents.length}
                  </span>
                </h2>
                {documents.map((document) => (
                  <DocumentEntry key={document.id} document={document} />
                ))}
              </section>
            );
          })
        )}
      </div>

      <footer className="mt-14 border-t border-travertine-200 pt-5 text-xs text-ink-500 dark:border-itamaraty-navy-800 dark:text-travertine-300">
        <Link href="/acervo/organizar" className="font-semibold hover:text-ink-900 hover:underline dark:hover:text-travertine-50">
          Organizar o acervo
        </Link>{" "}
        — adicionar material e ligar seções e questões aos tópicos da trilha.
      </footer>
    </main>
  );
}
