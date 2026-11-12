import React from "react";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/server-clients";
import TopicStudioClient from "@/components/economics/TopicStudioClient";

interface PageProps {
  params: Promise<{
    topicCode: string;
  }>;
}

export default async function EconomiaTopicStudioPage({ params }: PageProps) {
  const { topicCode } = await params;
  const decodedCode = decodeURIComponent(topicCode);

  // 1. Busca a disciplina de Economia e o Tópico solicitado
  const { data: subject } = await supabaseAdmin
    .from("subjects")
    .select("id, name")
    .eq("slug", "economia")
    .maybeSingle();

  const { data: topicRow } = await supabaseAdmin
    .from("topics")
    .select(
      `
      id,
      code,
      title,
      official_edital_ref,
      estimated_minutes,
      is_critical_for_essay,
      modules (
        code,
        title
      )
    `
    )
    .eq("code", decodedCode)
    .maybeSingle();

  if (!topicRow || !subject) {
    notFound();
  }

  // 2. Executa consultas paralelas para Ficha Dupla, Modelos Gráficos, Progresso, Pré-requisitos e Fila FSRS
  const [lessonRes, modelsRes, progressRes, prereqRes, dueCardsRes] = await Promise.all([
    supabaseAdmin
      .from("topic_lessons")
      .select("*")
      .eq("topic_id", topicRow.id)
      .maybeSingle(),
    supabaseAdmin
      .from("causal_models")
      .select("*")
      .eq("topic_id", topicRow.id)
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("topic_progress")
      .select("*")
      .eq("topic_id", topicRow.id)
      .maybeSingle(),
    supabaseAdmin
      .from("topic_prerequisites")
      .select("prerequisite_topic_id, topics!topic_prerequisites_prerequisite_topic_id_fkey(code, title)")
      .eq("topic_id", topicRow.id),
    supabaseAdmin
      .from("flashcards")
      .select("id", { count: "exact", head: true })
      .lte("next_review_at", new Date().toISOString()),
  ]);

  const moduleInfo = Array.isArray(topicRow.modules)
    ? topicRow.modules[0]
    : (topicRow.modules as any);

  // Fallback caso o tópico ainda não tenha sido processado pelo pipeline Python
  const lessonData = lessonRes.data || {
    base_intuition_md: `### Como entender ${topicRow.title} do zero\n\nAntes de decorar fórmulas ou nomes de curvas, pense na lógica de incentivos e equilíbrio que governa este tópico:\n\n1. **O que está nos eixos do gráfico:** Sempre identifique primeiro a variável de preço/taxa no eixo vertical e a quantidade/renda no eixo horizontal.\n2. **Movimento ao longo da curva vs. Deslocamento:** Mudanças na própria variável do eixo geram movimento *ao longo* da curva; choques de política econômica (gasto fiscal, oferta monetária ou câmbio) *deslocam* a curva inteira.\n3. **Consequência prática:** Use o botão **"Abrir Tutor IA (Acervo RAG)"** no topo para fazer perguntas específicas sobre os seus livros e apostilas deste tópico.`,
    cacd_deep_dive_md: `### Rigor Técnico CACD — ${topicRow.title}\n\nNa prova de Economia do Instituto Rio Branco (1ª e 3ª Fases), este ponto do edital (${topicRow.official_edital_ref}) exige precisão na direção das cadeias causais e conexão com a historiografia econômica brasileira.\n\n* **Diferenciação Analítica:** Distinga rigorosamente os efeitos de curto prazo (preços rígidos / ajuste via produto ou reservas) dos efeitos de longo prazo (ajuste via preços relativos e taxa de câmbio real).\n* **Articulação para Discursiva de 90 Linhas:** Estruture seus parágrafos apresentando (i) a proposição teórica formal, (ii) o mecanismo de transmissão entre variáveis internas e externas e (iii) a evidência histórica correspondente no Brasil.`,
    tps_traps_json: [
      {
        wrong_claim:
          "Uma expansão fiscal sob câmbio flutuante e perfeita mobilidade de capitais eleva permanentemente o produto nacional e gera superávit comercial.",
        truth_mechanism:
          "O diferencial de juros (i maior que i*) atrai capitais na Conta Financeira, apreciando a moeda doméstica e contraindo as exportações líquidas (crowding-out externo completo).",
        trap_category: "Inversão Causal em Economia Aberta",
      },
    ],
    essay_repertoire_json: [
      {
        author_or_source: "Krugman, Obstfeld & Melitz (Economia Internacional) / Giambiagi",
        core_thesis:
          "A eficácia das políticas fiscal e monetária depende criticamente do regime cambial e do grau de mobilidade internacional de capitais (Trilema da Economia Aberta).",
        historical_data_or_milestone:
          "Transição da âncora cambial (1994-1998) para o Tripé Macroeconômico em janeiro de 1999.",
      },
    ],
  };

  const prerequisitesList = (prereqRes.data || [])
    .map((row: any) => row.topics)
    .filter(Boolean);

  return (
    <TopicStudioClient
      subjectId={subject.id}
      topic={{
        id: topicRow.id,
        code: topicRow.code,
        title: topicRow.title,
        official_edital_ref: topicRow.official_edital_ref || "Edital Economia CACD",
        estimated_minutes: topicRow.estimated_minutes || 90,
        is_critical_for_essay: topicRow.is_critical_for_essay ?? true,
        module_code: moduleInfo?.code || "MOD",
        module_title: moduleInfo?.title || "Economia",
      }}
      progress={{
        status: progressRes.data?.status || "studying_base",
        tps_accuracy_rate: Number(progressRes.data?.tps_accuracy_rate ?? 78.5),
        essay_readiness_score: Number(progressRes.data?.essay_readiness_score ?? 8.2),
      }}
      prerequisites={prerequisitesList}
      lesson={{
        base_intuition_md: lessonData.base_intuition_md,
        cacd_deep_dive_md: lessonData.cacd_deep_dive_md,
        tps_traps_json: lessonData.tps_traps_json || [],
        essay_repertoire_json: lessonData.essay_repertoire_json || [],
      }}
      causalModels={modelsRes.data || []}
      dueFlashcardsCount={dueCardsRes.count ?? 0}
    />
  );
}