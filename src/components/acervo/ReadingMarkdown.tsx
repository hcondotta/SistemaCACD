import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { imageSizeFromTitle } from "@/lib/acervo";

/**
 * Texto de uma seção do acervo. As figuras já chegam com a URL assinada do Storage e as
 * dimensões no título (`resolveAssetLinks`): o espaço fica reservado e o carregamento sob
 * demanda funciona. A legenda aparece embaixo da imagem, como no livro.
 */
export function ReadingMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-itamaraty prose-lg max-w-none font-serif prose-headings:font-serif prose-table:text-base prose-img:my-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt, title }) => {
            const size = imageSizeFromTitle(title);
            return (
              <span className="my-6 block">
                {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada e temporária do Storage */}
                <img
                  src={typeof src === "string" ? src : undefined}
                  alt={alt ?? ""}
                  width={size?.width}
                  height={size?.height}
                  loading={size ? "lazy" : "eager"}
                  decoding="async"
                  className="mx-auto block h-auto max-h-[70vh] w-auto max-w-full rounded-lg border border-travertine-200 bg-white dark:border-itamaraty-navy-700"
                />
                {alt && (
                  <span className="mt-2 block text-center font-sans text-sm text-ink-500 dark:text-travertine-300">{alt}</span>
                )}
              </span>
            );
          },
          table: ({ children }) => (
            <span className="block overflow-x-auto">
              <table>{children}</table>
            </span>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
