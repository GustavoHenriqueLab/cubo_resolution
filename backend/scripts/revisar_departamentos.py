"""Revisao direcionada de departamentos com poucas associacoes.

Pede ao Gemini para reanalisar TODAS as startups do banco em busca de
associacoes PERDIDAS nos departamentos alvo, com criterio ampliado mas
exigindo aplicacao real. Grava apenas associacoes novas em
startup_departamentos (nao sobrescreve analises existentes).

Uso:
    python scripts/revisar_departamentos.py
    python scripts/revisar_departamentos.py --deptos biologia-molecular,estoque
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from cubo.config import load_config
from cubo.empresa import AVISO_DADOS_PUBLICOS, CONTEXTO_COMPLETO
from cubo.gemini import (
    DESCRICAO_DEPTOS,
    GeminiClient,
    GeminiDailyQuotaExceeded,
    GeminiQuotaError,
    GeminiTemporaryRateLimit,
)
from cubo.supabase_client import criar_cliente_supabase

SLUG_MAP = {
    "Atendimento": "atendimento",
    "Comercial": "comercial",
    "Qualidade": "qualidade",
    "Transporte": "transporte",
    "Biologia Molecular": "biologia-molecular",
    "Faturamento": "faturamento",
    "RH": "rh",
    "\u00c1rea T\u00e9cnica": "area-tecnica",
    "Estoque": "estoque",
    "Financeiro": "financeiro",
    "TI": "ti",
    "Equipe M\u00e9dica": "equipe-medica",
}
SLUG_TO_DEPTO = {v: k for k, v in SLUG_MAP.items()}

ALVOS_PADRAO = [
    "biologia-molecular",
    "equipe-medica",
    "estoque",
    "faturamento",
    "qualidade",
]

LOTE = 10

CRITERIOS_AMPLIADOS = {
    "Biologia Molecular": (
        "Inclua biotech/molecular com aplicacao laboratorial: PCR/NGS, genetica, "
        "microbiota, biomarcadores, biologia sintetica, farmacogenetica e diagnostico "
        "molecular (humano, veterinario ou ambiental), desde que haja uso em laboratorio."
    ),
    "Equipe M\u00e9dica": (
        "Inclua patologia/anatomia patologica, laudos medicos, telepatologia, "
        "digitalizacao de laminas, IA para diagnostico medico e segunda opiniao."
    ),
    "Estoque": (
        "Inclua gestao de estoque, insumos, almoxarifado, inventario, rastreabilidade "
        "de lotes/validades e logistica de materiais — inclusive ERPs e sistemas com "
        "modulo de estoque."
    ),
    "Faturamento": (
        "Inclua TISS/TUSS, glosas, contas medicas, conciliacao de repasses, faturamento "
        "de planos de saude, auditoria de contas e faturamento SUS."
    ),
    "Qualidade": (
        "Inclua auditoria, conformidade, ISO/BPF, acreditacao laboratorial, nao "
        "conformidades, indicadores e gestao de qualidade — inclusive softwares de "
        "compliance/auditoria."
    ),
}

ARQUIVO_RELATORIO = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "processed"
    / "revisao_departamentos.json"
)


def _normalizar_confianca(valor: str) -> str:
    v = (valor or "").strip().lower()
    if v in ("alta", "media"):
        return v
    if v == "m\u00e9dia":
        return "media"
    return "media"


def _normalizar_aderencia(valor: str) -> str:
    v = (valor or "").strip().lower()
    if v in ("alta", "media", "baixa"):
        return v
    if v == "m\u00e9dia":
        return "media"
    return "media"


def _construir_system_prompt(deptos_alvo: list[str]) -> str:
    prompt = (
        f"{AVISO_DADOS_PUBLICOS}\n\n---\n\n{CONTEXTO_COMPLETO}\n\n---\n\n"
        "ATENCAO: esta e uma REVISAO. Uma analise anterior associou pouquissimas "
        "startups aos departamentos abaixo. Seu trabalho e revisar TODAS as startups "
        "desta lista e identificar quaisquer que TENHAM SIDO PERDIDAS — startups que "
        "DEVERIAM ter sido associadas a estes departamentos mas nao foram.\n\n"
        "Departamentos a revisar:\n\n"
    )
    for depto in deptos_alvo:
        prompt += f"- **{depto}**: {DESCRICAO_DEPTOS[depto]}\n"
        prompt += f"  Criterio ampliado: {CRITERIOS_AMPLIADOS[depto]}\n"

    prompt += (
        "\nINSTRUCOES:\n"
        "- Revise CADA startup da lista. Nao pule nenhuma.\n"
        "- Uma startup pode ser associada a mais de um destes departamentos (ou a nenhum).\n"
        "- Associe quando houver aplicacao real e defensavel, mesmo que nao seja o foco principal.\n"
        "- Nao invente: se nao houver aplicacao plausivel, retorne \"departamentos\": [].\n\n"
        "Retorne APENAS um JSON valido no formato:\n"
        "{\n"
        '  "startups": [\n'
        "    {\n"
        '      "nome": "Nome da Startup",\n'
        '      "departamentos": [\n'
        "        {\n"
        '          "departamento": "Nome do Depto",\n'
        '          "confianca": "alta" ou "media",\n'
        '          "aderencia_lab": "alta" ou "media" ou "baixa",\n'
        '          "analise": "1-2 frases explicando o racional",\n'
        '          "avaliacao": {\n'
        '            "problema_atendido": "1 frase curta",\n'
        '            "aderencia_saude": "1 frase curta",\n'
        '            "maturidade": "1 frase curta",\n'
        '            "integracao": "1 frase curta",\n'
        '            "conformidade": "1 frase curta",\n'
        '            "impacto": "1 frase curta",\n'
        '            "prazo": "1 frase curta",\n'
        '            "riscos": "1 frase curta",\n'
        '            "piloto": "1 frase curta"\n'
        "          }\n"
        "        }\n"
        "      ]\n"
        "    }\n"
        "  ]\n"
        "}\n"
        "MAXIMO 15 palavras por campo de avaliacao. Seja direto."
    )
    return prompt


def _dividir_em_lotes(itens: list, tamanho: int):
    for i in range(0, len(itens), tamanho):
        yield itens[i : i + tamanho]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--deptos",
        default=",".join(ALVOS_PADRAO),
        help="Slugs separados por virgula (default: %(default)s)",
    )
    parser.add_argument("--lote", type=int, default=LOTE)
    args = parser.parse_args()

    slugs = [s.strip() for s in args.deptos.split(",") if s.strip()]
    deptos_alvo = []
    for slug in slugs:
        nome = SLUG_TO_DEPTO.get(slug)
        if not nome:
            print(f"ERRO: slug desconhecido: {slug}")
            sys.exit(1)
        deptos_alvo.append(nome)

    config = load_config()
    if not config.gemini_api_key:
        print("ERRO: GEMINI_API_KEY nao configurada.")
        sys.exit(1)
    if not config.supabase_url or not config.supabase_service_role_key:
        print("ERRO: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nao configurados.")
        sys.exit(1)

    supabase = criar_cliente_supabase(
        config.supabase_url, config.supabase_service_role_key
    )

    startups = supabase.table("startups").select(
        "id, nome, descricao, segmento, tecnologias, modelos_negocio"
    ).execute().data or []
    por_nome = {s["nome"]: s for s in startups}

    existentes = supabase.table("startup_departamentos").select(
        "startup_id, departamento_slug"
    ).execute().data or []
    ja_associadas = {(r["startup_id"], r["departamento_slug"]) for r in existentes}

    execution_id = None
    try:
        exec_resp = supabase.table("pipeline_executions").insert({
            "type": "review",
            "status": "running",
            "started_at": "now()",
        }).execute()
        execution_id = exec_resp.data[0]["id"] if exec_resp.data else None
    except Exception:
        pass

    client = GeminiClient(
        api_key=config.gemini_api_key,
        model_name=config.gemini_model,
        max_retries=config.gemini_max_retries,
    )
    client._system_prompt = _construir_system_prompt(deptos_alvo)

    lotes = list(_dividir_em_lotes(startups, args.lote))
    novas_por_depto: dict[str, list[str]] = {d: [] for d in deptos_alvo}
    total_novas = 0

    print("=" * 60)
    print("  REVISAO DIRECIONADA DE DEPARTAMENTOS")
    print("=" * 60)
    print(f"  Startups: {len(startups)} | lotes: {len(lotes)}")
    print(f"  Departamentos: {', '.join(deptos_alvo)}")
    print()

    for idx, lote in enumerate(lotes, 1):
        nomes = [s["nome"] for s in lote]
        print(f"Lote {idx}/{len(lotes)}: {nomes[0]}...")

        blocos = []
        for i, s in enumerate(lote, 1):
            blocos.append(
                f"--- Startup {i} ---\n"
                f"Nome: {s['nome']}\n"
                f"Descricao: {(s.get('descricao') or '')[:400]}\n"
                f"Segmento: {s.get('segmento') or 'N/I'}\n"
                f"Tecnologias: {', '.join(s.get('tecnologias') or [])}\n"
                f"Modelos de negocio: {', '.join(s.get('modelos_negocio') or [])}\n"
            )
        prompt = (
            "Revise as seguintes startups para os departamentos alvo:\n\n"
            + "\n".join(blocos)
        )

        try:
            resposta = client.classificar_lote(lote, prompt=prompt)
        except GeminiDailyQuotaExceeded as exc:
            print(f"\n  [COTA DIARIA] {exc}")
            _finalizar(supabase, execution_id, "interrupted")
            break
        except (GeminiTemporaryRateLimit, GeminiQuotaError) as exc:
            print(f"\n  [ERRO COTA] {exc}")
            _finalizar(supabase, execution_id, "failed")
            sys.exit(1)
        except Exception as exc:
            print(f"  [!] Erro no lote: {exc}")
            continue

        for item in resposta.get("startups", []):
            nome = item.get("nome", "")
            startup = por_nome.get(nome)
            if not startup:
                continue
            for d in item.get("departamentos", []):
                depto_nome = d.get("departamento", "")
                if depto_nome not in deptos_alvo:
                    continue
                slug = SLUG_MAP[depto_nome]
                chave = (startup["id"], slug)
                if chave in ja_associadas:
                    continue

                try:
                    supabase.table("startup_departamentos").insert({
                        "startup_id": startup["id"],
                        "departamento_slug": slug,
                        "confianca": _normalizar_confianca(d.get("confianca", "media")),
                        "aderencia_lab": _normalizar_aderencia(d.get("aderencia_lab", "media")),
                        "analise": d.get("analise", ""),
                        "avaliacao": d.get("avaliacao", {}),
                    }).execute()
                    ja_associadas.add(chave)
                    novas_por_depto[depto_nome].append(nome)
                    total_novas += 1
                    print(f"    [+] {nome} -> {depto_nome} ({d.get('confianca', 'media')})")
                except Exception as erro:
                    print(f"    [!] Erro ao salvar {nome}/{depto_nome}: {erro}")

        if idx < len(lotes) and config.gemini_delay_between_batches > 0:
            time.sleep(config.gemini_delay_between_batches)

    _finalizar(supabase, execution_id, "completed")

    relatorio = {
        "departamentos": deptos_alvo,
        "total_novas": total_novas,
        "novas": {d: nomes for d, nomes in novas_por_depto.items()},
    }
    ARQUIVO_RELATORIO.parent.mkdir(parents=True, exist_ok=True)
    with open(ARQUIVO_RELATORIO, "w", encoding="utf-8") as f:
        json.dump(relatorio, f, ensure_ascii=False, indent=2)

    print()
    print("=" * 60)
    print("  RESUMO DA REVISAO")
    print("=" * 60)
    print(f"  Novas associacoes: {total_novas}")
    for depto in deptos_alvo:
        print(f"  - {depto}: +{len(novas_por_depto[depto])}")
    print(f"\n  Relatorio: {ARQUIVO_RELATORIO}")


def _finalizar(supabase, execution_id: str | None, status: str) -> None:
    if not execution_id:
        return
    try:
        supabase.table("pipeline_executions").update({
            "status": status,
            "completed_at": "now()",
        }).eq("id", execution_id).execute()
    except Exception:
        pass


if __name__ == "__main__":
    main()
