import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AcervoStatePanel } from "@/components/acervo/AcervoPanels";
import { TopicAssignSelect } from "@/components/acervo/TopicAssignSelect";
import { DOC_TYPE_LABELS } from "@/lib/acervo";
import { loadOrganizerDocument } from "@/lib/data/acervo-data";

export const metadata: Metadata = { title: "Ligar seções aos tópicos" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function OrganizeDocumentPage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  if (!UUID.test(documentId)) notFound();
  const result = await loadOrganizerDocument(documentId);
  if (result.state === "not_found") notFound();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8">
      <Link
        href="/acervo/organizar"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-itamaraty-navy-600 hover:underline dark:text-itamaraty-gold-400"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Organizar o acervo
      </Link>

      {result.state !== "ok" ? (
        <div className="mt-6">
          <AcervoStatePanel state={result.state} />
        </div>
      ) : (
        <>
          <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-ink-900 text-balance dark:text-travertine-50">
            {result.document.title}
          </h1>
          <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-ink-700 dark:text-travertine-200">
            {DOC_TYPE_LABELS[result.document.docType].singular} · escolha o tópico de cada seção. A escolha vale na hora
            para a busca e para o estúdio do tópico{result.document.docType === "past_exam" ? ", e leva junto os itens da questão para o treino" : ""}; e
            continua valendo se o arquivo for processado de novo.
          </p>

          <ul className="mt-8">
            {result.sections.map((section) => (
              <li
                key={section.id}
                className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-travertine-200 py-3 first:border-t-0 dark:border-itamaraty-navy-800"
              >
                <div className="min-w-0 flex-1" style={{ paddingLeft: `${Math.min(Math.max(section.level - 1, 0), 4) * 1.1}rem` }}>
                  <Link
                    href={`/acervo/${result.document.id}?secao=${section.position}`}
                    className="text-sm font-medium text-ink-900 hover:underline dark:text-travertine-50"
                  >
                    {section.title}
                  </Link>
                  <span className="ml-2 text-xs tabular-nums text-ink-500 dark:text-travertine-300">{section.locator ?? ""}</span>
                  {section.assignedByHand && (
                    <span className="ml-2 text-[11px] font-semibold text-ink-500 dark:text-travertine-300">· escolhido à mão</span>
                  )}
                </div>
                <TopicAssignSelect
                  sectionId={section.id}
                  sectionTitle={section.title}
                  topics={result.topics}
                  initialTopicId={section.topicId}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
