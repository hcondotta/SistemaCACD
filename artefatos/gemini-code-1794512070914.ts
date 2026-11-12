"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  X,
  Send,
  Sparkles,
  BookOpenCheck,
  GitCommitHorizontal,
  ShieldCheck,
  Layers,
  Loader2,
  Lightbulb,
} from "lucide-react";
import type { TutorResponse } from "@/lib/ai-contracts";

interface TutorRAGDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId: string;
  topicId: string;
  topicCode: string;
  topicTitle: string;
  learningLayer: "base" | "cacd";
}

interface ChatEntry {
  id: string;
  question: string;
  layerUsed: "base" | "cacd";
  response: TutorResponse;
  rawChunksCount: number;
  timestamp: string;
}

const QUICK_PROMPTS = [
  "Me explique a intuição desse tópico do zero, sem economês pesado.",
  "Qual é a cadeia causal passo a passo e o que desloca a curva no gráfico?",
  "Como isso afeta as contas do Balanço de Pagamentos (BPM6)?",
  "Quais são as pegadinhas clássicas do Cebraspe/IADES nesse ponto?",
  "Como conectar essa teoria com a História Econômica do Brasil na 3ª Fase?",
];

export default function TutorRAGDrawer({
  isOpen,
  onClose,
  subjectId,
  topicId,
  topicCode,
  topicTitle,
  learningLayer,
}: TutorRAGDrawerProps) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [savedFlashcardIds, setSavedFlashcardIds] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  async function handleAsk(promptText?: string) {
    const queryToSend = (promptText ?? question).trim();
    if (!queryToSend || loading) return;

    setLoading(true);
    setErrorMsg(null);
    if (!promptText) setQuestion("");

    try {
      const res = await fetch("/api/tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: queryToSend,
          subjectId,
          topicId,
          learningLayer,
        }),
      });

      const payload = await res.json();
      if (!res.ok || payload.error) {
        throw new Error(payload.error || "Falha ao consultar o acervo RAG.");
      }

      const newEntry: ChatEntry = {
        id: crypto.randomUUID(),
        question: queryToSend,
        layerUsed: learningLayer,
        response: payload.data,
        rawChunksCount: payload.rawChunksCount ?? 0,
        timestamp: new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setHistory((prev) => [newEntry, ...prev]);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro inesperado na consulta ao Tutor RAG.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-itamaraty-navy-950/60 backdrop-blur-sm transition-opacity">
      <div className="relative flex h-full w-full max-w-xl flex-col border-l border-travertine-200 dark:border-itamaraty-navy-800 bg-travertine-50 dark:bg-itamaraty-navy-900 text-ink-900 dark:text-travertine-100 shadow-diplomatic">
        {/* Cabeçalho da Gaveta */}
        <div className="flex items-center justify-between border-b border-travertine-200 dark:border-itamaraty-navy-800 bg-travertine-100 dark:bg-itamaraty-navy-950 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400">
                Tutor RAG Estrito • Zero Alucinação
              </span>
            </div>
            <h3 className="mt-0.5 font-serif text-base font-bold text-ink-900 dark:text-white">
              Tópico {topicCode}: {topicTitle}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-ink-500 hover:bg-travertine-200 dark:text-travertine-300 dark:hover:bg-itamaraty-navy-800 transition"
            aria-label="Fechar gaveta do Tutor"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Faixa de Contexto da Camada Ativa */}
        <div className="flex items-center justify-between border-b border-travertine-200 dark:border-itamaraty-navy-800 bg-travertine-100/50 dark:bg-itamaraty-navy-900 px-5 py-2 text-xs">
          <span className="text-ink-500 dark:text-travertine-300">
            Modo de explicação ativo:
          </span>
          <span className="rounded-md bg-itamaraty-navy-700 dark:bg-itamaraty-gold-500 px-2.5 py-0.5 font-bold text-white dark:text-itamaraty-navy-950">
            {learningLayer === "base" ? "1. Intuição Base Zero" : "2. Rigor CACD (3ª Fase)"}
          </span>
        </div>

        {/* Corpo Principal: Sugestões Rápidas + Histórico de Respostas */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Chips de Perguntas Guiadas */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500 dark:text-travertine-300">
              Perguntas Rápidas sobre este Tópico
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={loading}
                  onClick={() => handleAsk(q)}
                  className="rounded-lg border border-travertine-200 dark:border-itamaraty-navy-700 bg-travertine-100 dark:bg-itamaraty-navy-950 px-2.5 py-1.5 text-left text-xs text-ink-700 dark:text-travertine-200 hover:border-itamaraty-gold-500 transition disabled:opacity-40"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-3 rounded-xl border border-itamaraty-gold-500/40 bg-travertine-100 dark:bg-itamaraty-navy-950 p-4 text-xs">
              <Loader2 className="h-4 w-4 animate-spin text-itamaraty-gold-600 dark:text-itamaraty-gold-400" />
              <span>
                Consultando blocos vetoriais (`hybrid_search_chunks`) nos livros, aulas e notas...
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-xl border border-itamaraty-carmine-500 bg-itamaraty-carmine-900/20 p-4 text-xs text-itamaraty-carmine-500">
              {errorMsg}
            </div>
          )}

          {/* Lista de Consultas Realizadas */}
          {history.length === 0 && !loading ? (
            <div className="rounded-2xl border border-dashed border-travertine-300 dark:border-itamaraty-navy-800 p-6 text-center space-y-2">
              <Sparkles className="mx-auto h-6 w-6 text-itamaraty-gold-500" />
              <p className="font-serif text-sm font-semibold text-ink-900 dark:text-white">
                Tire dúvidas ancoradas exclusivamente no seu acervo
              </p>
              <p className="text-xs text-ink-500 dark:text-travertine-300 leading-relaxed">
                O Tutor busca nos capítulos de Furtado, Abreu, Giambiagi, Krugman, Blanchard e nas
                transcrições das aulas para explicar cada gráfico ou conceito sem inventar dados.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-travertine-200 dark:border-itamaraty-navy-800 bg-travertine-100/70 dark:bg-itamaraty-navy-950 p-4 space-y-4 shadow-parchment"
                >
                  {/* Cabeçalho da Pergunta */}
                  <div className="flex items-start justify-between gap-2 border-b border-travertine-200 dark:border-itamaraty-navy-800 pb-3">
                    <p className="font-serif text-sm font-bold text-ink-900 dark:text-white">
                      &ldquo;{entry.question}&rdquo;
                    </p>
                    <span className="shrink-0 font-mono text-[10px] text-ink-500 dark:text-travertine-300">
                      {entry.timestamp} • {entry.rawChunksCount} fontes
                    </span>
                  </div>

                  {/* Analogia Base Zero (quando presente) */}
                  {entry.response.base_analogy && (
                    <div className="rounded-xl border border-itamaraty-gold-500/40 bg-itamaraty-gold-500/10 p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-itamaraty-gold-600 dark:text-itamaraty-gold-400">
                        <Lightbulb className="h-3.5 w-3.5" />
                        <span>Intuição Visual / Analogia Base Zero</span>
                      </div>
                      <p className="text-xs leading-relaxed text-ink-900 dark:text-travertine-100">
                        {entry.response.base_analogy}
                      </p>
                    </div>
                  )}

                  {/* Resposta Principal em Markdown */}
                  <div className="prose prose-sm dark:prose-invert max-w-none font-serif text-xs leading-relaxed text-ink-900 dark:text-travertine-100">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {entry.response.direct_answer_md}
                    </ReactMarkdown>
                  </div>

                  {/* Cadeia Causal Passo a Passo */}
                  {entry.response.causal_chain_summary?.length > 0 && (
                    <div className="rounded-xl border border-travertine-200 dark:border-itamaraty-navy-800 bg-travertine-50 dark:bg-itamaraty-navy-900 p-3 space-y-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400">
                        <GitCommitHorizontal className="h-3.5 w-3.5" />
                        <span>Cadeia de Transmissão Econômica</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        {entry.response.causal_chain_summary.map((step, i) => (
                          <React.Fragment key={i}>
                            <span className="rounded-md bg-travertine-100 dark:bg-itamaraty-navy-950 border border-travertine-200 dark:border-itamaraty-navy-800 px-2 py-1 font-medium text-ink-900 dark:text-travertine-100">
                              {step}
                            </span>
                            {i < entry.response.causal_chain_summary.length - 1 && (
                              <span className="font-bold text-itamaraty-gold-600 dark:text-itamaraty-gold-400">
                                →
                              </span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fontes Recuperadas do Acervo */}
                  {entry.response.citations_used?.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-travertine-200 dark:border-itamaraty-navy-800">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-500 dark:text-travertine-300">
                        <BookOpenCheck className="h-3.5 w-3.5" />
                        <span>Fontes do Acervo Utilizadas</span>
                      </div>
                      <div className="space-y-1">
                        {entry.response.citations_used.map((cit, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg bg-travertine-50 dark:bg-itamaraty-navy-900 px-2.5 py-1.5 text-[11px]"
                          >
                            <strong className="text-itamaraty-navy-700 dark:text-itamaraty-gold-400">
                              [{cit.citation_label}]
                            </strong>{" "}
                            <span className="text-ink-700 dark:text-travertine-200">
                              {cit.exact_quote_or_concept}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Flashcard Sugerido da Dúvida */}
                  {entry.response.suggested_flashcard && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-itamaraty-emerald-700/40 bg-itamaraty-emerald-950/20 px-3 py-2">
                      <div className="text-[11px]">
                        <span className="font-bold text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400">
                          Flashcard FSRS sugerido:{" "}
                        </span>
                        <span className="text-ink-700 dark:text-travertine-200">
                          {entry.response.suggested_flashcard.front_prompt}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSavedFlashcardIds((prev) => ({ ...prev, [entry.id]: true }))
                        }
                        disabled={savedFlashcardIds[entry.id]}
                        className="shrink-0 rounded-lg bg-itamaraty-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-50"
                      >
                        {savedFlashcardIds[entry.id] ? "Salvo no Deck" : "+ Fila FSRS"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rodapé com Input de Pergunta */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="border-t border-travertine-200 dark:border-itamaraty-navy-800 bg-travertine-100 dark:bg-itamaraty-navy-950 p-4"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Pergunte sobre uma curva, equação, autor ou plano econômico..."
              className="flex-1 rounded-xl border border-travertine-200 dark:border-itamaraty-navy-800 bg-travertine-50 dark:bg-itamaraty-navy-900 px-3.5 py-2.5 text-xs text-ink-900 dark:text-white placeholder:text-ink-500 focus:border-itamaraty-gold-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-itamaraty-navy-600 dark:bg-itamaraty-gold-500 px-4 py-2.5 text-xs font-bold text-white dark:text-itamaraty-navy-950 disabled:opacity-40 transition"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Consultar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}