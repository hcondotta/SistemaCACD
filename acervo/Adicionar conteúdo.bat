@echo off
chcp 65001 > nul
title Adicionar conteúdo ao acervo do CACD
cd /d "%~dp0..\backoffice"

if not exist ".venv\Scripts\python.exe" (
  echo.
  echo O ambiente Python da fábrica de conteúdo ainda não foi instalado.
  echo Siga o passo a passo de backoffice\README.md e tente de novo.
  echo.
  pause
  exit /b 1
)

echo.
echo 1/2  Procurando arquivos novos em acervo\entrada ...
echo.
".venv\Scripts\python.exe" content_factory.py scan
if errorlevel 1 goto fim

echo.
echo 2/2  Extraindo e gravando no banco. Livros grandes levam alguns minutos;
echo      pode deixar a janela aberta e voltar depois.
echo.
".venv\Scripts\python.exe" content_factory.py ingest

:fim
echo.
echo Pronto. Os textos extraídos ficam em acervo\processado e as provas para conferir em acervo\revisao.
echo.
pause
