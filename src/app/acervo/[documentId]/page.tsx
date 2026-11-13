import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AcervoStatePanel } from "@/components/acervo/AcervoPanels";
import { ExamItemsReveal } from "@/components/acervo/ExamItemsReveal";
import { ReaderShortcuts } from "@/components/acervo/ReaderShortcuts";
import { ReadingMarkdown } from "@/components/acervo/ReadingMarkdown";
import { SumarioEntry } from "@/components/acervo/SumarioEntry";
import { DOC_TYPE_LABELS, splitExamSection } from "@/lib/acervo";
import { loadDocumentReader, type ReaderData, type ReaderSection } from "@/lib/data/acervo-data";

interface PageProps {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<{ secao?: string | string[] }>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveParams({ params, searchParams }: PageProps) {
  const [{ documentId }, { secao }] = await Promise.all([params, searchParams]);
  const raw = Number(Array.isArray(secao) ? secao[0] : (secao ?? 0));
  return { documentId, position: Number.isInteger(raw) && raw >= 0 ? raw : 0 };
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { documentId, position } = await resolveParams(props);
  if (!UUID.test(documentId)) return { title: "Acervo" };
  const result = await loadDocumentReader(documentId, position);
  if (result.state !== "ok") return { title: "Acervo" };
  return { title: `${result.data.current.title} · ${result.data.document.title}` };
}

function sectionHref(documentId: string, section: Pick<ReaderSection, "position">) {
  return `/acervo/${documentId}?secao=${section.position}`;
}

function Sumario({ data }: { data: ReaderData }) {
  const topLevel = Math.min(...data.sections.map((section) => section.level));
  return (
    <ul>
      {data.sections.map((section) => (
        <li key={section.id}>
          <SumarioEntry
            href={sectionHref(data.document.id, section)}
            title={section.title}
            locator={section.locator}
            topicCode={section.topic?.code}
            depth={section.level - topLevel}
            current={section.position === data.current.position}
          />
        </li>
      ))}
    </ul>
  );
}

export default async function DocumentReaderPage(props: PageProps) {
  const { documentId, position } = await resolveParams(props);
  if (!UUID.test(documentId)) notFound();
  const result = await loadDocumentReader(documentId, position);
  if (result.state === "not_found") notFound();
  if (result.state !== "ok") {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8">
        <AcervoStatePanel state={result.state} />
      </main>
    );
  }

  const { data } = result;
  const { document, current, previous, next } = data;
  const isExam = document.docType === "past_exam";
  const body = isExam && data.examItems ? splitExamSection(current.contentMd) : current.contentMd;
  const path = current.headingPath.slice(0, -1);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8">
      <ReaderShortcuts
        previousHref={previous ? sectionHref(document.id, previous) : null}
        nextHref={next ? sectionHref(document.id, next) : null}
      />

      <nav aria-label="Você está em" className="text-xs text-ink-500 dark:text-travertine-300">
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <li>
            <Link href="/acervo" className="font-semibold text-itamaraty-navy-600 hover:underline dark:text-itamaraty-gold-400">
              Acervo
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li className="font-semibold text-ink-700 dark:text-travertine-200">{document.title}</li>
          {path.map((part) => (
            <li key={part} className="flex items-center gap-1.5">
              <span aria-hidden>›</span>
              <span>{part}</span>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto pr-2">
            <p className="mb-2 font-serif text-base font-semibold text-ink-900 dark:text-travertine-50">Sumário</p>
            <Sumario data={data} />
          </div>
        </aside>

        <article className="min-w-0">
          <details className="mb-6 rounded-xl border border-travertine-200 bg-travertine-100 px-4 py-3 lg:hidden dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-900">
            <summary className="cursor-pointer text-sm font-semibold text-ink-900 dark:text-travertine-50">
              Sumário · {data.sections.length} {data.sections.length === 1 ? "seção" : "seções"}
            </summary>
            <div className="mt-3 max-h-[60vh] overflow-y-auto">
              <Sumario data={data} />
            </div>
          </details>

          <header className="max-w-[68ch] space-y-3 border-b border-travertine-200 pb-6 dark:border-itamaraty-navy-800">
            <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-ink-900 text-balance sm:text-4xl dark:text-travertine-50">
              {current.title}
            </h1>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-700 dark:text-travertine-200">
              <span>
                {DOC_TYPE_LABELS[document.docType].singular}
                {document.author ? ` · ${document.author}` : ""}
              </span>
              {current.locator && <span className="tabular-nums text-ink-500 dark:text-travertine-300">{current.locator}</span>}
              {current.topic && (
                <Link
                  href={`/economia/${current.topic.code}`}
                  className="inline-flex items-baseline gap-1.5 font-semibold text-itamaraty-navy-600 hover:underline dark:text-itamaraty-gold-400"
                >
                  <span className="font-mono text-xs text-itamaraty-gold-700 dark:text-itamaraty-gold-400">{current.topic.code}</span>
                  {current.topic.title}
                </Link>
              )}
            </p>
          </header>

          <div className="max-w-[68ch] py-6">
            {body ? (
              <ReadingMarkdown markdown={body} />
            ) : (
              <p className="text-sm text-ink-500 dark:text-travertine-300">Esta seção não tem texto além do título.</p>
            )}
            {data.examItems && data.examItems.length > 0 && (
              <div className="mt-8">
                <ExamItemsReveal items={data.examItems} idPrefix={`q-${current.position}`} />
              </div>
            )}
          </div>

          <nav
            aria-label="Seções vizinhas"
            className="grid max-w-[68ch] gap-3 border-t border-travertine-200 pt-5 sm:grid-cols-2 dark:border-itamaraty-navy-800"
          >
            {previous ? (
              <Link
                href={sectionHref(document.id, previous)}
                className="group rounded-xl px-3 py-2.5 transition hover:bg-travertine-100 dark:hover:bg-itamaraty-navy-900"
              >
                <span className="flex items-center gap-1.5 text-xs text-ink-500 dark:text-travertine-300">
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Anterior
                </span>
                <span className="mt-0.5 block font-serif text-base font-semibold text-ink-900 group-hover:underline dark:text-travertine-50">
                  {previous.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                href={sectionHref(document.id, next)}
                className="group rounded-xl px-3 py-2.5 text-right transition hover:bg-travertine-100 sm:col-start-2 dark:hover:bg-itamaraty-navy-900"
              >
                <span className="flex items-center justify-end gap-1.5 text-xs text-ink-500 dark:text-travertine-300">
                  Próxima <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="mt-0.5 block font-serif text-base font-semibold text-ink-900 group-hover:underline dark:text-travertine-50">
                  {next.title}
                </span>
              </Link>
            )}
          </nav>
          <p className="mt-3 hidden max-w-[68ch] text-xs text-ink-500 sm:block dark:text-travertine-300">
            Dica: as setas ← e → do teclado também passam de seção.
          </p>
        </article>
      </div>
    </main>
  );
}
