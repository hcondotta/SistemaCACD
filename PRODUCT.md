# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Quem estuda:** a esposa do autor, candidata ao CACD (Concurso de Admissão à Carreira de
  Diplomata, Instituto Rio Branco). Começa por Economia, a disciplina em que tem mais dificuldade
  (modelos gráficos e matemáticos, câmbio e Balanço de Pagamentos, discursivas de 60 a 90 linhas,
  base desde o zero). Estuda no computador e no celular/tablet na mesma medida, com sessões longas
  de leitura.
- **Quem monta e alimenta:** o autor (marido). Constrói o sistema, adiciona livros, aulas e provas e
  organiza o acervo (liga capítulos e questões aos tópicos). A organização fica numa área de
  manutenção; a tela dela é de estudo.

## Product Purpose

Plataforma pessoal de estudo de alto rendimento para o CACD: trilha do edital em ordem lógica com
trava de pré-requisito, fichas em duas camadas (intuição Base Zero → rigor CACD), treino com provas
reais (TPS Certo/Errado com escore líquido) e discursivas de 3ª fase. Sucesso: ela estuda a trilha
na ordem, lê o próprio material dentro do sistema e treina com as provas anteriores.

## Positioning

Tudo é ancorado no acervo dela — os livros, apostilas, aulas, provas e fichamentos que ela já
tem — com fonte e página (ou minutagem) de cada trecho. Nada de conteúdo genérico ou inventado.

## Operating Context

- Materiais: PDFs de livros clássicos e apostilas, videoaulas (às vezes com legenda), provas
  anteriores do CACD com gabarito, fichamentos pessoais (Word, Notion, Markdown, PDF).
- Entrada de conteúdo: arquivos soltos em `acervo/entrada/<tipo>/` e o atalho
  `acervo/Adicionar conteúdo.bat`; a extração roda no computador (Docling, Whisper), sem IA externa.
- Hoje roda localmente; hospedagem (Vercel com login) ainda não foi decidida.

## Capabilities and Constraints

- Next.js 16 (App Router) + Supabase (Postgres, RLS, Storage) + Python no back-office.
- A IA (Tutor RAG, fichas geradas, correção de discursivas) é a última fase; o núcleo funciona sem IA.
- Regras do AGENTS.md: sem dados inventados como fallback, estados vazios explícitos, validação de
  entrada com Zod, regra de negócio em função pura testada.
- Interface em português do Brasil.

## Brand Commitments

Design System "Itamaraty / Rio Branco" (docs/03-design-system-and-assets.md, tokens em
src/app/globals.css): tema claro Pergaminho e escuro Chancelaria; Newsreader, Plus Jakarta Sans e
JetBrains Mono; progressão por patentes diplomáticas (Terceiro-Secretário → Embaixador). Uso
obrigatório pelos tokens (AGENTS.md, regra 9).

## Evidence on Hand

Banco com 9 disciplinas e a trilha de Economia (5 módulos, 28 tópicos, pré-requisitos) e 1 modelo
causal (Mundell-Fleming). Ainda não há fichas, acervo indexado nem provas importadas — telas que
dependem disso mostram o estado vazio, nunca conteúdo de exemplo.

## Product Principles

1. As fontes dela primeiro: todo conteúdo exibido aponta de onde veio.
2. A ordem importa: pré-requisito antes, intuição antes do formalismo.
3. Estado honesto: nunca progresso, número ou conteúdo fictício.
4. Adicionar conteúdo tem de ser quase sem atrito; organizar é tarefa de manutenção, separada do estudo.
5. Leitura longa confortável no computador e no celular.

## Accessibility & Inclusion

Leitura prolongada em duas telas (desktop e mobile): tipografia de leitura confortável, contraste
nos dois temas, navegação por teclado nas telas de estudo.
