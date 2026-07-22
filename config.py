"""Módulo de configuração do projeto.

Carrega variáveis de ambiente do arquivo ``.env`` e expõe-nas como
atributos de um dataclass imutável para o restante da aplicação.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

_ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(_ENV_PATH)


def _env(key: str, default: str = "") -> str:
    """Obtém uma variável de ambiente obrigatória."""
    value = os.getenv(key, default).strip()
    if not value and not default:
        msg = (
            f"Variável de ambiente '{key}' não definida. "
            f"Verifique o arquivo {_ENV_PATH}"
        )
        raise RuntimeError(msg)
    if not value:
        return default
    return value


def _env_bool(key: str, default: bool = False) -> bool:
    """Obtém uma variável de ambiente como booleano."""
    value = _env(key, str(default)).lower()
    return value in {"true", "1", "yes", "on"}


@dataclass(frozen=True)
class Config:
    """Configuração centralizada da aplicação."""

    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    cubo_email: str
    cubo_password: str

    headless: bool
    selenium_timeout: int
    request_delay: float


def load_config() -> Config:
    """Cria a instância de :class:`Config` a partir do ambiente."""
    return Config(
        supabase_url=_env("SUPABASE_URL"),
        supabase_anon_key=_env("SUPABASE_ANON_KEY"),
        supabase_service_role_key=_env("SUPABASE_SERVICE_ROLE_KEY"),
        cubo_email=_env("CUBO_EMAIL"),
        cubo_password=_env("CUBO_PASSWORD"),
        headless=_env_bool("HEADLESS"),
        selenium_timeout=int(_env("SELENIUM_TIMEOUT", "15")),
        request_delay=float(_env("REQUEST_DELAY", "1.5")),
    )
