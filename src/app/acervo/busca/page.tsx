import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AcervoSearchForm } from "@/components/acervo/AcervoSearchForm";
import { AcervoStatePanel } from "@/components/acervo/AcervoPanels";
import { DOC_TYPE_LABELS, docTypeFromSlug, type DocType } from "@/lib/acervo";
import { searchAcervo, type SearchHit } from "@/lib/data/acervo-data";

export const metadata: Metadata = { title: "Busca no acervo" };

const MAX_QUERY = 200;

function HitEntry({ hit }: { hit: SearchHit }) {
  const href = hit.sectionPosition === null ? `/acervo/${hit.documentId}` : `/acervo/${hit.documentId}?secao=${hit.sectionPosition}`;
  return (
    <li className="border-t border-travertine-200 py-5 first:border-t-0 dark:border-itamaraty-navy-800">
      <Link href={href} className="group block space-y-1.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-itamaraty-gold-500">
        <p className="flex flex-wrap items-baseline gap-x-2 text-xs text-ink-500 dark:text-travertine-300">
          <span className="font-semibold text-ink-700 dark:text-travertine-200">{DOC_TYPE_LABELS[hit.docType].singular}</span>
          <span>{hit.citationLabel}</span>
          {hit.topicCode && <span className="font-mono font-semibold text-itamaraty-gold-700 dark:text-itamaraty-gold-400">{hit.topicCode}</span>}
        </p>
        <p className="font-serif text-lg leading-relaxed text-ink-900 group-hover:text-itamaraty-navy-700 dark:text-travertine-100 dark:group-hover:text-travertine-50">
          {hit.snippet.map((part, index) =>
            part.highlight ? (
              <mark
                key={index}
                className="rounded-sm bg-itamaraty-gold-300/60 px-0.5 text-ink-900 dark:bg-itamaraty-gold-500/35 dark:text-travertine-50"
              >
                {part.text}
              </mark>
            ) : (
              <span key={index}>{part.text}</span>
            ),
          )}
        </p>
      </Link>
    </li>
  );
}

export default async function AcervoSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; tipo?: string | string[] }>;
}) {
  const params = await searchParams;
  const query = (Array.isArray(params.q) ? params.q[0] : (params.q ?? "")).trim().slice(0, MAX_QUERY);
  const docType: DocType | null = docTypeFromSlug(Array.isArray(params.tipo) ? params.tipo[0] : params.tipo);
  const result = query ? await searchAcervo(query, docType) : null;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10 sm:px-8">
      <Link
        href="/acervo"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-itamaraty-navy-600 hover:underline dark:text-itamaraty-gold-400"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Acervo
      </Link>
      <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-ink-900 dark:text-travertine-50">
        Busca no acervo
      </h1>
      <div className="mt-5">
        <AcervoSearchForm query={query} docType={docType} />
      </div>

      <div className="mt-8">
        {!query ? (
          <p className="max-w-[62ch] text-sm leading-relaxed text-ink-700 dark:text-travertine-200">
            Escreva uma palavra ou expressão. Acento não importa (“cambio” acha “câmbio”); use aspas para a frase
            exata, <span className="font-semibold">OR</span> para alternativas e um hífen antes da palavra para
            excluir.
          </p>
        ) : result && result.state !== "ok" ? (
          <AcervoStatePanel state={result.state} />
        ) : result && result.state === "ok" && result.hits.length === 0 ? (
          <div className="max-w-[62ch] space-y-2 text-sm leading-relaxed text-ink-700 dark:text-travertine-200">
            <p className="font-semibold text-ink-900 dark:text-travertine-50">Nenhum trecho do acervo tem “{query}”.</p>
            <p>Tente uma palavra só, o termo do livro (“trindade impossível”) ou tire o filtro de tipo.</p>
          </div>
        ) : result && result.state === "ok" ? (
          <>
            <p className="text-sm text-ink-500 dark:text-travertine-300">
              {result.hits.length} {result.hits.length === 1 ? "trecho" : "trechos"}
              {docType ? ` em ${DOC_TYPE_LABELS[docType].plural.toLowerCase()}` : ""}, do mais relevante ao menos.
            </p>
            <ol className="mt-2">
              {result.hits.map((hit) => (
                <HitEntry key={hit.chunkId} hit={hit} />
              ))}
            </ol>
          </>
        ) : null}
      </div>
    </main>
  );
}
