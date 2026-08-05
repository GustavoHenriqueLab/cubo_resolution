"""Modulo de configuracao do projeto.

Carrega variaveis de ambiente do arquivo ``.env`` e expoe-nas como
atributos de um dataclass imutavel para o restante da aplicacao.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(_ENV_PATH)


def _env(key: str, default: str = "") -> str:
    """Obtem uma variavel de ambiente, com fallback opcional."""
    return os.getenv(key, default).strip()


def _env_int(key: str, default: int) -> int:
    """Obtem uma variavel de ambiente como inteiro."""
    try:
        return int(_env(key, str(default)))
    except ValueError:
        return default


def _env_float(key: str, default: float) -> float:
    """Obtem uma variavel de ambiente como float."""
    try:
        return float(_env(key, str(default)))
    except ValueError:
        return default


def _env_bool(key: str, default: bool = False) -> bool:
    """Obtem uma variavel de ambiente como booleano."""
    value = _env(key, str(default)).lower()
    return value in {"true", "1", "yes", "on"}


@dataclass(frozen=True)
class Config:
    """Configuracao centralizada da aplicacao."""

    cubo_email: str
    cubo_password: str

    gemini_api_key: str
    gemini_model: str
    startup_batch_size: int
    gemini_max_retries: int
    gemini_delay_between_batches: float

    headless: bool
    selenium_timeout: int
    request_delay: float

    supabase_url: str
    supabase_service_role_key: str


def load_config() -> Config:
    """Cria a instancia de :class:`Config` a partir do ambiente."""
    return Config(
        cubo_email=_env("CUBO_EMAIL"),
        cubo_password=_env("CUBO_PASSWORD"),
        gemini_api_key=_env("GEMINI_API_KEY"),
        gemini_model=_env("GEMINI_MODEL", "gemini-2.5-flash"),
        startup_batch_size=_env_int("STARTUP_BATCH_SIZE", 5),
        gemini_max_retries=_env_int("GEMINI_MAX_RETRIES", 3),
        gemini_delay_between_batches=_env_float("GEMINI_DELAY_BETWEEN_BATCHES_SECONDS", 2.0),
        headless=_env_bool("HEADLESS"),
        selenium_timeout=int(_env("SELENIUM_TIMEOUT", "15")),
        request_delay=float(_env("REQUEST_DELAY", "1.5")),
        supabase_url=_env("SUPABASE_URL"),
        supabase_service_role_key=_env("SUPABASE_SERVICE_ROLE_KEY"),
    )
