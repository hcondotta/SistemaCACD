import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import TopicStudioClient from "@/components/economics/TopicStudioClient";
import { StatusPanel, SupabaseSetupHint } from "@/components/ui/StatusPanel";
import { loadTopicAcervo } from "@/lib/data/acervo-data";
import { loadShellData, loadTopicStudio, type TopicStudioData } from "@/lib/data/study-data";
import { isGeminiConfigured } from "@/lib/server-clients";

const SUBJECT_SLUG = "economia";

interface PageProps {
  params: Promise<{ topicCode: string }>;
}

function decodeTopicCode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const result = await loadTopicStudio(SUBJECT_SLUG, decodeTopicCode((await params).topicCode));
  if (result.state !== "ok") return { title: "Estúdio do tópico" };
  return { title: `${result.data.topic.code} ${result.data.topic.title}` };
}

function PageMessage({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8">{children}</main>;
}

/** A trava vale também para quem chega pela URL: o estúdio não é renderizado. */
function LockedTopic({ data }: { data: TopicStudioData }) {
  const unmet = data.prerequisites.filter((p) => !p.isMet);
  return (
    <PageMessage>
      <Link
        href="/economia"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-itamaraty-navy-600 hover:underline dark:text-itamaraty-gold-400"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Trilha de {data.subject.name}
      </Link>

      <section className="mt-6 rounded-3xl border border-travertine-200 bg-travertine-100 p-6 sm:p-8 dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-900">
        <div className="flex items-center gap-2 text-itamaraty-carmine-700 dark:text-itamaraty-carmine-500">
          <Lock className="h-4 w-4" aria-hidden />
          <span className="text-xs font-bold uppercase tracking-wider">Tópico bloqueado</span>
        </div>
        <h1 className="mt-3 font-serif text-2xl font-bold text-ink-900 dark:text-travertine-50">
          {data.topic.code} — {data.topic.title}
        </h1>
        <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-ink-700 dark:text-travertine-200">
          Este tópico depende de uma base que ainda não foi construída. Conclua antes a Camada 1 (Intuição Base Zero) de:
        </p>
        <ul className="mt-4 space-y-2">
          {unmet.map((pre) => (
            <li key={pre.code}>
              <Link
                href={`/economia/${pre.code}`}
                className="inline-flex items-center gap-2 rounded-xl border border-travertine-300 bg-travertine-50 px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-itamaraty-gold-500 dark:border-itamaraty-navy-700 dark:bg-itamaraty-navy-950 dark:text-travertine-50"
              >
                <span className="font-mono text-itamaraty-navy-600 dark:text-itamaraty-gold-400">{pre.code}</span>
                {pre.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PageMessage>
  );
}

export default async function EconomiaTopicStudioPage({ params }: PageProps) {
  const topicCode = decodeTopicCode((await params).topicCode);
  const [result, shell] = await Promise.all([loadTopicStudio(SUBJECT_SLUG, topicCode), loadShellData()]);

  if (result.state === "not_found") notFound();

  if (result.state === "unconfigured") {
    return (
      <PageMessage>
        <StatusPanel tone="setup" title="Banco de dados não configurado">
          <SupabaseSetupHint />
        </StatusPanel>
      </PageMessage>
    );
  }

  if (result.state === "error") {
    return (
      <PageMessage>
        <StatusPanel tone="error" title="Não foi possível carregar este tópico agora">
          <p>A consulta ao banco falhou. Os detalhes técnicos estão no log do servidor.</p>
        </StatusPanel>
      </PageMessage>
    );
  }

  if (result.data.status === "locked") {
    return <LockedTopic data={result.data} />;
  }

  // O Tutor só faz sentido com a IA configurada e algum acervo indexado para consultar.
  const tutorAvailable = isGeminiConfigured() && (shell.stats.indexedChunks ?? 0) > 0;

  const acervo = await loadTopicAcervo(result.data.topic.id);

  return <TopicStudioClient data={result.data} tutorAvailable={tutorAvailable} acervo={acervo} />;
}
