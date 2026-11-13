import Link from "next/link";
import { AcervoStatePanel } from "@/components/acervo/AcervoPanels";
import { ExamItemsReveal } from "@/components/acervo/ExamItemsReveal";
import { DOC_TYPE_LABELS } from "@/lib/acervo";
import type { TopicAcervoResult } from "@/lib/data/acervo-data";

export function topicAcervoCount(acervo: TopicAcervoResult): number {
  return acervo.state === "ok" ? acervo.readings.length + acervo.questions.length : 0;
}

/** Aba do estúdio: o que do acervo dela foi ligado a este tópico — leituras e questões de prova. */
export function TopicAcervoPanel({ acervo }: { acervo: TopicAcervoResult }) {
  if (acervo.state !== "ok") return <AcervoStatePanel state={acervo.state} />;

  if (acervo.readings.length === 0 && acervo.questions.length === 0) {
    return (
      <div className="max-w-[62ch] space-y-2 rounded-2xl border border-travertine-200 bg-travertine-100 p-6 text-sm leading-relaxed text-ink-700 dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-900 dark:text-travertine-200">
        <p className="font-serif text-lg font-semibold text-ink-900 dark:text-travertine-50">Nada do acervo ligado a este tópico ainda</p>
        <p>
          Os capítulos, trechos de aula e questões de prova aparecem aqui quando forem ligados ao tópico na{" "}
          <Link href="/acervo/organizar" className="font-semibold text-itamaraty-navy-600 hover:underline dark:text-itamaraty-gold-400">
            organização do acervo
          </Link>
          . Enquanto isso, a{" "}
          <Link href="/acervo" className="font-semibold text-itamaraty-navy-600 hover:underline dark:text-itamaraty-gold-400">
            busca no acervo
          </Link>{" "}
          acha o assunto em todo o material.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <section aria-labelledby="leituras-do-topico" className="min-w-0">
        <h2 id="leituras-do-topico" className="border-b-2 border-ink-900 pb-2 font-serif text-xl font-semibold text-ink-900 dark:border-travertine-100 dark:text-travertine-50">
          Para ler
          <span className="ml-2 font-sans text-sm font-medium tabular-nums text-ink-500 dark:text-travertine-300">{acervo.readings.length}</span>
        </h2>
        {acervo.readings.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500 dark:text-travertine-300">Nenhum capítulo ou aula ligado ainda.</p>
        ) : (
          <ul>
            {acervo.readings.map((reading) => (
              <li key={`${reading.documentId}-${reading.position}`} className="border-t border-travertine-200 py-4 first:border-t-0 dark:border-itamaraty-navy-800">
                <Link href={`/acervo/${reading.documentId}?secao=${reading.position}`} className="group block space-y-1">
                  <p className="flex items-end gap-2">
                    <span className="font-serif text-base font-semibold text-ink-900 group-hover:underline group-hover:decoration-itamaraty-gold-500 group-hover:underline-offset-4 dark:text-travertine-50">
                      {reading.title}
                    </span>
                    {reading.locator && (
                      <>
                        <span aria-hidden className="mb-[0.35em] min-w-5 flex-1 border-b border-dotted border-ink-500/45 dark:border-travertine-300/35" />
                        <span className="shrink-0 text-xs tabular-nums text-ink-500 dark:text-travertine-300">{reading.locator}</span>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-ink-500 dark:text-travertine-300">
                    {DOC_TYPE_LABELS[reading.docType].singular} · {reading.docTitle}
                  </p>
                  {reading.excerpt && (
                    <p className="line-clamp-3 font-serif text-sm leading-relaxed text-ink-700 dark:text-travertine-200">{reading.excerpt}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="questoes-do-topico" className="min-w-0">
        <h2 id="questoes-do-topico" className="border-b-2 border-ink-900 pb-2 font-serif text-xl font-semibold text-ink-900 dark:border-travertine-100 dark:text-travertine-50">
          Questões de prova
          <span className="ml-2 font-sans text-sm font-medium tabular-nums text-ink-500 dark:text-travertine-300">{acervo.questions.length}</span>
        </h2>
        {acervo.questions.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500 dark:text-travertine-300">Nenhuma questão de prova ligada ainda.</p>
        ) : (
          <ul className="space-y-8 pt-4">
            {acervo.questions.map((question) => (
              <li key={`${question.documentId}-${question.number}`} className="space-y-3">
                <p className="text-xs text-ink-500 dark:text-travertine-300">
                  {question.sectionPosition !== null ? (
                    <Link
                      href={`/acervo/${question.documentId}?secao=${question.sectionPosition}`}
                      className="font-semibold text-itamaraty-navy-600 hover:underline dark:text-itamaraty-gold-400"
                    >
                      {question.docTitle} · questão {question.number}
                    </Link>
                  ) : (
                    <span className="font-semibold">
                      {question.docTitle} · questão {question.number}
                    </span>
                  )}
                  {question.year ? ` · ${question.year}` : ""}
                </p>
                {question.text && (
                  <p className="whitespace-pre-line font-serif text-[1.05rem] leading-relaxed text-ink-900 dark:text-travertine-100">
                    {question.text}
                  </p>
                )}
                <ExamItemsReveal items={question.items} idPrefix={`topico-${question.documentId}-${question.number}`} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
