"""Configuração: lê .env.local/.env como o Next.js e recusa valores de exemplo."""

import pytest

from cacd_factory.config import ConfigError, load_settings


def write(path, text):
    path.write_text(text, encoding="utf-8")


def test_env_local_wins_over_env(tmp_path):
    write(tmp_path / ".env", 'GEMINI_API_KEY="da-env"\n')
    write(tmp_path / ".env.local", 'GEMINI_API_KEY="da-env-local"\n')

    settings = load_settings(tmp_path, environ={})

    assert settings.gemini_api_key == "da-env-local"


def test_key_defined_only_in_the_machine_environment_is_ignored(tmp_path):
    # Uma GEMINI_API_KEY global do Windows pode ser de outro projeto: pagaria a conta e receberia o acervo.
    write(tmp_path / ".env.local", 'GEMINI_API_KEY="sua-chave-gemini"\n')

    settings = load_settings(tmp_path, environ={"GEMINI_API_KEY": "AIza-chave-global"})

    assert settings.gemini_api_key is None


def test_machine_environment_never_overrides_a_project_key(tmp_path):
    write(tmp_path / ".env.local", 'SUPABASE_SERVICE_ROLE_KEY="sb_secret_do_projeto"\n')

    settings = load_settings(tmp_path, environ={"SUPABASE_SERVICE_ROLE_KEY": "sb_secret_de_outro"})

    assert settings.service_role_key == "sb_secret_do_projeto"


@pytest.mark.parametrize("value", ["", "   ", "sua-chave-gemini", "https://seu-projeto.supabase.co"])
def test_placeholder_values_count_as_missing(tmp_path, value):
    write(tmp_path / ".env.local", f'GEMINI_API_KEY="{value}"\n')
    settings = load_settings(tmp_path, environ={})

    with pytest.raises(ConfigError) as error:
        settings.require("GEMINI_API_KEY")

    assert "GEMINI_API_KEY" in str(error.value)


def test_error_lists_every_missing_name_without_leaking_values(tmp_path):
    write(
        tmp_path / ".env.local",
        'NEXT_PUBLIC_SUPABASE_URL="https://abc.supabase.co"\n'
        'SUPABASE_SERVICE_ROLE_KEY="sua-chave-service-role"\n',
    )
    settings = load_settings(tmp_path, environ={})

    with pytest.raises(ConfigError) as error:
        settings.require("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GEMINI_API_KEY")

    message = str(error.value)
    assert "SUPABASE_SERVICE_ROLE_KEY" in message
    assert "GEMINI_API_KEY" in message
    assert "NEXT_PUBLIC_SUPABASE_URL" not in message
    assert "sua-chave-service-role" not in message


def test_configured_values_pass_the_requirement(tmp_path):
    write(tmp_path / ".env.local", 'GEMINI_API_KEY="AIza-chave-real"\n')
    settings = load_settings(tmp_path, environ={})

    settings.require("GEMINI_API_KEY")


def test_synthesis_model_can_be_overridden_by_environment(tmp_path):
    settings = load_settings(tmp_path, environ={"GEMINI_SYNTHESIS_MODEL": "gemini-outro"})

    assert settings.synthesis_model == "gemini-outro"
