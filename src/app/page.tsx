import { AlertTriangle, BookOpen, CheckCircle2, Lock } from "lucide-react";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/server-clients";

// A home lê o banco a cada requisição; nada aqui deve ser congelado no build.
export const dynamic = "force-dynamic";

interface Subject {
  id: string;
  slug: string;
  name: string;
  display_order: number;
  has_third_phase_essay: boolean;
}

interface TrilhaData {
  subjects: Subject[];
  moduleCountBySubject: Map<string, number>;
  topicCountBySubject: Map<string, number>;
}

type LoadResult =
  | { status: "unconfigured" }
  | { status: "error"; message: string }
  | { status: "ok"; data: TrilhaData };

async function loadTrilha(): Promise<LoadResult> {
  if (!isSupabaseConfigured()) {
    return { status: "unconfigured" };
  }

  try {
    const supabase = getSupabaseAdmin();

    const [subjectsRes, modulesRes, topicsRes] = await Promise.all([
      supabase
        .from("subjects")
        .select("id, slug, name, display_order, has_third_phase_essay")
        .order("display_order"),
      supabase.from("modules").select("id, subject_id"),
      supabase.from("topics").select("id, module_id"),
    ]);

    const failure = subjectsRes.error ?? modulesRes.error ?? topicsRes.error;
    if (failure) {
      return { status: "error", message: failure.message };
    }

    const modules = modulesRes.data ?? [];
    const topics = topicsRes.data ?? [];

    const moduleCountBySubject = new Map<string, number>();
    const subjectByModule = new Map<string, string>();
    for (const module of modules) {
      subjectByModule.set(module.id, module.subject_id);
      moduleCountBySubject.set(
        module.subject_id,
        (moduleCountBySubject.get(module.subject_id) ?? 0) + 1,
      );
    }

    const topicCountBySubject = new Map<string, number>();
    for (const topic of topics) {
      const subjectId = subjectByModule.get(topic.module_id);
      if (!subjectId) continue;
      topicCountBySubject.set(
        subjectId,
        (topicCountBySubject.get(subjectId) ?? 0) + 1,
      );
    }

    return {
      status: "ok",
      data: {
        subjects: subjectsRes.data ?? [],
        moduleCountBySubject,
        topicCountBySubject,
      },
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Erro desconhecido.",
    };
  }
}

function PainelDeAviso({
  tom,
  titulo,
  children,
}: {
  tom: "ambar" | "vermelho";
  titulo: string;
  children: React.ReactNode;
}) {
  const estilo =
    tom === "ambar"
      ? "border-amber-700/60 bg-amber-950/30 text-amber-300"
      : "border-rose-700/60 bg-rose-950/30 text-rose-300";

  return (
    <div className={`rounded-2xl border p-6 ${estilo}`}>
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" aria-hidden />
        <h2 className="text-sm font-bold uppercase tracking-wider">{titulo}</h2>
      </div>
      <div className="mt-3 text-sm leading-relaxed text-slate-200">{children}</div>
    </div>
  );
}

function CartaoDisciplina({
  subject,
  moduleCount,
  topicCount,
}: {
  subject: Subject;
  moduleCount: number;
  topicCount: number;
}) {
  const trilhaPronta = topicCount > 0;

  return (
    <article
      className={`rounded-2xl border p-5 transition ${
        trilhaPronta
          ? "border-amber-600/50 bg-slate-900"
          : "border-slate-800 bg-slate-900/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3
          className={`text-base font-bold ${
            trilhaPronta ? "text-white" : "text-slate-400"
          }`}
        >
          {subject.name}
        </h3>
        {trilhaPronta ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
        ) : (
          <Lock className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
        )}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-400">
        {trilhaPronta
          ? `${moduleCount} módulos · ${topicCount} tópicos mapeados ao edital`
          : "Árvore pedagógica ainda não construída"}
      </p>

      {subject.has_third_phase_essay && (
        <span className="mt-3 inline-block rounded-md border border-slate-700 px-2 py-0.5 text-[11px] text-slate-400">
          Discursiva de 3ª fase
        </span>
      )}
    </article>
  );
}

export default async function Home() {
  const resultado = await loadTrilha();

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <header className="border-b border-slate-800 pb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
          Instituto Rio Branco
        </span>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
          Plataforma de Estudo do CACD
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
          Trilhas sequenciais com trava de pré-requisito, tutor ancorado no seu
          próprio acervo, simulador de TPS com caderno de erros automático e
          oficina de discursivas de 3ª fase.
        </p>
      </header>

      <section className="mt-10">
        {resultado.status === "unconfigured" && (
          <PainelDeAviso tom="ambar" titulo="Banco de dados não configurado">
            <p>
              Copie <code className="text-amber-300">.env.example</code> para{" "}
              <code className="text-amber-300">.env.local</code> e preencha as
              chaves do Supabase e do Gemini. Depois aplique as migrações em{" "}
              <code className="text-amber-300">supabase/migrations/</code> e o seed
              em <code className="text-amber-300">supabase/seed.sql</code>.
            </p>
          </PainelDeAviso>
        )}

        {resultado.status === "error" && (
          <PainelDeAviso tom="vermelho" titulo="Falha ao consultar o banco">
            <p className="font-mono text-xs">{resultado.message}</p>
            <p className="mt-3">
              Verifique se as migrações e o seed já foram aplicados ao projeto
              Supabase apontado no <code>.env.local</code>.
            </p>
          </PainelDeAviso>
        )}

        {resultado.status === "ok" && (
          <>
            <div className="flex items-center gap-2 text-slate-300">
              <BookOpen className="h-4 w-4 text-amber-400" aria-hidden />
              <h2 className="text-sm font-bold uppercase tracking-wider">
                Disciplinas do edital ({resultado.data.subjects.length})
              </h2>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {resultado.data.subjects.map((subject) => (
                <CartaoDisciplina
                  key={subject.id}
                  subject={subject}
                  moduleCount={
                    resultado.data.moduleCountBySubject.get(subject.id) ?? 0
                  }
                  topicCount={
                    resultado.data.topicCountBySubject.get(subject.id) ?? 0
                  }
                />
              ))}
            </div>

            {resultado.data.subjects.length === 0 && (
              <p className="mt-5 text-sm text-slate-400">
                Nenhuma disciplina encontrada. O seed em{" "}
                <code className="text-amber-300">supabase/seed.sql</code> ainda
                não foi aplicado.
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
