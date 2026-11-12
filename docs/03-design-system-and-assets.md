# Design System & Guia de Assets: Estética "Itamaraty / Rio Branco"

> Origem: Artefato 14 (`artefatos/gemini-code-1794510776371.md`), integrado na Etapa A.
> **Implementação:** os tokens vivem em `src/app/globals.css` (Tailwind 4 — não existe `tailwind.config.ts`).
> Os nomes abaixo são os nomes reais das classes utilitárias.

## 1. Conceito Estético e Ergonomia Cognitiva
O sistema visual deve transmitir a sobriedade, a organização e o prestígio da carreira diplomática brasileira, funcionando como um gabinete de estudos silencioso e focado:
- **Zero Fadiga Visual:** Proibido o uso de `#FFFFFF` puro em grandes áreas de leitura ou `#000000` puro no modo escuro.
- **Hierarquia Editorial:** Textos teóricos, enunciados de 3ª Fase e citações historiográficas utilizam tipografia serifada clássica (estilo publicações da FUNAG / Cadernos do CHDD), enquanto controles interativos, gráficos e métricas usam tipografia sem serifa limpa e fontes monoespaçadas.
- **Gamificação Institucional:** Em vez de medalhas infantis, a evolução da aluna nos tópicos utiliza a progressão real da carreira de Diplomata (de *Terceiro-Secretário* a *Ministro de Primeira Classe / Embaixador*).

## 2. Paleta de Cores Semântica (Tokens Oficiais)

### 2.1 Cores Institucionais Principais
- **Azul Barão (Ordem de Rio Branco — Cor Primária de Autoridade):**
  - `itamaraty-navy-950`: `#08111D` (Fundo principal no Modo Noturno)
  - `itamaraty-navy-900`: `#0F1E32` (Superfície de cards no Modo Noturno / Cabeçalhos)
  - `itamaraty-navy-800`: `#18304E` (Bordas e elementos ativos)
  - `itamaraty-navy-700`: `#1B3B61`
  - `itamaraty-navy-600`: `#1E4471` (Azul fita da Ordem de Rio Branco — Botões primários no Modo Diurno)
  - `itamaraty-navy-500`: `#2B5B94`
- **Verde Esmeralda / Jardins de Burle Marx (Sucesso, Estabilidade FSRS, Superávit):**
  - `itamaraty-emerald-950`: `#04221A`
  - `itamaraty-emerald-900`: `#07362A`
  - `itamaraty-emerald-700`: `#0D5C46` (Verde oficial diplomático)
  - `itamaraty-emerald-600`: `#0F7156` (barras de progresso no modo diurno — ausente no config original)
  - `itamaraty-emerald-500`: `#108565` (Indicadores de acerto no TPS e superávit no BP)
  - `itamaraty-emerald-400`: `#24A17E`
- **Ouro Chancelaria (Maestria, Citações Clássicas e 3ª Fase):**
  - `itamaraty-gold-700`: `#8A6409`
  - `itamaraty-gold-600`: `#B8860B` (Texto de destaque no Modo Diurno)
  - `itamaraty-gold-500`: `#C59B27` (Bordados do uniforme diplomático — Botões primários no Modo Noturno)
  - `itamaraty-gold-400`: `#D4AF37`
  - `itamaraty-gold-300`: `#E5C76B` (Destaques suaves e ícones de insígnias)

### 2.2 Superfícies de Leitura (Modo Diurno — "Pergaminho & Travertino")
- `travertine-50`: `#FBF9F5` (Fundo principal da página — tom de papel creme suave)
- `travertine-100`: `#F3EFE6` (Fundo de cards, barras laterais e folha pautada de redação)
- `travertine-200`: `#E5DEC9` (Bordas sutis e linhas de caderno da Oficina de 90 linhas)
- `travertine-300`: `#D2C7A8`
- `ink-900`: `#121C26` (Texto principal de leitura — azul-carvão profundo)
- `ink-700`: `#2D3748`
- `ink-600`: `#4A5568` (Texto secundário, legendas e metadados de fonte)
- `ink-500`: `#64748B`

### 2.3 Alertas e Pegadinhas da Banca (Carmim Diplomático)
- `itamaraty-carmine-900`: `#4A1213`
- `itamaraty-carmine-700`: `#9E2A2B` (Erro no TPS / Déficit Externo / Inversão Causal)
- `itamaraty-carmine-500`: `#C83E3B` (Destaque de armadilha no Caderno de Erros)
- `amber-trap-500`: `#D97706` (Marcação de "Dúvida / Chute" no termômetro de confiança)

### 2.4 Código de Cores Padronizado para Gráficos Econômicos (IS-LM-BP)
Para que a aluna construa memória visual imediata em qualquer gráfico do sistema, as curvas econômicas respeitam sempre a mesma cor em todas as telas. Use as classes `stroke-econ-*` / `fill-econ-*` / `text-econ-*`:
- **Curva IS (Mercado de Bens / Política Fiscal):** `econ-is` — Ouro Imperial `#F59E0B`
- **Curva LM (Mercado Monetário / Juros BACEN):** `econ-lm` — Azul Celeste Rio Branco `#38BDF8`
- **Curva BP (Balanço de Pagamentos / Setor Externo):** `econ-bp` — Esmeralda Itamaraty `#10B981`
- **Equilíbrio Pós-Choque / Deslocamento:** `econ-shock` — Coral `#F97316`
- **Perda de Peso Morto / Ineficiência:** `econ-deadweight` — Rosa Carmim `#F43F5E` (com opacidade de 25%)

Os quadros de gráfico ficam sempre escuros (`bg-itamaraty-navy-950`), nos dois modos: essas cores foram escolhidas para alto contraste sobre fundo escuro.

### 2.5 Sombras e Gradientes
- `shadow-diplomatic`, `shadow-parchment`
- `bg-chancery-gradient` (navy 950 → 900 → 800), `bg-gold-shimmer`

## 3. Sistema Tipográfico (Google Fonts via `next/font`, em `src/app/layout.tsx`)
1. **`font-serif` (`Newsreader`):** títulos de módulos, texto integral das fichas (`topic_lessons`), enunciados do TPS, textos motivadores e o editor pautado de 90 linhas. Leitura: `line-height` 1.75 e coluna de no máximo `68ch`.
2. **`font-sans` (`Plus Jakarta Sans`):** navegação, botões, badges, filtros, cards de revisão FSRS e gaveta do Tutor.
3. **`font-mono` (`JetBrains Mono`):** equações, códigos do edital (`MOD-3 • 3.3`), contadores de linhas (`74/90`), cronômetro e tabelas do Balanço de Pagamentos.

**Markdown das fichas:** sempre `prose prose-itamaraty` (plugin `@tailwindcss/typography` + cores do Design System). Não use `prose-slate` nem `dark:prose-invert`: o `prose-itamaraty` já trata os dois modos.

## 4. Temas
- **Modo Pergaminho (diurno)** e **Modo Chancelaria (noturno)** são controlados pela classe `.dark` no `<html>`, aplicada antes da primeira pintura por um script inline do layout (chave `cacd-theme` no `localStorage`; sem escolha salva, segue o sistema).
- A **camada didática** (Camada 1 — Intuição Base Zero / Camada 2 — Rigor CACD) é uma preferência global: `useLearningLayer()` em `src/components/layout/learning-layer.tsx`.

## 5. Catálogo de Imagens para Gerar (Prompts para Imagen 3 / Midjourney / DALL-E 3)

> Situação atual: as capas dos módulos e as insígnias são **SVG nativo** (`ModuleEditorialCover.tsx`, `DiplomaticBadges.tsx`), e nenhuma imagem abaixo foi gerada ainda. Os três mascotes em estilo cartum de `artefatos/` não fazem parte deste catálogo e contrariam a regra de gamificação sóbria.

Salve as imagens geradas exatamente nos caminhos indicados dentro de `public/assets/`.

### 5.1 Banner Principal do Dashboard e Login
- **Caminho:** `public/assets/hero/palacio-itamaraty-hero.webp` (Proporção 16:9)
- **Prompt de Geração:**
  > Architectural fine-art illustration of Palácio Itamaraty (Palácio dos Arcos) in Brasília designed by Oscar Niemeyer, twilight hour, concrete modernist arches reflecting on the calm emerald water mirror designed by Burle Marx, the spherical bronze "Meteoro" sculpture by Bruno Giorgi glowing softly in warm gold, deep diplomatic navy blue sky (`#0F1E32`), travertine marble textures (`#F3EFE6`), minimalist editorial style inspired by mid-century Brazilian modernist prints and Athos Bulcão geometry, clean composition, no text, high resolution, 8k --ar 16:9

### 5.2 Capas dos 5 Módulos de Economia
Estilo unificado: gravura editorial neoclássica combinada com geometria modernista brasileira em fundo azul-marinho profundo (`#0F1E32`), traços em ouro envelhecido (`#C59B27`), creme travertino (`#F3EFE6`) e verde-esmeralda (`#0D5C46`).

1. **Módulo 0 — Fundação e Instrumental (`public/assets/modules/econ-mod-0.webp`):**
   > Minimalist editorial book cover illustration representing economic foundations, an antique brass navigation compass and a precision balance scale over subtle geometric coordinate grid lines, Athos Bulcão inspired background pattern, color palette of deep navy blue `#0F1E32`, warm travertine cream `#F3EFE6`, and brushed gold `#C59B27`, clean vector engraving style, no text --ar 4:3
2. **Módulo 1 — Microeconomia Aplicada (`public/assets/modules/econ-mod-1.webp`):**
   > Minimalist editorial illustration representing microeconomics and market structures, intersecting supply and demand curves rendered as elegant golden brass threads over a modernist architectural colonnade, deep navy blue `#0F1E32` and emerald green `#0D5C46` accents, vintage central bank engraving aesthetic, no text --ar 4:3
3. **Módulo 2 — Macroeconomia Fechada e Moeda (`public/assets/modules/econ-mod-2.webp`):**
   > Minimalist editorial illustration representing macroeconomics and monetary policy, stylized modernist silhouette of Brazil's Central Bank building in Brasília surrounded by balanced macroeconomic flow circles and golden coin motifs, deep navy `#0F1E32`, travertine cream `#F3EFE6`, and gold `#C59B27`, refined geometric print style, no text --ar 4:3
4. **Módulo 3 — Economia Internacional, Câmbio e BP (`public/assets/modules/econ-mod-3.webp`):**
   > Minimalist editorial illustration representing international economics and balance of payments, an armillary sphere and stylized globe with golden maritime trade routes and currency exchange equilibrium lines, inspired by Bruno Giorgi's Meteoro sculpture and diplomatic maps, deep navy `#0F1E32`, emerald `#108565`, and gold `#C59B27`, no text --ar 4:3
5. **Módulo 4 — História Econômica do Brasil (`public/assets/modules/econ-mod-4.webp`):**
   > Minimalist editorial illustration representing Brazilian Economic History from 1889 to the present, a seamless visual transition from botanical coffee branches on the left, to 1940s steel mill industrial gears in the center, to modern financial stability graphs on the right, rendered in fine gold and cream engraving over a deep navy `#0F1E32` background, FUNAG book cover aesthetic, no text --ar 4:3

### 5.3 Insígnias da Carreira Diplomática (Níveis de Maestria do Tópico)
- **Diretório:** `public/assets/badges/` (Proporção 1:1, fundo transparente ou circular em `#0F1E32`)
- **Mapeamento real (regra em `resolveDiplomaticRank`, `src/lib/trail.ts`):**
  - `locked` e `available`: **sem insígnia** — a patente é conquistada, não atribuída.
  - `badge-3-secretario.webp` (`studying_base`): 1 estrela discreta em ouro fosco sobre fita azul-ultramar.
  - `badge-2-secretario.webp` (`studying_advanced` — Camada 1 concluída): 2 estrelas em ouro sobre ramo de café e louro estilizado.
  - `badge-1-secretario.webp` (`reviewing` com acerto líquido abaixo de 75% ou ainda sem TPS): 3 estrelas em ouro com borda geométrica de Athos Bulcão.
  - `badge-conselheiro.webp` (`reviewing` com acerto líquido de 75% ou mais): Insígnia circular da Ordem de Rio Branco em esmalte azul e ouro.
  - `badge-embaixador.webp` (`mastered`): Grande colar e estrela dourada de Ministro de Primeira Classe sob louros diplomáticos.
- **Prompt Base para gerar os ícones (ajustando o número de estrelas):**
  > Flat vector heraldic diplomatic emblem badge inspired by the Brazilian Order of Rio Branco, deep ultramarine blue enamel center, brushed antique gold laurel and coffee leaves border, [1 / 2 / 3 / 5] gold stars in the center, dark navy background `#08111D`, luxury institutional UI icon, crisp lines, no text --ar 1:1

### 5.4 Textura Geométrica de Athos Bulcão (SVG Nativo)
Implementada como `AthosBulcaoPattern` em `src/components/ui/DiplomaticBadges.tsx`: triângulos e arcos modulares em opacidade baixa (`0.03`–`0.06`), usados no header, nos heros da trilha e do estúdio e no topo da Oficina de Discursivas.
