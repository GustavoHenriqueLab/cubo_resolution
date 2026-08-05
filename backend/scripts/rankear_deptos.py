"""Ranqueamento de startups por departamento (Supabase).

Pede ao Gemini para rankear startups dentro de cada departamento.
Atualiza a coluna rank na tabela startup_departamentos.
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from cubo.config import load_config
from cubo.gemini import (
    DEPARTAMENTOS,
    GeminiClient,
    GeminiDailyQuotaExceeded,
    GeminiTemporaryRateLimit,
    GeminiQuotaError,
)
from cubo.empresa import CONTEXTO_COMPLETO, AVISO_DADOS_PUBLICOS
from cubo.supabase_client import criar_cliente_supabase

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
SLUG_TO_DEPTO = {v: k for k, v in SLUG_MAP.items()}

SYSTEM_PROMPT_RANK = (
    f"{AVISO_DADOS_PUBLICOS}\n\n"
    "---\n\n"
    f"{CONTEXTO_COMPLETO}\n\n"
    "---\n\n"
    "Voce recebera uma lista de startups associadas a UM unico departamento "
    "da LAB Medicina Diagnostica. Sua tarefa e RANQUEAR essas startups da "
    "MAIS relevante (rank 1) para a MENOS relevante (ultimo rank) para a LAB.\n\n"
    "Retorne JSON:\n"
    '{"startups": [{"nome": "...", "rank": 1}, ...]}'
)


def _dividir_em_lotes(itens, tamanho):
    for indice in range(0, len(itens), tamanho):
        yield itens[indice:indice + tamanho]


def executar():
    config = load_config()
    if not config.gemini_api_key:
        print("ERRO: GEMINI_API_KEY nao configurada.")
        sys.exit(1)
    if not config.supabase_url or not config.supabase_service_role_key:
        print("ERRO: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nao configurados.")
        sys.exit(1)

    supabase = criar_cliente_supabase(config.supabase_url, config.supabase_service_role_key)

    # Marca execucao
    try:
        exec_resp = supabase.table("pipeline_executions").insert({
            "type": "ranker",
            "status": "running",
            "started_at": "now()",
        }).execute()
        execution_id = exec_resp.data[0]["id"] if exec_resp.data else None
    except Exception:
        execution_id = None

    client = GeminiClient(
        api_key=config.gemini_api_key,
        model_name=config.gemini_model,
        max_retries=config.gemini_max_retries,
    )
    client._system_prompt = SYSTEM_PROMPT_RANK

    total_deptos = len(DEPARTAMENTOS)

    for idx, depto_nome in enumerate(DEPARTAMENTOS, 1):
        slug = SLUG_MAP.get(depto_nome, "")
        if not slug:
            continue

        # Busca startups deste departamento no Supabase
        response = supabase.table("startup_departamentos").select(
            "id, startup_id, departamento_slug, confianca, aderencia_lab, analise, startup:startups(nome)"
        ).eq("departamento_slug", slug).execute()

        if not response.data:
            continue

        startups = response.data
        print(f"\n[{idx}/{total_deptos}] {depto_nome}: {len(startups)} startups")

        lotes = list(_dividir_em_lotes(startups, 30))
        todas_rankeadas = []
        rank_offset = 0

        for lote_idx, lote in enumerate(lotes, 1):
            nomes_lote = [s["startup"]["nome"] for s in lote]
            print(f"  Lote {lote_idx}/{len(lotes)}: {len(lote)} startups — {nomes_lote[0]}...")

            blocos = []
            for i, s in enumerate(lote, 1):
                startup = s.get("startup", {})
                blocos.append(
                    f"{i}. {startup.get('nome','')} | Confianca: {s.get('confianca','-')} | "
                    f"Aderencia LAB: {s.get('aderencia_lab','-')} | "
                    f"Descricao: {s.get('analise','')[:200]}"
                )

            prompt = (
                f"Departamento: {depto_nome}\n\n"
                "Ranqueie estas startups da mais para a menos relevante para a LAB:\n\n"
                + "\n".join(blocos) +
                "\n\nRetorne JSON com campo rank adicionado."
            )

            try:
                resposta = client.classificar_lote(lote)
            except GeminiDailyQuotaExceeded as exc:
                print(f"\n[COTA DIARIA] {exc}")
                _finalizar(supabase, execution_id, "interrupted")
                return
            except (GeminiTemporaryRateLimit, GeminiQuotaError) as exc:
                print(f"\n[ERRO COTA] {exc}")
                _finalizar(supabase, execution_id, "failed")
                return
            except Exception as exc:
                print(f"  [!] Erro: {exc}")
                continue

            ranks_recebidos = {}
            for s in resposta.get("startups", []):
                nome = s.get("nome", "")
                rank = s.get("rank")
                if nome and rank is not None:
                    ranks_recebidos[nome] = int(rank) + rank_offset

            for s in lote:
                nome = s["startup"]["nome"]
                if nome in ranks_recebidos:
                    new_rank = ranks_recebidos[nome]
                    try:
                        supabase.table("startup_departamentos").update({
                            "rank": new_rank,
                        }).eq("id", s["id"]).execute()
                    except Exception as e:
                        print(f"    [!] Erro ao atualizar rank de {nome}: {e}")

            todas_rankeadas.extend(lote)
            rank_offset += len(lote)

            if config.gemini_delay_between_batches > 0 and lote_idx < len(lotes):
                time.sleep(config.gemini_delay_between_batches)

        print(f"  Salvo: {len(todas_rankeadas)} startups ranqueadas.")

    _finalizar(supabase, execution_id, "completed")
    print("\nRanqueamento concluido!")


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
    executar()
