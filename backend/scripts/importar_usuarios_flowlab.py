"""Importa (espelha) os usuarios ativos do FlowLab para o Supabase do cubo.

One-shot e idempotente: cria no banco do cubo apenas os e-mails que ainda nao
existem, para que o login via FlowLab (espelho de sessao) funcione para todos.
Nao importa senha (o login sempre acontece no banco do FlowLab) nem CPF ou
departamento (dominios diferentes entre os dois sistemas).

Acesso ao FlowLab (backend/.env) — dois modos:
    Modo admin:  FLOWLAB_SUPABASE_URL + FLOWLAB_SERVICE_ROLE_KEY
                 (lista auth.users + user_profiles)
    Modo login:  FLOWLAB_SUPABASE_URL + FLOWLAB_SUPABASE_ANON_KEY
                 + FLOWLAB_IMPORT_EMAIL + FLOWLAB_IMPORT_PASSWORD
                 (entra com um usuario comum e le user_profiles via RLS)

Destino (backend/.env):
    SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (banco do cubo)

Uso:
    python scripts/importar_usuarios_flowlab.py --dry-run
    python scripts/importar_usuarios_flowlab.py
"""

from __future__ import annotations

import argparse
import secrets
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from cubo.config import load_config
from cubo.supabase_client import criar_cliente_supabase

PER_PAGE = 1000
DOMINIO_ANONIMIZADO = "@deleted.flowlab.local"


def listar_usuarios_auth(client) -> list:
    """Lista todos os usuarios do Auth paginando o admin API."""
    usuarios: list = []
    page = 1
    while True:
        lote = client.auth.admin.list_users(page=page, per_page=PER_PAGE)
        if not lote:
            break
        usuarios.extend(lote)
        if len(lote) < PER_PAGE:
            break
        page += 1
    return usuarios


def autenticar_flowlab(flowlab, email: str, senha: str) -> None:
    """Entra no FlowLab com um usuario comum para ler user_profiles via RLS."""
    try:
        resposta = flowlab.auth.sign_in_with_password(
            {"email": email, "password": senha}
        )
    except Exception as erro:
        raise RuntimeError(
            f"Nao foi possivel entrar no FlowLab com {email}: {erro}"
        ) from erro

    if not resposta.session:
        raise RuntimeError(f"Login do FlowLab nao retornou sessao para {email}.")


def listar_perfis_flowlab(flowlab) -> dict[str, dict]:
    """Retorna mapa e-mail (lowercase) -> perfil do FlowLab."""
    resposta = flowlab.table("user_profiles").select("*").execute()
    perfis: dict[str, dict] = {}
    for perfil in resposta.data or []:
        email = (perfil.get("email") or "").strip().lower()
        if email:
            perfis[email] = perfil
    return perfis


def esta_ativo(perfil: dict) -> bool:
    """Ignora perfis soft-deleted, desativados ou com e-mail anonimizado."""
    if perfil.get("deleted_at") or perfil.get("disabled_at"):
        return False
    email = (perfil.get("email") or "").strip().lower()
    return not email.endswith(DOMINIO_ANONIMIZADO)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Apenas mostra o que seria importado, sem criar usuarios.",
    )
    args = parser.parse_args()

    config = load_config()

    if not config.supabase_url or not config.supabase_service_role_key:
        print("ERRO: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nao configurados no backend/.env")
        sys.exit(1)

    if not config.flowlab_supabase_url:
        print("ERRO: FLOWLAB_SUPABASE_URL nao configurado no backend/.env")
        sys.exit(1)

    modo_admin = bool(config.flowlab_service_role_key)

    if modo_admin:
        flowlab = criar_cliente_supabase(
            config.flowlab_supabase_url, config.flowlab_service_role_key
        )
    else:
        if (
            not config.flowlab_supabase_anon_key
            or not config.flowlab_import_email
            or not config.flowlab_import_password
        ):
            print(
                "ERRO: configure FLOWLAB_SERVICE_ROLE_KEY (modo admin) ou "
                "FLOWLAB_SUPABASE_ANON_KEY + FLOWLAB_IMPORT_EMAIL + "
                "FLOWLAB_IMPORT_PASSWORD (modo login) no backend/.env"
            )
            sys.exit(1)

        flowlab = criar_cliente_supabase(
            config.flowlab_supabase_url, config.flowlab_supabase_anon_key
        )
        try:
            autenticar_flowlab(
                flowlab, config.flowlab_import_email, config.flowlab_import_password
            )
        except RuntimeError as erro:
            print(f"ERRO: {erro}")
            sys.exit(1)

    cubo = criar_cliente_supabase(config.supabase_url, config.supabase_service_role_key)

    print("=" * 60)
    print("  IMPORTACAO DE USUARIOS FLOWLAB -> CUBO")
    print("=" * 60)
    print(f"  Origem (flowlab): {config.flowlab_supabase_url}")
    print(f"  Destino (cubo):   {config.supabase_url}")
    if modo_admin:
        print("  Modo: admin (service role)")
    else:
        print(f"  Modo: login ({config.flowlab_import_email})")
    if args.dry_run:
        print("  DRY-RUN: nada sera criado")
    print()

    perfis = listar_perfis_flowlab(flowlab)

    if modo_admin:
        emails_origem = [
            (usuario.email or "").strip().lower()
            for usuario in listar_usuarios_auth(flowlab)
        ]
    else:
        emails_origem = list(perfis.keys())

    emails_cubo = {
        (usuario.email or "").strip().lower() for usuario in listar_usuarios_auth(cubo)
    }

    importados = 0
    existentes = 0
    inativos = 0
    sem_perfil = 0
    erros = 0

    for email in emails_origem:
        if not email:
            continue

        perfil = perfis.get(email)
        if perfil is None:
            sem_perfil += 1
            print(f"  [!] Sem perfil no flowlab: {email}")
            continue

        if not esta_ativo(perfil):
            inativos += 1
            continue

        if email in emails_cubo:
            existentes += 1
            continue

        nome = (perfil.get("name") or "").strip() or email

        if args.dry_run:
            importados += 1
            print(f"  [dry-run] criaria: {email} ({nome})")
            continue

        try:
            resposta = cubo.auth.admin.create_user(
                {
                    "email": email,
                    "password": secrets.token_urlsafe(24),
                    "email_confirm": True,
                    "user_metadata": {"nome": nome, "importado_do_flowlab": True},
                }
            )
        except Exception as erro:
            erros += 1
            print(f"  [!] Erro ao criar {email}: {erro}")
            continue

        # Garante o perfil no cubo (o trigger handle_new_user normalmente ja cria).
        try:
            cubo.table("profiles").upsert(
                {"id": resposta.user.id, "nome": nome, "role": "viewer"},
                on_conflict="id",
            ).execute()
        except Exception as erro:
            print(f"  [!] Perfil nao gravado para {email}: {erro}")

        importados += 1
        print(f"  [+] Importado: {email} ({nome})")

    print()
    print("=" * 60)
    print("  RESUMO")
    print("=" * 60)
    print(f"  Usuarios na origem: {len(emails_origem)}")
    print(f"  Inativos (ignorados): {inativos}")
    print(f"  Sem perfil (ignorados): {sem_perfil}")
    print(f"  Ja existiam no cubo: {existentes}")
    print(f"  {'Seriam importados' if args.dry_run else 'Importados'}: {importados}")
    print(f"  Erros: {erros}")

    if args.dry_run:
        print("\n  Rode sem --dry-run para criar os usuarios.")


if __name__ == "__main__":
    main()
