import { describe, expect, it } from "vitest";
import {
  buildSnippet,
  countLabel,
  docTypeFromSlug,
  formatLocator,
  imageSizeFromTitle,
  questionNumberFromSectionTitle,
  resolveAssetLinks,
  splitExamSection,
  stripContextHeader,
  summaryEntries,
} from "./acervo";

describe("formatLocator", () => {
  it.each([
    [{ pageStart: 12, pageEnd: 12 }, "p. 12"],
    [{ pageStart: 12, pageEnd: 14 }, "pp. 12–14"],
    [{ startSeconds: 750, endSeconds: 1125 }, "12:30–18:45"],
    [{ startSeconds: 3725, endSeconds: 3725 }, "1:02:05"],
    [{}, null],
  ])("descreve %j como %s", (location, expected) => {
    expect(formatLocator(location)).toBe(expected);
  });

  it("prefere a minutagem quando a seção é de aula", () => {
    expect(formatLocator({ pageStart: 3, pageEnd: 3, startSeconds: 0, endSeconds: 60 })).toBe("00:00–01:00");
  });
});

describe("stripContextHeader", () => {
  it("tira o cabeçalho de busca que abre cada trecho", () => {
    expect(stripContextHeader("[Disciplina: Economia | Fonte: K, p. 3]\nTexto do trecho.")).toBe("Texto do trecho.");
  });

  it("mantém o texto que não começa com o cabeçalho", () => {
    expect(stripContextHeader("[Nota] texto")).toBe("[Nota] texto");
  });
});

describe("buildSnippet", () => {
  const content =
    "[Disciplina: Economia | Fonte: K, p. 3]\n" +
    "O modelo Mundell-Fleming mostra que, sob câmbio flutuante e perfeita mobilidade de capitais, " +
    "a política fiscal perde eficácia. É a trindade impossível em ação.";

  it("destaca o termo mesmo quando a busca vem sem acento", () => {
    const snippet = buildSnippet(content, "cambio", { radius: 30 });

    expect(snippet.filter((part) => part.highlight).map((part) => part.text)).toEqual(["câmbio"]);
    expect(snippet[0]).toEqual({ text: "…", highlight: false });
  });

  it("destaca uma frase entre aspas como um bloco só", () => {
    const snippet = buildSnippet(content, '"trindade impossivel"', { radius: 20 });

    expect(snippet.filter((part) => part.highlight).map((part) => part.text)).toEqual(["trindade impossível"]);
  });

  it("ignora os operadores da busca e destaca cada termo", () => {
    const snippet = buildSnippet(content, "fiscal OR capitais -monetária", { radius: 200 });

    expect(snippet.filter((part) => part.highlight).map((part) => part.text)).toEqual(["capitais", "fiscal"]);
  });

  it("sem termo encontrado, mostra o começo do trecho sem destaque", () => {
    const snippet = buildSnippet(content, "inflação", { radius: 10 });

    expect(snippet).toEqual([{ text: "O modelo Mundell-Fleming…", highlight: false }]);
  });
});

describe("resolveAssetLinks", () => {
  it("troca a referência da figura pela URL assinada, com as dimensões no título", () => {
    const assets = { "fig-0001": { url: "https://x/y.webp?token=1", width: 720, height: 480 } };

    expect(resolveAssetLinks("Antes ![Figura 1](asset:fig-0001) depois", assets)).toBe(
      'Antes ![Figura 1](https://x/y.webp?token=1 "720x480") depois',
    );
  });

  it("o leitor recupera as dimensões do título da imagem", () => {
    expect(imageSizeFromTitle("720x480")).toEqual({ width: 720, height: 480 });
    expect(imageSizeFromTitle("Figura 1")).toBeNull();
    expect(imageSizeFromTitle(undefined)).toBeNull();
  });

  it("sem dimensões conhecidas, só a URL", () => {
    expect(resolveAssetLinks("![F](asset:fig-0002)", { "fig-0002": { url: "https://x/z.webp", width: null, height: null } })).toBe(
      "![F](https://x/z.webp)",
    );
  });

  it("figura sem URL vira aviso, nunca imagem quebrada", () => {
    expect(resolveAssetLinks("![Slide 2 (00:11)](asset:slide-0002)", {})).toBe("_[Imagem indisponível: Slide 2 (00:11)]_");
  });
});

describe("questionNumberFromSectionTitle", () => {
  it.each([
    ["Questão 12", 12],
    ["Discursiva 2", null],
    ["Questão", null],
  ])("%s → %s", (title, expected) => {
    expect(questionNumberFromSectionTitle(title)).toBe(expected);
  });
});

describe("summaryEntries", () => {
  const sections = [
    { position: 0, level: 1 },
    { position: 1, level: 2 },
    { position: 2, level: 3 },
    { position: 3, level: 2 },
    { position: 4, level: 1 },
  ];

  it("mostra os dois níveis de cima do documento e conta o que ficou de fora", () => {
    const { entries, hidden } = summaryEntries(sections, 3);

    expect(entries.map((entry) => entry.position)).toEqual([0, 1, 3]);
    expect(hidden).toBe(2);
  });

  it("documento que começa no nível 2 usa os níveis 2 e 3", () => {
    const { entries } = summaryEntries(
      [
        { position: 0, level: 2 },
        { position: 1, level: 3 },
        { position: 2, level: 4 },
      ],
      10,
    );

    expect(entries.map((entry) => entry.position)).toEqual([0, 1]);
  });
});

describe("docTypeFromSlug", () => {
  it("aceita o nome da pasta e recusa o resto", () => {
    expect(docTypeFromSlug("provas")).toBe("past_exam");
    expect(docTypeFromSlug("qualquer")).toBeNull();
    expect(docTypeFromSlug(undefined)).toBeNull();
  });
});

describe("splitExamSection", () => {
  it("separa o enunciado da lista de itens", () => {
    const markdown = "Texto 1A1-I\nA economia cresceu.\n\n- **1.** Item um.\n- **2.** Item dois.";

    expect(splitExamSection(markdown)).toBe("Texto 1A1-I\nA economia cresceu.");
  });

  it("discursiva sem itens fica inteira", () => {
    const markdown = "Disserte sobre o Plano Real.\n\n_Valor: 30 pontos_";

    expect(splitExamSection(markdown)).toBe(markdown);
  });
});

describe("countLabel", () => {
  it.each([
    [1, "1 página"],
    [2, "2 páginas"],
    [0, "0 páginas"],
  ])("%i → %s", (count, expected) => {
    expect(countLabel(count, "página", "páginas")).toBe(expected);
  });
});

describe("buildSnippet com Markdown", () => {
  it("mostra o trecho em texto corrido, sem a marcação da ficha", () => {
    const content =
      "[Disciplina: Economia | Fonte: P]\nCom relação ao modelo, julgue.\n\n- **3.** Sob câmbio flutuante.\n- **4.** Sob câmbio fixo.\n\n![Figura 1](asset:fig-0001)";

    const snippet = buildSnippet(content, "cambio", { radius: 200 });

    expect(snippet.map((part) => part.text).join("")).toBe(
      "Com relação ao modelo, julgue. 3. Sob câmbio flutuante. 4. Sob câmbio fixo.",
    );
  });
});
