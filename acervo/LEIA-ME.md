# Acervo

Tudo o que ela estuda entra por aqui. A extração roda no computador, sem serviço de IA.

## Como adicionar conteúdo

1. Solte os arquivos na subpasta certa de `entrada/` (se ela ainda não existir, o passo 2 cria):

   | Pasta | O que vai nela | Formatos |
   |---|---|---|
   | `entrada/livros/` | livros e capítulos | PDF, DOCX, PPTX, HTML |
   | `entrada/apostilas/` | apostilas de cursinho | PDF, DOCX |
   | `entrada/aulas/` | videoaulas e áudios | MP4, MKV, WEBM, MOV, MP3, M4A, WAV, OGG |
   | `entrada/provas/` | cadernos de prova **e** gabaritos | PDF (gabarito também pode ser TXT) |
   | `entrada/anotacoes/` | fichamentos e resumos dela | MD, TXT, DOCX |
   | `entrada/edital/` | editais | PDF |

   Dicas que melhoram a extração:
   - Nome no formato `Autor - Título.pdf` já preenche autor e título.
   - Prova e gabarito na **mesma pasta** (uma pasta por prova, ex.: `provas/CACD 2024/`), com
     "gabarito" no nome do arquivo do gabarito.
   - Aula com legenda: deixe o `.srt` ou `.vtt` ao lado do vídeo, com o mesmo nome. A legenda é
     usada no lugar da transcrição, que é bem mais lenta.

2. Dê dois cliques em **`Adicionar conteúdo.bat`**.

3. Confira o resultado:
   - `processado/` tem o texto extraído de cada arquivo, em Markdown;
   - `revisao/` tem cada prova destrinchada (questões, itens e gabarito), com avisos do que não
     foi reconhecido;
   - no sistema, a tela **Acervo** mostra tudo e permite ligar capítulos e questões aos tópicos.

Rodar de novo é seguro: o que já foi processado é pulado, e um arquivo alterado é atualizado no
lugar, sem duplicar.

## O que fica fora do git

`entrada/`, `processado/` e `revisao/` são pessoais e pesados: não vão para o repositório.
Só este LEIA-ME e o atalho `Adicionar conteúdo.bat` são versionados.
