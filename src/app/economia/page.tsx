import type { Metadata } from "next";
import EconomicsTrailClient from "@/components/economics/EconomicsTrailClient";
import { StatusPanel, SupabaseSetupHint } from "@/components/ui/StatusPanel";
import { loadShellData, loadSubjectTrail } from "@/lib/data/study-data";

export const metadata: Metadata = { title: "Trilha de Economia" };

function PageMessage({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8">{children}</main>;
}

export default async function EconomiaTrailPage({
  searchParams,
}: {
  searchParams: Promise<{ mod?: string | string[] }>;
}) {
  const [{ mod }, result, shell] = await Promise.all([searchParams, loadSubjectTrail("economia"), loadShellData()]);

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
        <StatusPanel tone="error" title="Não foi possível carregar a trilha agora">
          <p>A consulta ao banco falhou. Os detalhes técnicos estão no log do servidor.</p>
        </StatusPanel>
      </PageMessage>
    );
  }

  if (result.state === "not_found" || result.trail.modules.length === 0) {
    return (
      <PageMessage>
        <StatusPanel tone="info" title="A trilha de Economia ainda não foi semeada">
          <p>
            Os módulos e tópicos vêm de <code className="font-mono">supabase/seed.sql</code>. Aplique o seed no projeto
            Supabase para montar a trilha.
          </p>
        </StatusPanel>
      </PageMessage>
    );
  }

  const requestedModule = Array.isArray(mod) ? mod[0] : mod;
  const initialModuleCode = result.trail.modules.some((m) => m.code === requestedModule) ? requestedModule! : null;

  return (
    <EconomicsTrailClient
      // Remonta ao trocar de módulo pela sidebar, para o filtro acompanhar a URL.
      key={initialModuleCode ?? "todos"}
      trail={result.trail}
      dueFlashcards={shell.stats.dueFlashcards}
      initialModuleCode={initialModuleCode}
    />
  );
}
