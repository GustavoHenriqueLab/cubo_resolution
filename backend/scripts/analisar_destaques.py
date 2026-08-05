"""Analisa e rankeia os destaques LAB via Gemini (Supabase).

Envia as startups com dados completos pedindo ranqueamento e analise
especifica sobre porque cada uma e destaque para a LAB.
Atualiza a tabela destaques_lab.
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from google import genai
from google.genai import types

from cubo.config import load_config
from cubo.gemini import GeminiDailyQuotaExceeded, GeminiTemporaryRateLimit, GeminiQuotaError
from cubo.empresa import CONTEXTO_COMPLETO, AVISO_DADOS_PUBLICOS
from cubo.supabase_client import criar_cliente_supabase

BATCH = 10

SYSTEM_PROMPT = (
    f"{AVISO_DADOS_PUBLICOS}\n\n---\n\n{CONTEXTO_COMPLETO}\n\n---\n\n"
    "Voce recebera um lote de startups que foram pre-selecionadas como "
    "DESTAQUES para a LAB Medicina Diagnostica.\n\n"
    "Sua tarefa para CADA startup:\n"
    "1. Atribuir um RANK (1 = mais relevante para LAB)\n"
    "2. Escrever uma ANALISE de 2-3 frases explicando POR QUE esta startup "
    "merece ser destaque\n\n"
    "Seja ESPECIFICO sobre a LAB. Nao use descricoes genericas.\n\n"
    "Retorne APENAS JSON:\n"
    '{"startups": [{"nome": "...", "rank": 1, "analise": "..."}]}\n\n'
    "Ordene pelo rank (1 primeiro)."
)


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
            "type": "destaques",
            "status": "running",
            "started_at": "now()",
        }).execute()
        execution_id = exec_resp.data[0]["id"] if exec_resp.data else None
    except Exception:
        execution_id = None

    # Busca destaques com dados das startups
    response = supabase.table("destaques_lab").select(
        "id, startup_id, startup:startups(nome, descricao, segmento, tecnologias)"
    ).execute()

    if not response.data:
        print("Nenhum destaque encontrado.")
        _finalizar(supabase, execution_id, "completed")
        return

    destaques = response.data
    nomes_destaques = [d["startup"]["nome"] for d in destaques]
    print(f"Destaques a analisar: {len(destaques)}")

    client = genai.Client(api_key=config.gemini_api_key)
    model = config.gemini_model

    todas_analises: dict[str, dict] = {}
    base_rank = 0

    for inicio in range(0, len(destaques), BATCH):
        fim = min(inicio + BATCH, len(destaques))
        lote = destaques[inicio:fim]
        nomes_lote = [d["startup"]["nome"] for d in lote]
        print(f"\nLote {inicio//BATCH + 1}: {len(lote)} startups — {nomes_lote[0]}...")

        blocos = []
        for d in lote:
            s = d["startup"]
            blocos.append(
                f"Nome: {s['nome']}\n"
                f"Descricao: {s.get('descricao', '')[:300]}\n"
                f"Segmento: {s.get('segmento', 'N/I')}\n"
                f"Tecnologias: {', '.join(s.get('tecnologias', []))}\n"
                "---"
            )

        prompt = (
            "Analise e ranqueie estas startups como destaques para a LAB:\n\n"
            + "\n".join(blocos)
            + "\n\nRetorne JSON com rank e analise para cada uma."
        )

        cfg = types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.1,
            max_output_tokens=8192,
        )

        for tentativa in range(1, config.gemini_max_retries + 1):
            try:
                response_gemini = client.models.generate_content(
                    model=model, contents=prompt, config=cfg
                )
                texto = response_gemini.text.strip()
                if texto.startswith("```json"):
                    texto = texto[7:]
                elif texto.startswith("```"):
                    texto = texto[3:]
                if texto.endswith("```"):
                    texto = texto[:-3]

                resp = json.loads(texto.strip())
                for s in resp.get("startups", []):
                    nome = s.get("nome", "")
                    if nome:
                        todas_analises[nome] = {
                            "rank_lote": s.get("rank", 999) + base_rank,
                            "analise": s.get("analise", ""),
                        }
                break
            except json.JSONDecodeError:
                print(f"  [!] JSON invalido (tentativa {tentativa})")
                continue
            except Exception as exc:
                erro = str(exc)
                if "429" in erro or "RESOURCE_EXHAUSTED" in erro:
                    if "PerDay" in erro:
                        print(f"\n[COTA DIARIA] {erro[:200]}")
                        break
                    if tentativa < config.gemini_max_retries:
                        wait = min(90, (2 ** tentativa) * 20)
                        print(f"  Limite temp, aguardando {wait}s...")
                        time.sleep(wait)
                        continue
                print(f"  [!] Erro: {erro[:200]}")
                break

        base_rank += len(lote)
        print(f"  Analisados: {len(todas_analises)}/{len(destaques)}")

        if config.gemini_delay_between_batches > 0:
            time.sleep(config.gemini_delay_between_batches)

    analises_ordenadas = sorted(
        todas_analises.items(), key=lambda x: x[1]["rank_lote"]
    )

    # Atualiza destaques_lab no Supabase
    for i, (nome, info) in enumerate(analises_ordenadas):
        for d in destaques:
            if d["startup"]["nome"] == nome:
                try:
                    supabase.table("destaques_lab").update({
                        "rank": i + 1,
                        "analise": info["analise"],
                        "batch_id": execution_id,
                    }).eq("id", d["id"]).execute()
                except Exception as e:
                    print(f"  [!] Erro ao atualizar destaque {nome}: {e}")
                break

    _finalizar(supabase, execution_id, "completed")
    print(f"\nSalvo! {len(analises_ordenadas)} destaques com analise e rank.")


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
