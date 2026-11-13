/**
 * Regras puras da área do Acervo: rótulos de tipo, localização (página ou minutagem), trecho da
 * busca com destaque sem depender de acento, figuras e sumário. Loaders e telas só delegam.
 */

export type DocType =
  | "book"
  | "course_pdf"
  | "video_transcript"
  | "personal_note"
  | "past_exam"
  | "official_syllabus";

/** Ordem em que os tipos aparecem no índice: o que ela mais lê primeiro. */
export const DOC_TYPE_ORDER: DocType[] = [
  "book",
  "course_pdf",
  "video_transcript",
  "past_exam",
  "personal_note",
  "official_syllabus",
];

export const DOC_TYPE_LABELS: Record<DocType, { singular: string; plural: string; slug: string }> = {
  book: { singular: "Livro", plural: "Livros", slug: "livros" },
  course_pdf: { singular: "Apostila", plural: "Apostilas", slug: "apostilas" },
  video_transcript: { singular: "Aula", plural: "Aulas", slug: "aulas" },
  past_exam: { singular: "Prova", plural: "Provas", slug: "provas" },
  personal_note: { singular: "Anotação", plural: "Anotações", slug: "anotacoes" },
  official_syllabus: { singular: "Edital", plural: "Editais", slug: "edital" },
};

export function docTypeFromSlug(slug: string | null | undefined): DocType | null {
  if (!slug) return null;
  const match = DOC_TYPE_ORDER.find((type) => DOC_TYPE_LABELS[type].slug === slug);
  return match ?? null;
}

export function formatTimestamp(seconds: number): string {
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${pad(minutes)}:${pad(secs)}`;
}

export interface Location {
  pageStart?: number | null;
  pageEnd?: number | null;
  startSeconds?: number | null;
  endSeconds?: number | null;
}

/** "p. 12", "pp. 12–14" ou "12:30–18:45"; nas aulas, a minutagem vale mais que a página. */
export function formatLocator({ pageStart, pageEnd, startSeconds, endSeconds }: Location): string | null {
  if (startSeconds != null && endSeconds != null) {
    return startSeconds === endSeconds
      ? formatTimestamp(startSeconds)
      : `${formatTimestamp(startSeconds)}–${formatTimestamp(endSeconds)}`;
  }
  if (pageStart != null) {
    return pageEnd != null && pageEnd !== pageStart ? `pp. ${pageStart}–${pageEnd}` : `p. ${pageStart}`;
  }
  return null;
}

/** O cabeçalho [Disciplina | Tópico | Fonte] serve à busca; na tela a fonte já aparece no rótulo. */
export function stripContextHeader(content: string): string {
  const newline = content.indexOf("\n");
  const firstLine = newline === -1 ? content : content.slice(0, newline);
  if (firstLine.startsWith("[Disciplina:") && firstLine.endsWith("]")) {
    return content.slice(newline + 1).trim();
  }
  return content.trim();
}

const ASSET_IMAGE = /!\[([^\]]*)\]\(asset:([A-Za-z0-9_-]+)\)/g;

export interface AssetLink {
  url: string;
  width: number | null;
  height: number | null;
}

/**
 * Troca `asset:fig-0001` pela URL assinada do Storage. As dimensões vão no título da imagem
 * ("720x480"): o leitor reserva o espaço e o carregamento sob demanda funciona.
 * Sem URL, um aviso no lugar da imagem.
 */
export function resolveAssetLinks(markdown: string, assets: Record<string, AssetLink>): string {
  return markdown.replace(ASSET_IMAGE, (_match, alt: string, key: string) => {
    const asset = assets[key];
    if (!asset) return `_[Imagem indisponível: ${alt}]_`;
    const size = asset.width && asset.height ? ` "${asset.width}x${asset.height}"` : "";
    return `![${alt}](${asset.url}${size})`;
  });
}

/** Lê as dimensões que `resolveAssetLinks` pôs no título da imagem. */
export function imageSizeFromTitle(title: string | null | undefined): { width: number; height: number } | null {
  const match = /^(\d+)x(\d+)$/.exec(title ?? "");
  return match ? { width: Number(match[1]), height: Number(match[2]) } : null;
}

export function questionNumberFromSectionTitle(title: string): number | null {
  const match = /^Questão\s+(\d+)$/.exec(title.trim());
  return match ? Number(match[1]) : null;
}

/** Entradas do sumário no índice: os dois níveis de cima do documento, até `limit`. */
export function summaryEntries<T extends { level: number }>(sections: T[], limit: number): { entries: T[]; hidden: number } {
  if (sections.length === 0) return { entries: [], hidden: 0 };
  const top = Math.min(...sections.map((section) => section.level));
  const entries = sections.filter((section) => section.level <= top + 1).slice(0, limit);
  return { entries, hidden: sections.length - entries.length };
}

// ---------------------------------------------------------------------------
// Trecho da busca com destaque, sem depender de acento
// ---------------------------------------------------------------------------

export interface SnippetPart {
  text: string;
  highlight: boolean;
}

function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** Termos da busca, na sintaxe que o Postgres aceita: "frase exata", OR e -exclusão. */
export function searchTerms(query: string): string[] {
  const phrases = [...query.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  const rest = query.replace(/"[^"]*"/g, " ");
  const words = rest
    .split(/\s+/)
    .filter((word) => word && !word.startsWith("-") && !/^(or|and)$/i.test(word))
    .map((word) => word.replace(/[^\p{L}\p{N}-]/gu, ""));
  const terms = [...phrases, ...words].map((term) => fold(term).trim()).filter((term) => term.length >= 2);
  return [...new Set(terms)];
}

/** Texto sem acento com o mapa de volta: cada caractere dobrado aponta para o original. */
function foldWithMap(text: string): { folded: string; map: number[] } {
  let folded = "";
  const map: number[] = [];
  for (let index = 0; index < text.length; index += 1) {
    const piece = fold(text[index]);
    for (const char of piece) {
      folded += char;
      map.push(index);
    }
  }
  return { folded, map };
}

function extendToWordEnd(text: string, index: number): number {
  const next = text.slice(index).search(/\s/);
  return next === -1 ? text.length : index + next;
}

/** Markdown da ficha em texto corrido: sem imagem, ênfase, marcador de lista, título ou tabela. */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*(?:[-*+]|\d{1,3}[.)])\s+/gm, "")
    .replace(/\*\*|__|`/g, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildSnippet(content: string, query: string, { radius = 110 }: { radius?: number } = {}): SnippetPart[] {
  const text = markdownToPlainText(stripContextHeader(content));
  const terms = searchTerms(query);
  const { folded, map } = foldWithMap(text);

  const matches: Array<[number, number]> = [];
  for (const term of terms) {
    let from = folded.indexOf(term);
    while (from !== -1) {
      matches.push([map[from], map[from + term.length - 1] + 1]);
      from = folded.indexOf(term, from + term.length);
    }
  }
  matches.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const match of matches) {
    const last = merged[merged.length - 1];
    if (last && match[0] <= last[1]) last[1] = Math.max(last[1], match[1]);
    else merged.push([...match]);
  }

  if (merged.length === 0) {
    const end = extendToWordEnd(text, Math.min(text.length, radius * 2));
    return [{ text: text.slice(0, end) + (end < text.length ? "…" : ""), highlight: false }];
  }

  let start = Math.max(0, merged[0][0] - radius);
  if (start > 0) {
    const space = text.indexOf(" ", start);
    start = space === -1 || space >= merged[0][0] ? merged[0][0] : space + 1;
  }
  const end = extendToWordEnd(text, Math.min(text.length, merged[0][1] + radius));

  const parts: SnippetPart[] = [];
  if (start > 0) parts.push({ text: "…", highlight: false });
  let cursor = start;
  for (const [matchStart, matchEnd] of merged) {
    if (matchStart >= end) break;
    if (matchEnd <= cursor) continue;
    if (matchStart > cursor) parts.push({ text: text.slice(cursor, matchStart), highlight: false });
    parts.push({ text: text.slice(Math.max(matchStart, cursor), Math.min(matchEnd, end)), highlight: true });
    cursor = Math.min(matchEnd, end);
  }
  if (cursor < end) parts.push({ text: text.slice(cursor, end), highlight: false });
  if (end < text.length) parts.push({ text: "…", highlight: false });
  return parts;
}

const EXAM_ITEM_LINE = /^- \*\*[\d.]+\.\*\* /;

/** Enunciado de uma questão de prova sem a lista de itens (os itens aparecem com o gabarito). */
export function splitExamSection(markdown: string): string {
  return markdown
    .split("\n")
    .filter((line) => !EXAM_ITEM_LINE.test(line))
    .join("\n")
    .trim();
}

/** "1 página", "2 páginas": a contagem com a palavra no número certo. */
export function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
