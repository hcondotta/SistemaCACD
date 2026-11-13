"""Configuração do back-office: as mesmas variáveis do Next.js, lidas de `.env.local` e `.env`.

Chaves e URL do projeto vêm SÓ dos arquivos do projeto (`.env.local` > `.env`). Uma variável
global do Windows com o mesmo nome é ignorada: ela pode pertencer a outro projeto do Google ou
do Supabase, que pagaria a conta e receberia o acervo. Ajustes sem segredo (modelos, Whisper)
podem vir do ambiente. Os valores nunca são impressos; o erro diz só QUAIS nomes faltam.
"""

from __future__ import annotations

import os
from collections.abc import Mapping
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import dotenv_values

# Os mesmos marcadores de `src/lib/server-clients.ts`: valores de exemplo contam como ausentes.
PLACEHOLDER_MARKERS = ("seu-projeto", "sua-chave")

# Modelo da síntese das fichas. Em nov/2026 a linha 2.5 está descontinuada para projetos novos;
# troque pela variável GEMINI_SYNTHESIS_MODEL sem mexer no código.
DEFAULT_SYNTHESIS_MODEL = "gemini-4-argon"
DEFAULT_WHISPER_MODEL = "large-v3-turbo"
# A GPU desta máquina (MX450, 2 GB) não comporta o Whisper grande: CPU com int8 é o caminho estável.
DEFAULT_WHISPER_DEVICE = "cpu"

PROJECT_ROOT = Path(__file__).resolve().parents[2]

# Lidas apenas dos arquivos do projeto, nunca do ambiente da máquina.
PROJECT_ONLY_NAMES = frozenset({"NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GEMINI_API_KEY"})


class ConfigError(RuntimeError):
    """Variável obrigatória ausente ou ainda com o valor de exemplo."""


def has_real_value(value: str | None) -> bool:
    if value is None:
        return False
    stripped = value.strip()
    if not stripped:
        return False
    return not any(marker in stripped for marker in PLACEHOLDER_MARKERS)


@dataclass(frozen=True)
class Settings:
    # repr=False: imprimir o objeto por engano não pode vazar chave nenhuma.
    values: Mapping[str, str] = field(repr=False)

    def get(self, name: str) -> str | None:
        value = self.values.get(name)
        return value.strip() if has_real_value(value) else None

    def require(self, *names: str) -> None:
        missing = [name for name in names if self.get(name) is None]
        if missing:
            raise ConfigError(
                "Configure no .env.local da raiz do projeto: "
                + ", ".join(missing)
                + ". Valores de exemplo, como 'sua-chave', contam como ausentes."
            )

    @property
    def supabase_url(self) -> str | None:
        return self.get("NEXT_PUBLIC_SUPABASE_URL")

    @property
    def service_role_key(self) -> str | None:
        return self.get("SUPABASE_SERVICE_ROLE_KEY")

    @property
    def gemini_api_key(self) -> str | None:
        return self.get("GEMINI_API_KEY")

    @property
    def synthesis_model(self) -> str:
        return self.get("GEMINI_SYNTHESIS_MODEL") or DEFAULT_SYNTHESIS_MODEL

    @property
    def whisper_model(self) -> str:
        return self.get("WHISPER_MODEL") or DEFAULT_WHISPER_MODEL

    @property
    def whisper_device(self) -> str:
        return self.get("WHISPER_DEVICE") or DEFAULT_WHISPER_DEVICE


def load_settings(project_root: Path = PROJECT_ROOT, environ: Mapping[str, str] | None = None) -> Settings:
    merged: dict[str, str] = {}
    for filename in (".env", ".env.local"):
        path = project_root / filename
        if path.is_file():
            merged.update({key: value for key, value in dotenv_values(path).items() if value is not None})
    environment = os.environ if environ is None else environ
    merged.update({key: value for key, value in environment.items() if key not in PROJECT_ONLY_NAMES})
    return Settings(values=merged)
