# Fábrica de conteúdo (back-office)

Leva o acervo dela para o sistema: livros, apostilas, aulas, provas e anotações viram seções
legíveis, figuras e slides, trechos pesquisáveis e questões de prova com gabarito.

**A extração não usa serviço de IA.** O Docling (leitura de PDF e OCR) e o Whisper (transcrição)
rodam neste computador; nada é enviado para fora além do resultado, que vai para o Supabase do
projeto. A parte de IA (vetores para o Tutor e fichas geradas) é a última fase e é opcional.

Para o dia a dia basta o atalho `acervo/Adicionar conteúdo.bat` (veja `acervo/LEIA-ME.md`).

## Instalação (uma vez)

Requer Python 3.11. O ambiente fica em `backoffice/.venv` (cerca de 2 GB, por causa do Docling e
do torch) — no D:, porque o C: está quase cheio.

```bash
cd backoffice
py -3.11 -m venv .venv
.venv/Scripts/python -m pip install --no-cache-dir -r requirements-dev.txt
```

Os modelos do Docling e do Whisper são baixados no primeiro uso para `backoffice/.cache/huggingface`.

No banco, aplique uma vez no SQL Editor do Supabase:
`supabase/migrations/20261114000000_acervo_sem_ia.sql` (seções, imagens, provas e busca por palavras).

## Configuração

A fábrica lê o `.env.local` da raiz do projeto (o mesmo do Next.js):

| Variável | Para quê |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` | obrigatórias: gravar no banco e no Storage |
| `GEMINI_API_KEY` | só na fase de IA |
| `WHISPER_MODEL` | padrão `large-v3-turbo`; `small` é mais rápido e menos preciso |
| `WHISPER_DEVICE` | padrão `cpu` (a GPU desta máquina tem 2 GB, pouco para o modelo grande) |
| `GEMINI_SYNTHESIS_MODEL` | fase de IA; padrão `gemini-4-argon` |

As chaves são lidas **só** dos arquivos do projeto: uma `GEMINI_API_KEY` definida no Windows é
ignorada de propósito, porque pode ser de outro projeto do Google.

## Comandos

```bash
.venv/Scripts/python content_factory.py status            # banco, acervo e fichas
.venv/Scripts/python content_factory.py scan              # arquivos novos de acervo/entrada
.venv/Scripts/python content_factory.py ingest --dry-run  # extrai e mostra, sem gravar
.venv/Scripts/python content_factory.py ingest            # extrai e grava
.venv/Scripts/python content_factory.py ingest --only "Krugman" --reprocess
```

Rodar de novo é seguro: arquivo já processado é pulado; arquivo alterado é atualizado no mesmo
registro; o mesmo arquivo em duas pastas é recusado como duplicado. Tópico escolhido à mão na
interface sobrevive a uma nova extração, e item de prova que ela já respondeu nunca é apagado.

### O que sai de cada tipo de arquivo

| Tipo | Extração |
|---|---|
| Livro, apostila, edital (PDF, DOCX, PPTX, HTML) | títulos com hierarquia (5.1, 5.1.2, Capítulo, Parte), parágrafos, listas, tabelas, fórmulas, figuras e a página de cada pedaço; OCR nas páginas digitalizadas |
| Aula em vídeo | legenda `.srt`/`.vtt` ao lado (ou transcrição pelo Whisper) e um quadro de cada slide, em trechos por slide |
| Aula em áudio | transcrição em trechos de 5 minutos |
| Prova (PDF) | questões e itens C/E no formato do Cebraspe, disciplina de cada bloco do caderno, gabarito (anulados ficam fora do treino) e discursivas com linhas e pontos |
| Anotação (MD, TXT) | títulos, parágrafos, listas e tabelas |

Tempos neste computador: o Docling leva cerca de 3 s por página de PDF; o Whisper em CPU fica
perto do tempo real da aula. Com legenda, a aula é processada em segundos.

### Saídas para conferir

- `acervo/processado/<título>.md` — o texto extraído de cada arquivo;
- `acervo/revisao/<prova>.md` — cada prova destrinchada, com avisos (item sem gabarito, numeração
  que salta, questão não reconhecida).

## Manifesto (`bibliography_manifest.json`)

O `scan` cria e atualiza o manifesto sozinho; editar é opcional. Ele fica fora do git (lista os
arquivos dela). Campos de cada documento:

```json
{
  "path": "livros/Krugman - Economia Internacional.pdf",
  "title": "Economia Internacional: Teoria e Política",
  "author": "Krugman, Obstfeld e Melitz",
  "edition": "10ª ed.",
  "subject": "economia",
  "doc_type": "book",
  "authority_weight": 9,
  "topic": null,
  "topic_pages": [{ "pages": "480-530", "topic": "3.3" }],
  "answer_key": null
}
```

- `authority_weight` (1 a 10) pesa a fonte na busca: livro de referência acima de resumo.
- `topic` liga o documento inteiro a um tópico; `topic_pages` liga faixas de páginas.
  Também dá para ligar seção por seção na tela do Acervo.
- `answer_key` é o gabarito da prova; o `scan` preenche quando ele está na mesma pasta.

## Testes

```bash
.venv/Scripts/python -m pytest                 # rápidos
.venv/Scripts/python -m pytest -m integration  # Docling e PDF de verdade
```

## Fase de IA (por último)

Com `GEMINI_API_KEY` de um projeto com faturamento ativo (no nível gratuito, o Google usa o que é
enviado para melhorar os produtos dele):

```bash
.venv/Scripts/python content_factory.py ingest --com-vetores --reprocess   # vetores do RAG
.venv/Scripts/python content_factory.py search "trindade impossível" --topic 3.3
.venv/Scripts/python content_factory.py synthesize 3.3                     # ficha em 2 camadas
```

A ficha gerada só é gravada se cada afirmação citar um trecho do acervo que existe de fato.
