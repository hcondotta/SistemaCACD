"use client";

import { useEffect, useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BookOpenCheck, GitCommitHorizontal, Lightbulb, Loader2, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import { useLearningLayer, type LearningLayer } from "@/components/layout/learning-layer";
import { saveTutorFlashcard } from "@/lib/actions/study-actions";
import type { TutorResponse } from "@/lib/schemas/ai-contracts";

interface ChatEntry {
  id: string;
  question: string;
  layerUsed: LearningLayer;
  response: TutorResponse;
  sourcesCount: number;
  timestamp: string;
}

type FlashcardState = { status: "saving" } | { status: "saved" } | { status: "error"; message: string };

const QUICK_PROMPTS = [
  "Me explique a intuição deste tópico do zero, sem economês pesado.",
  "Qual é a cadeia causal passo a passo e o que desloca a curva no gráfico?",
  "Como isso afeta as contas do Balanço de Pagamentos (BPM6)?",
  "Quais são as pegadinhas clássicas da banca neste ponto?",
  "Como conectar esta teoria com a História Econômica do Brasil na 3ª Fase?",
];

/** Lê a resposta da rota sem quebrar quando ela não devolve JSON (404, erro de proxy etc.). */
async function readTutorResponse(response: Response): Promise<{ data?: TutorResponse; rawChunksCount?: number; error?: string }> {
  if (response.status === 404) {
    return { error: "O Tutor ainda não está disponível nesta versão do sistema." };
  }
  try {
    return await response.json();
  } catch {
    return { error: "O Tutor devolveu uma resposta ilegível. Tente de novo em instantes." };
  }
}

export default function TutorRAGDrawer({
  isOpen,
  onClose,
  subjectId,
  topicId,
  topicCode,
  topicTitle,
}: {
  isOpen: boolean;
  onClose: () => void;
  subjectId: string;
  topicId: string;
  topicCode: string;
  topicTitle: string;
}) {
  const { learningLayer } = useLearningLayer();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [flashcards, setFlashcards] = useState<Record<string, FlashcardState>>({});
  const [, startSaving] = useTransition();

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function ask(promptText?: string) {
    const query = (promptText ?? question).trim();
    if (!query || loading) return;

    setLoading(true);
    setErrorMessage(null);
    if (!promptText) setQuestion("");

    try {
      const response = await fetch("/api/tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query, subjectId, topicId, learningLayer }),
      });
      const payload = await readTutorResponse(response);
      if (!response.ok || payload.error || !payload.data) {
        throw new Error(payload.error ?? "Não foi possível consultar o acervo agora.");
      }

      setHistory((previous) => [
        {
          id: crypto.randomUUID(),
          question: query,
          layerUsed: learningLayer,
          response: payload.data as TutorResponse,
          sourcesCount: payload.rawChunksCount ?? 0,
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        },
        ...previous,
      ]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erro inesperado na consulta ao Tutor.");
    } finally {
      setLoading(false);
    }
  }

  function saveFlashcard(entryId: string, card: NonNullable<TutorResponse["suggested_flashcard"]>) {
    setFlashcards((previous) => ({ ...previous, [entryId]: { status: "saving" } }));
    startSaving(async () => {
      const result = await saveTutorFlashcard({
        topicId,
        frontPrompt: card.front_prompt,
        backAnswer: card.back_answer,
      });
      setFlashcards((previous) => ({
        ...previous,
        [entryId]: result.ok ? { status: "saved" } : { status: "error", message: result.error },
      }));
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="tutor-titulo">
      <button
        type="button"
        className="absolute inset-0 bg-itamaraty-navy-950/60 backdrop-blur-sm"
        aria-label="Fechar o Tutor"
        onClick={onClose}
      />

      <div className="relative flex h-full w-full max-w-xl flex-col border-l border-travertine-200 bg-travertine-50 text-ink-900 shadow-diplomatic dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-900 dark:text-travertine-100">
        <div className="flex items-center justify-between border-b border-travertine-200 bg-travertine-100 px-5 py-4 dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-950">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400" aria-hidden />
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400">
                Tutor RAG estrito • Só responde com o seu acervo
              </span>
            </div>
            <h2 id="tutor-titulo" className="mt-0.5 font-serif text-base font-bold text-ink-900 dark:text-travertine-50">
              Tópico {topicCode}: {topicTitle}
            </h2>
          </div>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="rounded-lg p-2 text-ink-500 transition hover:bg-travertine-200 dark:text-travertine-300 dark:hover:bg-itamaraty-navy-800"
            aria-label="Fechar o Tutor"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-travertine-200 bg-travertine-100/50 px-5 py-2 text-xs dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-900">
          <span className="text-ink-500 dark:text-travertine-300">Modo de explicação:</span>
          <span className="rounded-md bg-itamaraty-navy-700 px-2.5 py-0.5 font-bold text-travertine-50 dark:bg-itamaraty-gold-500 dark:text-itamaraty-navy-950">
            {learningLayer === "base" ? "Camada 1 · Intuição Base Zero" : "Camada 2 · Rigor CACD"}
          </span>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500 dark:text-travertine-300">
              Perguntas rápidas sobre este tópico
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={loading}
                  onClick={() => ask(prompt)}
                  className="rounded-lg border border-travertine-200 bg-travertine-100 px-2.5 py-1.5 text-left text-xs text-ink-700 transition hover:border-itamaraty-gold-500 disabled:opacity-40 dark:border-itamaraty-navy-700 dark:bg-itamaraty-navy-950 dark:text-travertine-200"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-3 rounded-xl border border-itamaraty-gold-500/40 bg-travertine-100 p-4 text-xs dark:bg-itamaraty-navy-950" role="status">
              <Loader2 className="h-4 w-4 animate-spin text-itamaraty-gold-600 dark:text-itamaraty-gold-400" aria-hidden />
              Consultando os trechos mais relevantes dos seus livros, aulas e fichamentos…
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl border border-itamaraty-carmine-500 bg-itamaraty-carmine-500/10 p-4 text-xs text-itamaraty-carmine-700 dark:text-itamaraty-carmine-500" role="alert">
              {errorMessage}
            </div>
          )}

          {history.length === 0 && !loading ? (
            <div className="space-y-2 rounded-2xl border border-dashed border-travertine-300 p-6 text-center dark:border-itamaraty-navy-800">
              <Sparkles className="mx-auto h-6 w-6 text-itamaraty-gold-500" aria-hidden />
              <p className="font-serif text-sm font-semibold text-ink-900 dark:text-travertine-50">
                Tire dúvidas ancoradas só no seu acervo
              </p>
              <p className="text-xs leading-relaxed text-ink-500 dark:text-travertine-300">
                O Tutor responde apenas com o que estiver nos seus livros, aulas e fichamentos indexados, e cita a fonte de
                cada trecho. Se o ponto não estiver coberto, ele diz isso em vez de inventar.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {history.map((entry) => {
                const card = entry.response.suggested_flashcard;
                const cardState = flashcards[entry.id];
                return (
                  <article
                    key={entry.id}
                    className="space-y-4 rounded-2xl border border-travertine-200 bg-travertine-100/70 p-4 shadow-parchment dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-950"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-travertine-200 pb-3 dark:border-itamaraty-navy-800">
                      <p className="font-serif text-sm font-bold text-ink-900 dark:text-travertine-50">&ldquo;{entry.question}&rdquo;</p>
                      <span className="shrink-0 font-mono text-[10px] text-ink-500 dark:text-travertine-300">
                        {entry.timestamp} • {entry.sourcesCount} {entry.sourcesCount === 1 ? "fonte" : "fontes"}
                      </span>
                    </div>

                    {entry.response.base_analogy && (
                      <div className="space-y-1 rounded-xl border border-itamaraty-gold-500/40 bg-itamaraty-gold-500/10 p-3">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-itamaraty-gold-700 dark:text-itamaraty-gold-400">
                          <Lightbulb className="h-3.5 w-3.5" aria-hidden />
                          Intuição visual / analogia Base Zero
                        </div>
                        <p className="text-xs leading-relaxed text-ink-900 dark:text-travertine-100">{entry.response.base_analogy}</p>
                      </div>
                    )}

                    <div className="prose prose-sm prose-itamaraty max-w-none font-serif">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.response.direct_answer_md}</ReactMarkdown>
                    </div>

                    {entry.response.causal_chain_summary.length > 0 && (
                      <div className="space-y-2 rounded-xl border border-travertine-200 bg-travertine-50 p-3 dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-900">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400">
                          <GitCommitHorizontal className="h-3.5 w-3.5" aria-hidden />
                          Cadeia de transmissão econômica
                        </div>
                        <ol className="flex flex-wrap items-center gap-1.5 text-xs">
                          {entry.response.causal_chain_summary.map((step, index) => (
                            <li key={index} className="flex items-center gap-1.5">
                              <span className="rounded-md border border-travertine-200 bg-travertine-100 px-2 py-1 font-medium text-ink-900 dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-950 dark:text-travertine-100">
                                {step}
                              </span>
                              {index < entry.response.causal_chain_summary.length - 1 && (
                                <span className="font-bold text-itamaraty-gold-600 dark:text-itamaraty-gold-400" aria-hidden>
                                  →
                                </span>
                              )}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {entry.response.citations_used.length > 0 && (
                      <div className="space-y-1.5 border-t border-travertine-200 pt-2 dark:border-itamaraty-navy-800">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-500 dark:text-travertine-300">
                          <BookOpenCheck className="h-3.5 w-3.5" aria-hidden />
                          Fontes do acervo utilizadas
                        </div>
                        <ul className="space-y-1">
                          {entry.response.citations_used.map((citation, index) => (
                            <li key={index} className="rounded-lg bg-travertine-50 px-2.5 py-1.5 text-[11px] dark:bg-itamaraty-navy-900">
                              <strong className="text-itamaraty-navy-700 dark:text-itamaraty-gold-400">[{citation.citation_label}]</strong>{" "}
                              <span className="text-ink-700 dark:text-travertine-200">{citation.exact_quote_or_concept}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {card && (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-itamaraty-emerald-700/40 bg-itamaraty-emerald-500/10 px-3 py-2">
                        <div className="text-[11px]">
                          <span className="font-bold text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400">Flashcard sugerido: </span>
                          <span className="text-ink-700 dark:text-travertine-200">{card.front_prompt}</span>
                          {cardState?.status === "error" && (
                            <span className="mt-1 block text-itamaraty-carmine-700 dark:text-itamaraty-carmine-500" role="alert">
                              {cardState.message}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => saveFlashcard(entry.id, card)}
                          disabled={cardState?.status === "saving" || cardState?.status === "saved"}
                          className="shrink-0 rounded-lg bg-itamaraty-emerald-700 px-2.5 py-1 text-[11px] font-bold text-travertine-50 disabled:opacity-50"
                        >
                          {cardState?.status === "saved"
                            ? "Salvo na fila FSRS"
                            : cardState?.status === "saving"
                              ? "Salvando…"
                              : "+ Fila FSRS"}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            ask();
          }}
          className="border-t border-travertine-200 bg-travertine-100 p-4 dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-950"
        >
          <div className="flex items-center gap-2">
            <label htmlFor="tutor-pergunta" className="sr-only">
              Sua pergunta ao Tutor
            </label>
            <input
              id="tutor-pergunta"
              type="text"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Pergunte sobre uma curva, equação, autor ou plano econômico…"
              className="flex-1 rounded-xl border border-travertine-200 bg-travertine-50 px-3.5 py-2.5 text-xs text-ink-900 placeholder:text-ink-500 focus:border-itamaraty-gold-500 focus:outline-none dark:border-itamaraty-navy-800 dark:bg-itamaraty-navy-900 dark:text-travertine-50"
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-itamaraty-navy-600 px-4 py-2.5 text-xs font-bold text-travertine-50 transition disabled:opacity-40 dark:bg-itamaraty-gold-500 dark:text-itamaraty-navy-950"
            >
              <Send className="h-3.5 w-3.5" aria-hidden />
              Consultar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
