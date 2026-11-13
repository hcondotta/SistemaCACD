import { cache } from "react";
import {
  buildSnippet,
  DOC_TYPE_ORDER,
  formatLocator,
  questionNumberFromSectionTitle,
  resolveAssetLinks,
  stripContextHeader,
  summaryEntries,
  type AssetLink,
  type DocType,
  type SnippetPart,
} from "@/lib/acervo";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/server-clients";

/**
 * Loaders do Acervo. Mesmas regras de `study-data.ts`: nada inventado, erro completo no log e
 * estado explícito para a página. "missing_migration" avisa que a migração do acervo
 * (20261114000000_acervo_sem_ia.sql) ainda não foi aplicada no banco.
 */

export type AcervoState = "unconfigured" | "missing_migration" | "error";

const SUBJECT_SLUG = "economia";
const PAGE_SIZE = 1000; // limite padrão de linhas por resposta do PostgREST
const SIGNED_URL_SECONDS = 60 * 60;
const SECTION_LIGHT_COLUMNS =
  "id, source_document_id, position, level, title, heading_path, page_start, page_end, start_seconds, end_seconds, topic_id";

interface DbError {
  code?: string;
  message?: string;
}

class AcervoQueryError extends Error {
  constructor(
    readonly scope: string,
    readonly cause: DbError,
  ) {
    super(`${scope}: ${cause.message ?? cause.code ?? "erro desconhecido"}`);
  }
}

function isMissingMigration(error: unknown): boolean {
  const cause = error instanceof AcervoQueryError ? error.cause : (error as DbError | null);
  const text = `${cause?.code ?? ""} ${cause?.message ?? ""}`;
  return /PGRST205|42P01|document_sections|document_assets|search_acervo|PGRST202/.test(text);
}

function failure(scope: string, error: unknown): { state: AcervoState } {
  if (isMissingMigration(error)) return { state: "missing_migration" };
  console.error(`[acervo-data:${scope}]`, error);
  return { state: "error" };
}

/** O cliente sem tipos gerados descreve relação embutida como lista; o formato real vem do select. */
function unwrap<T>(scope: string, result: { data: unknown; error: DbError | null }): T {
  if (result.error) throw new AcervoQueryError(scope, result.error);
  return (result.data ?? ([] as unknown)) as T;
}

/** Busca todas as linhas, de mil em mil: o PostgREST corta a resposta em silêncio. */
async function fetchAll<T>(scope: string, page: (from: number, to: number) => PromiseLike<{ data: unknown; error: DbError | null }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const batch = unwrap<T[]>(scope, await page(from, from + PAGE_SIZE - 1));
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
}

interface SectionRow {
  id: string;
  source_document_id: string;
  position: number;
  level: number;
  title: string;
  heading_path: string[] | null;
  page_start: number | null;
  page_end: number | null;
  start_seconds: number | null;
  end_seconds: number | null;
  topic_id: string | null;
}

interface DocumentRow {
  id: string;
  title: string;
  author: string | null;
  doc_type: DocType;
  processed_at: string | null;
  file_path: string | null;
  metadata: Record<string, unknown> | null;
}

export interface TopicRef {
  id: string;
  code: string;
  title: string;
}

async function loadSubjectAndTopics(): Promise<{ subject: { id: string; name: string }; topics: Map<string, TopicRef> }> {
  const supabase = getSupabaseAdmin();
  const subjects = unwrap<Array<{ id: string; name: string }>>(
    "subject",
    await supabase.from("subjects").select("id, name").eq("slug", SUBJECT_SLUG).limit(1),
  );
  if (subjects.length === 0) throw new AcervoQueryError("subject", { message: "disciplina não semeada" });
  const topicRows = unwrap<Array<{ id: string; code: string; title: string }>>(
    "topics",
    await supabase.from("topics").select("id, code, title, modules!inner(subject_id)").eq("modules.subject_id", subjects[0].id),
  );
  return { subject: subjects[0], topics: new Map(topicRows.map((row) => [row.id, { id: row.id, code: row.code, title: row.title }])) };
}

function locatorOf(section: Pick<SectionRow, "page_start" | "page_end" | "start_seconds" | "end_seconds">) {
  return formatLocator({
    pageStart: section.page_start,
    pageEnd: section.page_end,
    startSeconds: section.start_seconds === null ? null : Number(section.start_seconds),
    endSeconds: section.end_seconds === null ? null : Number(section.end_seconds),
  });
}

function numberFrom(metadata: Record<string, unknown> | null, key: string): number | null {
  const value = metadata?.[key];
  return typeof value === "number" ? value : null;
}

// ---------------------------------------------------------------------------
// Índice do acervo
// ---------------------------------------------------------------------------

export interface IndexEntry {
  position: number;
  level: number;
  title: string;
  locator: string | null;
  topicCode: string | null;
}

export interface AcervoDocument {
  id: string;
  title: string;
  author: string | null;
  docType: DocType;
  pages: number | null;
  durationSeconds: number | null;
  figures: number;
  examItems: number | null;
  sectionCount: number;
  entries: IndexEntry[];
  hiddenEntries: number;
}

export type AcervoIndexResult =
  | { state: AcervoState }
  | {
      state: "ok";
      documents: AcervoDocument[];
      counts: Record<DocType, number>;
      totalSections: number;
      pendingDocuments: number;
    };

const INDEX_ENTRY_LIMIT = 14;

export const loadAcervoIndex = cache(async (): Promise<AcervoIndexResult> => {
  if (!isSupabaseConfigured()) return { state: "unconfigured" };
  try {
    const supabase = getSupabaseAdmin();
    const { subject, topics } = await loadSubjectAndTopics();
    const documents = unwrap<DocumentRow[]>(
      "documents",
      await supabase
        .from("source_documents")
        .select("id, title, author, doc_type, processed_at, file_path, metadata")
        .eq("subject_id", subject.id)
        .order("title"),
    );
    const ready = documents.filter((document) => document.processed_at);
    let sections: SectionRow[] = [];
    if (ready.length > 0) {
      sections = await fetchAll<SectionRow>("sections", (from, to) =>
        supabase
          .from("document_sections")
          .select(SECTION_LIGHT_COLUMNS)
          .in(
            "source_document_id",
            ready.map((document) => document.id),
          )
          .order("source_document_id")
          .order("position")
          .range(from, to),
      );
    } else {
      // Acervo vazio: a consulta só confirma que a migração já foi aplicada.
      unwrap("sections", await supabase.from("document_sections").select("id").limit(1));
    }

    const byDocument = new Map<string, SectionRow[]>();
    for (const section of sections) {
      byDocument.set(section.source_document_id, [...(byDocument.get(section.source_document_id) ?? []), section]);
    }
    const counts = Object.fromEntries(DOC_TYPE_ORDER.map((type) => [type, 0])) as Record<DocType, number>;
    const shaped: AcervoDocument[] = ready.map((document) => {
      counts[document.doc_type] += 1;
      const documentSections = byDocument.get(document.id) ?? [];
      const { entries, hidden } = summaryEntries(documentSections, INDEX_ENTRY_LIMIT);
      const exam = document.metadata?.exam as { items?: number } | undefined;
      return {
        id: document.id,
        title: document.title,
        author: document.author,
        docType: document.doc_type,
        pages: numberFrom(document.metadata, "pages"),
        durationSeconds: numberFrom(document.metadata, "duration_seconds"),
        figures: numberFrom(document.metadata, "asset_count") ?? 0,
        examItems: typeof exam?.items === "number" ? exam.items : null,
        sectionCount: documentSections.length,
        entries: entries.map((section) => ({
          position: section.position,
          level: section.level,
          title: section.title,
          locator: locatorOf(section),
          topicCode: section.topic_id ? (topics.get(section.topic_id)?.code ?? null) : null,
        })),
        hiddenEntries: hidden,
      };
    });
    shaped.sort((a, b) => DOC_TYPE_ORDER.indexOf(a.docType) - DOC_TYPE_ORDER.indexOf(b.docType));
    return {
      state: "ok",
      documents: shaped,
      counts,
      totalSections: sections.length,
      pendingDocuments: documents.length - ready.length,
    };
  } catch (error) {
    return failure("index", error);
  }
});

// ---------------------------------------------------------------------------
// Leitor
// ---------------------------------------------------------------------------

export interface ReaderSection {
  id: string;
  position: number;
  level: number;
  title: string;
  headingPath: string[];
  locator: string | null;
  topic: TopicRef | null;
}

export interface ExamItemView {
  number: number;
  statement: string;
  answer: "C" | "E";
}

export interface ReaderData {
  document: { id: string; title: string; author: string | null; docType: DocType; pages: number | null };
  sections: ReaderSection[];
  current: ReaderSection & { contentMd: string };
  previous: ReaderSection | null;
  next: ReaderSection | null;
  examItems: ExamItemView[] | null;
}

export type ReaderResult = { state: AcervoState } | { state: "not_found" } | { state: "ok"; data: ReaderData };

function readerSection(section: SectionRow, topics: Map<string, TopicRef>): ReaderSection {
  return {
    id: section.id,
    position: section.position,
    level: section.level,
    title: section.title,
    headingPath: section.heading_path ?? [],
    locator: locatorOf(section),
    topic: section.topic_id ? (topics.get(section.topic_id) ?? null) : null,
  };
}

/** URLs assinadas das imagens de uma seção, pela chave que o texto usa (fig-0001, slide-0003). */
async function signedAssetUrls(sectionId: string): Promise<Record<string, AssetLink>> {
  const supabase = getSupabaseAdmin();
  const assets = unwrap<Array<{ storage_path: string; width: number | null; height: number | null }>>(
    "assets",
    await supabase.from("document_assets").select("storage_path, width, height").eq("section_id", sectionId),
  );
  if (assets.length === 0) return {};
  const sizes = new Map(assets.map((asset) => [asset.storage_path, asset]));
  const { data, error } = await supabase.storage
    .from("acervo")
    .createSignedUrls(
      assets.map((asset) => asset.storage_path),
      SIGNED_URL_SECONDS,
    );
  if (error) throw new AcervoQueryError("signed-urls", error);
  const urls: Record<string, AssetLink> = {};
  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) {
      const key = entry.path.split("/").pop()?.replace(/\.[a-z0-9]+$/i, "");
      const size = sizes.get(entry.path);
      if (key) urls[key] = { url: entry.signedUrl, width: size?.width ?? null, height: size?.height ?? null };
    }
  }
  return urls;
}

export const loadDocumentReader = cache(async (documentId: string, position: number): Promise<ReaderResult> => {
  if (!isSupabaseConfigured()) return { state: "unconfigured" };
  try {
    const supabase = getSupabaseAdmin();
    const documents = unwrap<DocumentRow[]>(
      "reader-document",
      await supabase
        .from("source_documents")
        .select("id, title, author, doc_type, processed_at, file_path, metadata")
        .eq("id", documentId)
        .limit(1),
    );
    if (documents.length === 0 || !documents[0].processed_at) return { state: "not_found" };
    const document = documents[0];
    const { topics } = await loadSubjectAndTopics();
    const sectionRows = await fetchAll<SectionRow>("reader-sections", (from, to) =>
      supabase
        .from("document_sections")
        .select(SECTION_LIGHT_COLUMNS)
        .eq("source_document_id", documentId)
        .order("position")
        .range(from, to),
    );
    const index = sectionRows.findIndex((section) => section.position === position);
    if (index === -1) return { state: "not_found" };

    const contents = unwrap<Array<{ content_md: string }>>(
      "reader-content",
      await supabase.from("document_sections").select("content_md").eq("id", sectionRows[index].id).limit(1),
    );
    const urls = await signedAssetUrls(sectionRows[index].id);
    const sections = sectionRows.map((section) => readerSection(section, topics));

    let examItems: ExamItemView[] | null = null;
    const questionNumber = questionNumberFromSectionTitle(sectionRows[index].title);
    if (document.doc_type === "past_exam" && questionNumber !== null) {
      const stems = unwrap<Array<{ id: string }>>(
        "reader-stem",
        await supabase
          .from("tps_question_stems")
          .select("id")
          .eq("source_document_id", documentId)
          .eq("question_number", questionNumber)
          .limit(1),
      );
      if (stems.length > 0) {
        const items = unwrap<Array<{ item_number: number; statement: string; official_answer: "C" | "E" }>>(
          "reader-items",
          await supabase
            .from("tps_items")
            .select("item_number, statement, official_answer")
            .eq("stem_id", stems[0].id)
            .order("item_number"),
        );
        examItems = items.map((item) => ({ number: item.item_number, statement: item.statement, answer: item.official_answer }));
      }
    }

    return {
      state: "ok",
      data: {
        document: {
          id: document.id,
          title: document.title,
          author: document.author,
          docType: document.doc_type,
          pages: numberFrom(document.metadata, "pages"),
        },
        sections,
        current: { ...sections[index], contentMd: resolveAssetLinks(contents[0]?.content_md ?? "", urls) },
        previous: index > 0 ? sections[index - 1] : null,
        next: index < sections.length - 1 ? sections[index + 1] : null,
        examItems,
      },
    };
  } catch (error) {
    return failure("reader", error);
  }
});

// ---------------------------------------------------------------------------
// Busca por palavras
// ---------------------------------------------------------------------------

export interface SearchHit {
  chunkId: string;
  documentId: string;
  docTitle: string;
  docType: DocType;
  citationLabel: string;
  topicCode: string | null;
  sectionPosition: number | null;
  snippet: SnippetPart[];
}

export type SearchResult = { state: AcervoState } | { state: "ok"; hits: SearchHit[] };

export const searchAcervo = cache(async (query: string, docType: DocType | null): Promise<SearchResult> => {
  if (!isSupabaseConfigured()) return { state: "unconfigured" };
  try {
    const supabase = getSupabaseAdmin();
    const { subject, topics } = await loadSubjectAndTopics();
    const rows = unwrap<
      Array<{
        chunk_id: string;
        source_document_id: string;
        doc_title: string;
        doc_type: DocType;
        citation_label: string;
        topic_id: string | null;
        content: string;
        metadata: Record<string, unknown> | null;
      }>
    >(
      "search",
      await supabase.rpc("search_acervo", {
        query_text: query,
        filter_subject_id: subject.id,
        filter_topic_id: null,
        filter_doc_type: docType,
        match_count: 40,
      }),
    );
    return {
      state: "ok",
      hits: rows.map((row) => ({
        chunkId: row.chunk_id,
        documentId: row.source_document_id,
        docTitle: row.doc_title,
        docType: row.doc_type,
        citationLabel: row.citation_label,
        topicCode: row.topic_id ? (topics.get(row.topic_id)?.code ?? null) : null,
        sectionPosition: numberFrom(row.metadata, "section_position"),
        snippet: buildSnippet(row.content, query),
      })),
    };
  } catch (error) {
    return failure("search", error);
  }
});

// ---------------------------------------------------------------------------
// Material do tópico (aba do estúdio)
// ---------------------------------------------------------------------------

export interface TopicReading {
  documentId: string;
  docTitle: string;
  docType: DocType;
  position: number;
  title: string;
  locator: string | null;
  excerpt: string;
}

export interface TopicQuestion {
  documentId: string;
  docTitle: string;
  sectionPosition: number | null;
  year: number | null;
  number: number;
  text: string;
  items: ExamItemView[];
}

export type TopicAcervoResult =
  | { state: AcervoState }
  | { state: "ok"; readings: TopicReading[]; questions: TopicQuestion[] };

function plainExcerpt(markdown: string, length = 220): string {
  const plain = stripContextHeader(markdown)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[#*_`>|-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= length) return plain;
  const cut = plain.lastIndexOf(" ", length);
  return `${plain.slice(0, cut > 0 ? cut : length)}…`;
}

export const loadTopicAcervo = cache(async (topicId: string): Promise<TopicAcervoResult> => {
  if (!isSupabaseConfigured()) return { state: "unconfigured" };
  try {
    const supabase = getSupabaseAdmin();
    const sectionRows = unwrap<
      Array<{
        source_document_id: string;
        position: number;
        title: string;
        content_md: string;
        page_start: number | null;
        page_end: number | null;
        start_seconds: number | null;
        end_seconds: number | null;
        source_documents: { title: string; doc_type: DocType };
      }>
    >(
      "topic-sections",
      await supabase
        .from("document_sections")
        .select(
          "source_document_id, position, title, content_md, page_start, page_end, start_seconds, end_seconds, source_documents!inner(title, doc_type)",
        )
        .eq("topic_id", topicId)
        .order("source_document_id")
        .order("position")
        .limit(200),
    );
    const readings = sectionRows
      .filter((row) => row.source_documents.doc_type !== "past_exam")
      .map((row) => ({
        documentId: row.source_document_id,
        docTitle: row.source_documents.title,
        docType: row.source_documents.doc_type,
        position: row.position,
        title: row.title,
        locator: locatorOf(row),
        excerpt: plainExcerpt(row.content_md),
      }));
    const examSections = new Map(
      sectionRows
        .filter((row) => row.source_documents.doc_type === "past_exam")
        .map((row) => [`${row.source_document_id}:${questionNumberFromSectionTitle(row.title)}`, row.position]),
    );

    const itemRows = unwrap<
      Array<{
        item_number: number;
        statement: string;
        official_answer: "C" | "E";
        tps_question_stems: {
          id: string;
          question_number: number | null;
          stem_text: string;
          exam_year: number | null;
          source_document_id: string | null;
          source_documents: { title: string } | null;
        };
      }>
    >(
      "topic-items",
      await supabase
        .from("tps_items")
        .select(
          "item_number, statement, official_answer, tps_question_stems!inner(id, question_number, stem_text, exam_year, source_document_id, is_ai_generated, source_documents(title))",
        )
        .eq("topic_id", topicId)
        .eq("tps_question_stems.is_ai_generated", false)
        .order("item_number")
        .limit(400),
    );
    const byStem = new Map<string, TopicQuestion>();
    for (const row of itemRows) {
      const stem = row.tps_question_stems;
      if (!stem.source_document_id || stem.question_number === null) continue;
      const question = byStem.get(stem.id) ?? {
        documentId: stem.source_document_id,
        docTitle: stem.source_documents?.title ?? "Prova",
        sectionPosition: examSections.get(`${stem.source_document_id}:${stem.question_number}`) ?? null,
        year: stem.exam_year,
        number: stem.question_number,
        text: stem.stem_text,
        items: [],
      };
      question.items.push({ number: row.item_number, statement: row.statement, answer: row.official_answer });
      byStem.set(stem.id, question);
    }
    return { state: "ok", readings, questions: [...byStem.values()] };
  } catch (error) {
    return failure("topic", error);
  }
});

// ---------------------------------------------------------------------------
// Organização (área de manutenção)
// ---------------------------------------------------------------------------

export interface OrganizerSection {
  id: string;
  position: number;
  level: number;
  title: string;
  locator: string | null;
  topicId: string | null;
  assignedByHand: boolean;
}

export interface OrganizerDocument {
  id: string;
  title: string;
  author: string | null;
  docType: DocType;
  filePath: string | null;
  ready: boolean;
  sectionCount: number;
  linkedSections: number;
  warnings: number;
}

export type OrganizerResult =
  | { state: AcervoState }
  | { state: "ok"; documents: OrganizerDocument[]; topics: TopicRef[] };

export const loadAcervoOrganizer = cache(async (): Promise<OrganizerResult> => {
  if (!isSupabaseConfigured()) return { state: "unconfigured" };
  try {
    const supabase = getSupabaseAdmin();
    const { subject, topics } = await loadSubjectAndTopics();
    const documents = unwrap<DocumentRow[]>(
      "organizer-documents",
      await supabase
        .from("source_documents")
        .select("id, title, author, doc_type, processed_at, file_path, metadata")
        .eq("subject_id", subject.id)
        .order("title"),
    );
    const sections = documents.length
      ? await fetchAll<{ source_document_id: string; topic_id: string | null }>("organizer-sections", (from, to) =>
          supabase
            .from("document_sections")
            .select("source_document_id, topic_id")
            .in(
              "source_document_id",
              documents.map((document) => document.id),
            )
            .order("id")
            .range(from, to),
        )
      : unwrap<Array<{ source_document_id: string; topic_id: string | null }>>(
          "organizer-sections",
          await supabase.from("document_sections").select("source_document_id, topic_id").limit(1),
        ).filter(() => false);
    return {
      state: "ok",
      topics: [...topics.values()].sort((a, b) => a.code.localeCompare(b.code, "pt-BR", { numeric: true })),
      documents: documents.map((document) => {
        const own = sections.filter((section) => section.source_document_id === document.id);
        return {
          id: document.id,
          title: document.title,
          author: document.author,
          docType: document.doc_type,
          filePath: document.file_path,
          ready: Boolean(document.processed_at),
          sectionCount: own.length,
          linkedSections: own.filter((section) => section.topic_id).length,
          warnings: numberFrom(document.metadata, "warnings") ?? 0,
        };
      }),
    };
  } catch (error) {
    return failure("organizer", error);
  }
});

export type OrganizerDocumentResult =
  | { state: AcervoState }
  | { state: "not_found" }
  | { state: "ok"; document: OrganizerDocument; sections: OrganizerSection[]; topics: TopicRef[] };

export const loadOrganizerDocument = cache(async (documentId: string): Promise<OrganizerDocumentResult> => {
  const overview = await loadAcervoOrganizer();
  if (overview.state !== "ok") return { state: overview.state };
  const document = overview.documents.find((candidate) => candidate.id === documentId);
  if (!document) return { state: "not_found" };
  try {
    const supabase = getSupabaseAdmin();
    const rows = await fetchAll<SectionRow & { topic_assigned_by: string }>("organizer-document", (from, to) =>
      supabase
        .from("document_sections")
        .select(`${SECTION_LIGHT_COLUMNS}, topic_assigned_by`)
        .eq("source_document_id", documentId)
        .order("position")
        .range(from, to),
    );
    return {
      state: "ok",
      document,
      topics: overview.topics,
      sections: rows.map((row) => ({
        id: row.id,
        position: row.position,
        level: row.level,
        title: row.title,
        locator: locatorOf(row),
        topicId: row.topic_id,
        assignedByHand: row.topic_assigned_by === "manual",
      })),
    };
  } catch (error) {
    return failure("organizer-document", error);
  }
});
