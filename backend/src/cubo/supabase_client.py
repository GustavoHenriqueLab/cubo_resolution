"""Cliente Supabase para persistência dos pipelines."""

from __future__ import annotations

from supabase import create_client, Client


def criar_cliente_supabase(url: str, service_role_key: str) -> Client:
    """Cria um cliente Supabase com chave service_role (bypass RLS)."""
    if not url or not service_role_key:
        raise ValueError("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios.")
    return create_client(url, service_role_key)
