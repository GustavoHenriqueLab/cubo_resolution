"""Script de migracao one-shot: JSON -> Supabase.

Executar UMA UNICA VEZ apos criar o schema no Supabase.
Le os JSONs locais e popula as tabelas do Supabase.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from cubo.config import load_config
from cubo.supabase_client import criar_cliente_supabase

ARQUIVO_STARTUPS = Path(__file__).resolve().parent.parent / "data" / "raw" / "startups_cubo.json"
ARQUIVO_CLASSIFICACOES = Path(__file__).resolve().parent.parent / "data" / "processed" / "departamentos_startups.json"

SLUG_MAP = {
    "Atendimento": "atendimento",
    "Comercial": "comercial",
    "Qualidade": "qualidade",
    "Transporte": "transporte",
    "Biologia Molecular": "biologia-molecular",
    "Faturamento": "faturamento",
    "RH": "rh",
    "Área Técnica": "area-tecnica",
    "Estoque": "estoque",
    "Financeiro": "financeiro",
    "TI": "ti",
    "Equipe Médica": "equipe-medica",
}


def _normalizar_confianca(valor: str) -> str:
    """Normaliza confianca para os valores permitidos (alta, media)."""
    v = valor.strip().lower()
    if v == "alta":
        return "alta"
    if v == "média":
        return "media"
    return "media"  # fallback: "baixa", inválidos, etc.


def _normalizar_aderencia(valor: str | None) -> str | None:
    """Normaliza aderencia_lab para os valores permitidos (alta, media, baixa)."""
    if not valor:
        return None
    v = valor.strip().lower()
    if v in ("alta", "media", "baixa"):
        return v
    if v == "média":
        return "media"
    return None


def migrar_startups(supabase) -> dict[str, str]:
    """Migra startups do JSON para o Supabase. Retorna mapa nome -> UUID."""
    print("=" * 60)
    print("  MIGRANDO STARTUPS")
    print("=" * 60)

    with open(ARQUIVO_STARTUPS, encoding="utf-8") as f:
        startups = json.load(f)

    print(f"  Total: {len(startups)} startups no JSON")
    nome_para_id: dict[str, str] = {}

    for i, s in enumerate(startups, 1):
        try:
            response = supabase.table("startups").upsert({
                "nome": s["nome"],
                "descricao": s.get("descricao", ""),
                "segmento": s.get("segmento", ""),
                "fundadores": s.get("fundadores", ""),
                "site": s.get("site", ""),
                "url_perfil": s.get("url_perfil", ""),
                "modelos_negocio": s.get("modelos_negocio", []),
                "tecnologias": s.get("tecnologias", []),
                "data_adicionado": s.get("data_adicionado"),
            }, on_conflict="nome").execute()

            if response.data:
                nome_para_id[s["nome"]] = response.data[0]["id"]

        except Exception as e:
            print(f"  [!] Erro em {s['nome']}: {e}")
            continue

        if i % 50 == 0:
            print(f"  Progresso: {i}/{len(startups)}")

    print(f"  Migradas: {len(nome_para_id)} startups")
    return nome_para_id


def migrar_classificacoes(supabase, nome_para_id: dict[str, str]):
    """Migra classificacoes do JSON para o Supabase."""
    print("\n" + "=" * 60)
    print("  MIGRANDO CLASSIFICACOES")
    print("=" * 60)

    with open(ARQUIVO_CLASSIFICACOES, encoding="utf-8") as f:
        dados = json.load(f)

    deptos = dados.get("departamentos", {})
    destaques = dados.get("destaque_lab", [])
    destaques_analises = dados.get("destaque_lab_analises", [])

    total_inseridas = 0

    for depto_nome, startups in deptos.items():
        slug = SLUG_MAP.get(depto_nome, "")
        if not slug:
            print(f"  [!] Departamento desconhecido: {depto_nome}")
            continue

        print(f"  {depto_nome}: {len(startups)} startups")

        for s in startups:
            nome = s.get("nome", "")
            startup_id = nome_para_id.get(nome)
            if not startup_id:
                print(f"    [!] Startup nao encontrada: {nome}")
                continue

            try:
                supabase.table("startup_departamentos").upsert({
                    "startup_id": startup_id,
                    "departamento_slug": slug,
                    "confianca": _normalizar_confianca(s.get("confianca", "media")),
                    "aderencia_lab": _normalizar_aderencia(s.get("aderencia_lab")),
                    "analise": s.get("analise", ""),
                    "avaliacao": s.get("avaliacao", {}),
                    "rank": s.get("rank"),
                }, on_conflict="startup_id,departamento_slug").execute()
                total_inseridas += 1
            except Exception as e:
                print(f"    [!] Erro em {nome}: {e}")

    print(f"  Total de classificacoes: {total_inseridas}")

    # Destaques LAB
    print(f"\n  Destaques LAB: {len(destaques)}")

    destaques_map = {}
    for da in destaques_analises:
        destaques_map[da["nome"]] = da

    for nome in destaques:
        startup_id = nome_para_id.get(nome)
        if not startup_id:
            print(f"    [!] Destaque nao encontrado: {nome}")
            continue

        info = destaques_map.get(nome, {})
        try:
            supabase.table("destaques_lab").insert({
                "startup_id": startup_id,
                "rank": info.get("rank", 999),
                "analise": info.get("analise", ""),
            }).execute()
        except Exception as e:
            err_msg = str(e)
            if "duplicate key" in err_msg.lower() or "23505" in err_msg:
                continue  # ja existe
            print(f"    [!] Erro no destaque {nome}: {e}")

    print(f"  Destaques migrados: {len(destaques)}")


def main():
    config = load_config()

    if not config.supabase_url or not config.supabase_service_role_key:
        print("ERRO: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nao configurados no .env")
        sys.exit(1)

    supabase = criar_cliente_supabase(config.supabase_url, config.supabase_service_role_key)

    print("Iniciando migracao JSON -> Supabase...")
    print(f"Supabase URL: {config.supabase_url}")
    print()

    nome_para_id = migrar_startups(supabase)
    migrar_classificacoes(supabase, nome_para_id)

    print("\n" + "=" * 60)
    print("  MIGRACAO CONCLUIDA!")
    print("=" * 60)


if __name__ == "__main__":
    main()
