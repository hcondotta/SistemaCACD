import React from "react";
import { supabaseAdmin } from "@/lib/server-clients";
import EconomicsTrailClient, {
  ModuleTrailSection,
} from "@/components/economics/EconomicsTrailClient";
import type { MasteryStatus } from "@/components/ui/DiplomaticBadges";

export const dynamic = "force-dynamic";

const FALLBACK_MODULES: ModuleTrailSection[] = [
  {
    id: "mod-0",
    code: "MOD-0",
    title: "Fundação e Instrumental Econômico (Base Zero)",
    description:
      "Vocabulário econômico essencial, diferença entre variáveis reais e nominais, fluxo vs. estoque e leitura visual de deslocamentos de curvas.",
    pedagogical_order: 0,
    topics: [
      {
        id: "t-01",
        code: "0.1",
        official_edital_ref: "Fundamentos",
        title: "Escassez, Custo de Oportunidade e Fronteira de Produção (FPP)",
        pedagogical_order: 1,
        estimated_minutes: 60,
        is_critical_for_essay: false,
        status: "mastered",
        tps_accuracy_rate: 92,
        essay_readiness_score: 9.0,
        prerequisites: [],
        unlocksCodes: [],
      },
      {
        id: "t-02",
        code: "0.2",
        official_edital_ref: "Fundamentos",
        title: "Variáveis Reais vs. Nominais, Índices de Preços e Fluxo vs. Estoque",
        pedagogical_order: 2,
        estimated_minutes: 60,
        is_critical_for_essay: true,
        status: "mastered",
        tps_accuracy_rate: 88,
        essay_readiness_score: 8.8,
        prerequisites: [],
        unlocksCodes: ["3.2"],
      },
      {
        id: "t-03",
        code: "0.3",
        official_edital_ref: "Fundamentos",
        title: "Leitura de Gráficos: Movimento ao Longo da Curva vs. Deslocamento",
        pedagogical_order: 3,
        estimated_minutes: 60,
        is_critical_for_essay: false,
        status: "mastered",
        tps_accuracy_rate: 90,
        essay_readiness_score: 8.5,
        prerequisites: [],
        unlocksCodes: ["1.2"],
      },
    ],
  },
  {
    id: "mod-1",
    code: "MOD-1",
    title: "Microeconomia Aplicada",
    description:
      "Teoria do consumidor, elasticidades, incidência tributária, estruturas de mercado (concorrência, monopólio, oligopólio) e falhas de mercado.",
    pedagogical_order: 1,
    topics: [
      {
        id: "t-11",
        code: "1.1",
        official_edital_ref: "Ponto 1",
        title: "Teoria do Consumidor: Utilidade, Efeito Renda e Efeito Substituição",
        pedagogical_order: 4,
        estimated_minutes: 90,
        is_critical_for_essay: false,
        status: "reviewing",
        tps_accuracy_rate: 81,
        essay_readiness_score: 7.8,
        prerequisites: [],
        unlocksCodes: [],
      },
      {
        id: "t-12",
        code: "1.2",
        official_edital_ref: "Ponto 1",
        title: "Oferta, Demanda, Equilíbrio, Excedentes e Peso Morto de Impostos",
        pedagogical_order: 5,
        estimated_minutes: 90,
        is_critical_for_essay: false,
        status: "reviewing",
        tps_accuracy_rate: 84,
        essay_readiness_score: 8.0,
        prerequisites: [
          {
            code: "0.3",
            title: "Leitura de Gráficos: Movimento vs. Deslocamento",
            isMet: true,
          },
        ],
        unlocksCodes: [],
      },
      {
        id: "t-13",
        code: "1.3",
        official_edital_ref: "Ponto 1",
        title: "Elasticidades (Preço, Renda e Cruzada) e Incidência Tributária",
        pedagogical_order: 6,
        estimated_minutes: 90,
        is_critical_for_essay: true,
        status: "studying_advanced",
        tps_accuracy_rate: 76,
        essay_readiness_score: 7.5,
        prerequisites: [],
        unlocksCodes: [],
      },
      {
        id: "t-14",
        code: "1.4",
        official_edital_ref: "Ponto 1",
        title: "Função de Produção, Produtividade Marginal e Custos da Firma",
        pedagogical_order: 7,
        estimated_minutes: 90,
        is_critical_for_essay: false,
        status: "studying_base",
        tps_accuracy_rate: 72,
        essay_readiness_score: 7.0,
        prerequisites: [],
        unlocksCodes: [],
      },
      {
        id: "t-15",
        code: "1.5",
        official_edital_ref: "Ponto 1",
        title: "Estruturas de Mercado (Concorrência, Monopólio, Oligopólio) e Teoria dos Jogos",
        pedagogical_order: 8,
        estimated_minutes: 120,
        is_critical_for_essay: true,
        status: "studying_base",
        tps_accuracy_rate: 74,
        essay_readiness_score: 7.2,
        prerequisites: [],
        unlocksCodes: [],
      },
      {
        id: "t-16",
        code: "1.6",
        official_edital_ref: "Ponto 1",
        title: "Falhas de Mercado: Externalidades, Bens Públicos e Assimetria de Informação",
        pedagogical_order: 9,
        estimated_minutes: 90,
        is_critical_for_essay: true,
        status: "available",
        tps_accuracy_rate: 70,
        essay_readiness_score: 7.0,
        prerequisites: [],
        unlocksCodes: [],
      },
    ],
  },
  {
    id: "mod-2",
    code: "MOD-2",
    title: "Macroeconomia Fechada, Moeda e Crescimento",
    description:
      "Contabilidade nacional, criação de moeda, instrumentos do Banco Central, debate Clássico vs. Keynesiano, modelo IS-LM, Curva de Phillips e Solow.",
    pedagogical_order: 2,
    topics: [
      {
        id: "t-21",
        code: "2.1",
        official_edital_ref: "Ponto 2",
        title: "Contabilidade Nacional, Óticas do PIB e Identidades Macroeconômicas",
        pedagogical_order: 10,
        estimated_minutes: 90,
        is_critical_for_essay: true,
        status: "reviewing",
        tps_accuracy_rate: 82,
        essay_readiness_score: 8.1,
        prerequisites: [],
        unlocksCodes: [],
      },
      {
        id: "t-22",
        code: "2.2",
        official_edital_ref: "Ponto 3",
        title: "Moeda, Multiplicador Bancário e Instrumentos de Política Monetária",
        pedagogical_order: 11,
        estimated_minutes: 90,
        is_critical_for_essay: true,
        status: "reviewing",
        tps_accuracy_rate: 80,
        essay_readiness_score: 8.0,
        prerequisites: [],
        unlocksCodes: ["2.4"],
      },
      {
        id: "t-23",
        code: "2.3",
        official_edital_ref: "Ponto 2",
        title: "Modelo Clássico (Lei de Say e TQM) vs. Modelo Keynesiano e Multiplicador",
        pedagogical_order: 12,
        estimated_minutes: 120,
        is_critical_for_essay: true,
        status: "reviewing",
        tps_accuracy_rate: 85,
        essay_readiness_score: 8.4,
        prerequisites: [],
        unlocksCodes: ["2.4", "4.2"],
      },
      {
        id: "t-24",
        code: "2.4",
        official_edital_ref: "Ponto 2",
        title: "Modelo IS-LM em Economia Fechada: Crowding-Out e Armadilha da Liquidez",
        pedagogical_order: 13,
        estimated_minutes: 120,
        is_critical_for_essay: true,
        status: "studying_advanced",
        tps_accuracy_rate: 78,
        essay_readiness_score: 8.0,
        prerequisites: [
          { code: "2.2", title: "Moeda e Política Monetária", isMet: true },
          { code: "2.3", title: "Modelo Keynesiano e Multiplicador", isMet: true },
        ],
        unlocksCodes: ["3.3"],
      },
      {
        id: "t-25",
        code: "2.5",
        official_edital_ref: "Ponto 2",
        title: "Oferta e Demanda Agregada (OA-DA), Curva de Phillips e Expectativas",
        pedagogical_order: 14,
        estimated_minutes: 120,
        is_critical_for_essay: true,
        status: "studying_base",
        tps_accuracy_rate: 74,
        essay_readiness_score: 7.5,
        prerequisites: [],
        unlocksCodes: [],
      },
      {
        id: "t-26",
        code: "2.6",
        official_edital_ref: "Ponto 2",
        title: "Modelos de Crescimento (Solow e Endógeno), PTF e Desenvolvimento",
        pedagogical_order: 15,
        estimated_minutes: 90,
        is_critical_for_essay: true,
        status: "available",
        tps_accuracy_rate: 71,
        essay_readiness_score: 7.2,
        prerequisites: [],
        unlocksCodes: [],
      },
    ],
  },
  {
    id: "mod-3",
    code: "MOD-3",
    title: "Economia Internacional, Câmbio e Balanço de Pagamentos",
    description:
      "Estrutura do Balanço de Pagamentos (BPM6/FMI), regimes cambiais, Paridade de Juros, modelo Mundell-Fleming (IS-LM-BP) e teorias do comércio internacional.",
    pedagogical_order: 3,
    topics: [
      {
        id: "t-31",
        code: "3.1",
        official_edital_ref: "Ponto 4",
        title: "Balanço de Pagamentos (BPM6/FMI): Transações Correntes, Conta Financeira e Reservas",
        pedagogical_order: 16,
        estimated_minutes: 120,
        is_critical_for_essay: true,
        status: "studying_advanced",
        tps_accuracy_rate: 79,
        essay_readiness_score: 8.3,
        prerequisites: [],
        unlocksCodes: ["3.3", "4.5"],
      },
      {
        id: "t-32",
        code: "3.2",
        official_edital_ref: "Ponto 4",
        title: "Taxa de Câmbio Nominal e Real, PPC, Paridade de Juros (UIP) e Regimes Cambiais",
        pedagogical_order: 17,
        estimated_minutes: 120,
        is_critical_for_essay: true,
        status: "studying_advanced",
        tps_accuracy_rate: 77,
        essay_readiness_score: 8.1,
        prerequisites: [
          { code: "0.2", title: "Variáveis Reais vs. Nominais", isMet: true },
        ],
        unlocksCodes: ["3.3"],
      },
      {
        id: "t-33",
        code: "3.3",
        official_edital_ref: "Ponto 4",
        title: "Modelo Mundell-Fleming (IS-LM-BP) e a Trindade Impossível",
        pedagogical_order: 18,
        estimated_minutes: 150,
        is_critical_for_essay: true,
        status: "studying_base",
        tps_accuracy_rate: 75,
        essay_readiness_score: 8.4,
        prerequisites: [
          { code: "2.4", title: "Modelo IS-LM em Economia Fechada", isMet: true },
          { code: "3.1", title: "Balanço de Pagamentos (BPM6/FMI)", isMet: true },
          { code: "3.2", title: "Taxa de Câmbio Nominal e Real", isMet: true },
        ],
        unlocksCodes: ["4.7"],
      },
      {
        id: "t-34",
        code: "3.4",
        official_edital_ref: "Ponto 4",
        title: "Teorias do Comércio Internacional: Ricardo, Heckscher-Ohlin, Stolper-Samuelson e Krugman",
        pedagogical_order: 19,
        estimated_minutes: 120,
        is_critical_for_essay: true,
        status: "available",
        tps_accuracy_rate: 73,
        essay_readiness_score: 7.6,
        prerequisites: [],
        unlocksCodes: [],
      },
      {
        id: "t-35",
        code: "3.5",
        official_edital_ref: "Ponto 4",
        title: "Política Comercial (Tarifas, Cotas, Prebisch-Singer) e Sistema de Bretton Woods à OMC",
        pedagogical_order: 20,
        estimated_minutes: 120,
        is_critical_for_essay: true,
        status: "available",
        tps_accuracy_rate: 76,
        essay_readiness_score: 7.9,
        prerequisites: [],
        unlocksCodes: [],
      },
    ],
  },
  {
    id: "mod-4",
    code: "MOD-4",
    title: "História Econômica do Brasil e Economia Contemporânea",
    description:
      "Da economia cafeeira na Primeira República e Industrialização por Substituição de Importações (ISI) ao Plano Real, Tripé Macroeconômico e reformas do século XXI.",
    pedagogical_order: 4,
    topics: [
      {
        id: "t-41",
        code: "4.1",
        official_edital_ref: "Ponto 5",
        title: "Economia Cafeeira na Primeira República: Encilhamento, Murtinho e Convênio de Taubaté (1889-1930)",
        pedagogical_order: 21,
        estimated_minutes: 120,
        is_critical_for_essay: true,
        status: "available",
        tps_accuracy_rate: 80,
        essay_readiness_score: 8.2,
        prerequisites: [],
        unlocksCodes: [],
      },
      {
        id: "t-42",
        code: "4.2",
        official_edital_ref: "Ponto 5",
        title: "Crise de 1929, Defesa do Café (Furtado) e Industrialização na Era Vargas (1930-1945)",
        pedagogical_order: 22,
        estimated_minutes: 120,
        is_critical_for_essay: true,
        status: "available",
        tps_accuracy_rate: 82,
        essay_readiness_score: 8.5,
        prerequisites: [
          { code: "2.3", title: "Demanda Efetiva Keynesiana e Multiplicador", isMet: true },
        ],
        unlocksCodes: [],
      },
      {
        id: "t-43",
        code: "4.3",
        official_edital_ref: "Ponto 5",
        title: "Pós-Guerra (Dutra, 2º Vargas, Instrução 113 da SUMOC) e Plano de Metas de JK (1945-1961)",
        pedagogical_order: 23,
        estimated_minutes: 120,
        is_critical_for_essay: true,
        status: "available",
        tps_accuracy_rate: 78,
        essay_readiness_score: 8.0,
        prerequisites: [],
        unlocksCodes: [],
      },
      {
        id: "t-44",
        code: "4.4",
        official_edital_ref: "Ponto 5",
        title: "Crise dos Anos 1960, Reformas do PAEG e o Milagre Econômico (1962-1973)",
        pedagogical_order: 24,
        estimated_minutes: 120,
        is_critical_for_essay: true,
        status: "available",
        tps_accuracy_rate: 75,
        essay_readiness_score: 7.9,
        prerequisites: [],
        unlocksCodes: [],
      },
      {
        id: "t-45",
        code: "4.5",
        official_edital_ref: "Ponto 5",
        title: "Choques do Petróleo, II PND e a Crise da Dívida Externa nos Anos 1980 (1974-1985)",
        pedagogical_order: 25,
        estimated_minutes: 120,
        is_critical_for_essay: true,
        status: "available",
        tps_accuracy_rate: 74,
        essay_readiness_score: 8.0,
        prerequisites: [
          { code: "3.1", title: "Balanço de Pagamentos (BPM6/FMI)", isMet: true },
        ],
        unlocksCodes: [],
      },
      {
        id: "t-46",
        code: "4.6",
        official_edital_ref: "Ponto 6",
        title: "Teoria da Inflação Inercial e Planos Heterodoxos: Cruzado ao Collor II (1985-1993)",
        pedagogical_order: 26,
        estimated_minutes: 120,
        is_critical_for_essay: true,
        status: "available",
        tps_accuracy_rate: 79,
        essay_readiness_score: 8.3,
        prerequisites: [],
        unlocksCodes: [],
      },
      {
        id: "t-47",
        code: "4.7",
        official_edital_ref: "Ponto 6",
        title: "Plano Real (PAI, URV, Âncora Cambial), Crises Externas e Mudança Cambial de 1999 (1994-1999)",
        pedagogical_order: 27,
        estimated_minutes: 150,
        is_critical_for_essay: true,
        status: "studying_base",
        tps_accuracy_rate: 81,
        essay_readiness_score: 8.7,
        prerequisites: [
          { code: "3.3", title: "Modelo Mundell-Fleming (IS-LM-BP)", isMet: false },
        ],
        unlocksCodes: [],
      },
      {
        id: "t-48",
        code: "4.8",
        official_edital_ref: "Ponto 6",
        title: "Economia Brasileira no Século XXI: Tripé Macroeconômico, Fiscal, Reforma Tributária e Comércio",
        pedagogical_order: 28,
        estimated_minutes: 120,
        is_critical_for_essay: true,
        status: "available",
        tps_accuracy_rate: 77,
        essay_readiness_score: 8.1,
        prerequisites: [],
        unlocksCodes: [],
      },
    ],
  },
];

export default async function EconomiaTrailPage() {
  try {
    const { data: subject } = await supabaseAdmin
      .from("subjects")
      .select("id")
      .eq("slug", "economia")
      .maybeSingle();

    if (!subject) {
      return (
        <EconomicsTrailClient modules={FALLBACK_MODULES} dueFlashcardsCount={14} />
      );
    }

    const [modulesRes, topicsRes, prereqRes, progressRes, dueCardsRes] =
      await Promise.all([
        supabaseAdmin
          .from("modules")
          .select("*")
          .eq("subject_id", subject.id)
          .order("pedagogical_order", { ascending: true }),
        supabaseAdmin
          .from("topics")
          .select("*")
          .order("pedagogical_order", { ascending: true }),
        supabaseAdmin.from("topic_prerequisites").select("*"),
        supabaseAdmin.from("topic_progress").select("*"),
        supabaseAdmin
          .from("flashcards")
          .select("id", { count: "exact", head: true })
          .lte("next_review_at", new Date().toISOString()),
      ]);

    if (!modulesRes.data?.length || !topicsRes.data?.length) {
      return (
        <EconomicsTrailClient
          modules={FALLBACK_MODULES}
          dueFlashcardsCount={dueCardsRes.count ?? 14}
        />
      );
    }

    const topicById = new Map<string, any>();
    for (const t of topicsRes.data) {
      topicById.set(t.id, t);
    }

    const progressByTopicId = new Map<string, any>();
    for (const p of progressRes.data || []) {
      progressByTopicId.set(p.topic_id, p);
    }

    // Mapeia pré-requisitos e dependentes (unlocks)
    const prereqsByTopicId = new Map<string, string[]>();
    const unlocksByTopicId = new Map<string, string[]>();

    for (const edge of prereqRes.data || []) {
      const currentList = prereqsByTopicId.get(edge.topic_id) || [];
      currentList.push(edge.prerequisite_topic_id);
      prereqsByTopicId.set(edge.topic_id, currentList);

      const unlockList = unlocksByTopicId.get(edge.prerequisite_topic_id) || [];
      const targetTopic = topicById.get(edge.topic_id);
      if (targetTopic) unlockList.push(targetTopic.code);
      unlocksByTopicId.set(edge.prerequisite_topic_id, unlockList);
    }

    const structuredModules: ModuleTrailSection[] = modulesRes.data.map((m: any) => {
      const modTopics = topicsRes.data
        .filter((t: any) => t.module_id === m.id)
        .map((t: any) => {
          const prog = progressByTopicId.get(t.id);
          const status: MasteryStatus = prog?.status || "available";
          const prereqIds = prereqsByTopicId.get(t.id) || [];

          const prerequisites = prereqIds
            .map((pid) => {
              const preTopic = topicById.get(pid);
              if (!preTopic) return null;
              const preProg = progressByTopicId.get(pid);
              const preStatus: MasteryStatus = preProg?.status || "available";
              const isMet =
                preStatus === "studying_advanced" ||
                preStatus === "reviewing" ||
                preStatus === "mastered";
              return {
                code: preTopic.code,
                title: preTopic.title,
                isMet,
              };
            })
            .filter(Boolean) as Array<{ code: string; title: string; isMet: boolean }>;

          return {
            id: t.id,
            code: t.code,
            official_edital_ref: t.official_edital_ref || "Edital Economia",
            title: t.title,
            pedagogical_order: t.pedagogical_order,
            estimated_minutes: t.estimated_minutes || 90,
            is_critical_for_essay: t.is_critical_for_essay ?? true,
            status,
            tps_accuracy_rate: Number(prog?.tps_accuracy_rate ?? 76.0),
            essay_readiness_score: Number(prog?.essay_readiness_score ?? 8.0),
            prerequisites,
            unlocksCodes: unlocksByTopicId.get(t.id) || [],
          };
        });

      return {
        id: m.id,
        code: m.code,
        title: m.title,
        description: m.description || "",
        pedagogical_order: m.pedagogical_order,
        topics: modTopics,
      };
    });

    return (
      <EconomicsTrailClient
        modules={structuredModules}
        dueFlashcardsCount={dueCardsRes.count ?? 14}
      />
    );
  } catch {
    return (
      <EconomicsTrailClient modules={FALLBACK_MODULES} dueFlashcardsCount={14} />
    );
  }
}