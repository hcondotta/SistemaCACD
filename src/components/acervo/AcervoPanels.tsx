import type { AcervoState } from "@/lib/data/acervo-data";
import { StatusPanel, SupabaseSetupHint } from "@/components/ui/StatusPanel";

const MIGRATION = "supabase/migrations/20261114000000_acervo_sem_ia.sql";

/** Estado honesto quando o acervo não pode ser lido: sem banco, sem migração ou com falha. */
export function AcervoStatePanel({ state }: { state: AcervoState }) {
  if (state === "unconfigured") {
    return (
      <StatusPanel tone="setup" title="Banco de dados não configurado">
        <SupabaseSetupHint />
      </StatusPanel>
    );
  }
  if (state === "missing_migration") {
    return (
      <StatusPanel tone="setup" title="Falta preparar o banco para o acervo">
        <p>
          Abra o SQL Editor do Supabase, cole o conteúdo de <code className="font-mono text-xs">{MIGRATION}</code> e
          rode uma vez. Ele cria as seções, as figuras e a busca por palavras. Depois, recarregue esta página.
        </p>
      </StatusPanel>
    );
  }
  return (
    <StatusPanel tone="error" title="Não foi possível ler o acervo agora">
      <p>A consulta ao banco falhou. Os detalhes técnicos estão no log do servidor.</p>
    </StatusPanel>
  );
}

/** Passo a passo de como o conteúdo entra no sistema (quem adiciona é quem mantém o acervo). */
export function HowToAddContent() {
  const folders: Array<[string, string]> = [
    ["livros", "livros e capítulos (PDF, DOCX)"],
    ["apostilas", "apostilas de cursinho"],
    ["aulas", "videoaulas e áudios; a legenda .srt ou .vtt ao lado, se houver"],
    ["provas", "uma pasta por prova, com o caderno e o gabarito"],
    ["anotacoes", "fichamentos e resumos (MD, TXT, DOCX)"],
  ];
  return (
    <ol className="space-y-4 text-sm leading-relaxed text-ink-700 dark:text-travertine-200">
      <li>
        <p className="font-semibold text-ink-900 dark:text-travertine-50">1. Solte os arquivos na pasta certa</p>
        <ul className="mt-2 space-y-1">
          {folders.map(([folder, description]) => (
            <li key={folder} className="flex flex-wrap gap-x-2">
              <code className="font-mono text-xs text-itamaraty-navy-700 dark:text-itamaraty-gold-300">
                acervo/entrada/{folder}/
              </code>
              <span>{description}</span>
            </li>
          ))}
        </ul>
      </li>
      <li>
        <p className="font-semibold text-ink-900 dark:text-travertine-50">2. Dê dois cliques em “Adicionar conteúdo”</p>
        <p className="mt-1">
          O atalho fica em <code className="font-mono text-xs">acervo/Adicionar conteúdo.bat</code>. Ele lê só o que é
          novo, extrai texto, tabelas, figuras e slides no próprio computador e grava aqui.
        </p>
      </li>
      <li>
        <p className="font-semibold text-ink-900 dark:text-travertine-50">3. Ligue capítulos e questões aos tópicos</p>
        <p className="mt-1">Na organização do acervo, cada seção ganha o tópico da trilha a que pertence.</p>
      </li>
    </ol>
  );
}
