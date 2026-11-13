"use client";

import { useState, useTransition } from "react";
import { assignSectionTopic } from "@/lib/actions/acervo-actions";

export interface TopicOption {
  id: string;
  code: string;
  title: string;
}

/** Liga uma seção a um tópico da trilha. Só diz "salvo" depois que o banco confirmou. */
export function TopicAssignSelect({
  sectionId,
  sectionTitle,
  topics,
  initialTopicId,
}: {
  sectionId: string;
  sectionTitle: string;
  topics: TopicOption[];
  initialTopicId: string | null;
}) {
  const [topicId, setTopicId] = useState(initialTopicId ?? "");
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [isSaving, startSaving] = useTransition();

  function onChange(value: string) {
    const previous = topicId;
    setTopicId(value);
    setStatus(null);
    startSaving(async () => {
      const result = await assignSectionTopic({ sectionId, topicId: value || null });
      if (result.ok) {
        setStatus({ tone: "ok", text: "Salvo" });
      } else {
        setTopicId(previous);
        setStatus({ tone: "error", text: result.error });
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor={`topico-${sectionId}`}>
        Tópico da seção {sectionTitle}
      </label>
      <select
        id={`topico-${sectionId}`}
        value={topicId}
        disabled={isSaving}
        onChange={(event) => onChange(event.target.value)}
        className="w-56 max-w-full rounded-lg border border-travertine-300 bg-travertine-50 px-2 py-1.5 text-xs text-ink-900 outline-none transition focus:border-itamaraty-gold-500 focus:ring-2 focus:ring-itamaraty-gold-500/40 disabled:opacity-60 dark:border-itamaraty-navy-700 dark:bg-itamaraty-navy-950 dark:text-travertine-50"
      >
        <option value="">Sem tópico</option>
        {topics.map((topic) => (
          <option key={topic.id} value={topic.id}>
            {topic.code} · {topic.title}
          </option>
        ))}
      </select>
      <span
        role={status?.tone === "error" ? "alert" : "status"}
        className={`w-24 shrink-0 text-[11px] font-semibold ${
          status?.tone === "error"
            ? "text-itamaraty-carmine-700 dark:text-itamaraty-carmine-500"
            : "text-itamaraty-emerald-700 dark:text-itamaraty-emerald-400"
        }`}
      >
        {isSaving ? "Salvando…" : (status?.text ?? "")}
      </span>
    </div>
  );
}
