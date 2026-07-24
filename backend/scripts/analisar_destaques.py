"""Analisa e rankeia os destaques LAB via Gemini.

Envia as startups (com dados completos) pedindo ranqueamento e analise
especifica sobre porque cada uma e destaque para a LAB.
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

ARQUIVO_STARTUPS = Path(__file__).resolve().parent.parent / "data" / "raw" / "startups_cubo.json"
ARQUIVO_SAIDA = Path(__file__).resolve().parent.parent / "data" / "processed" / "departamentos_startups.json"
BATCH = 10

SYSTEM_PROMPT = (
    f"{AVISO_DADOS_PUBLICOS}\n\n---\n\n{CONTEXTO_COMPLETO}\n\n---\n\n"
    "Voce recebera um lote de startups que foram pre-selecionadas como "
    "DESTAQUES para a LAB Medicina Diagnostica. Cada startup vem com nome, "
    "descricao, segmento e tecnologias.\n\n"
    "Sua tarefa para CADA startup:\n"
    "1. Atribuir um RANK dentro deste lote (1 = mais relevante para LAB)\n"
    "2. Escrever uma ANALISE de 2-3 frases explicando POR QUE esta startup "
    "merece ser destaque para a LAB especificamente — qual dor resolve, "
    "qual o valor concreto para a realidade da LAB (4 unidades, Brasilia, "
    "foco em patologia, 200+ exames)\n\n"
    "Seja ESPECIFICO sobre a LAB. Nao use descricoes genericas de 'laboratorios'.\n\n"
    "Retorne APENAS JSON:\n"
    '{"startups": [\n'
    '  {"nome": "...", "rank": 1, "analise": "Analise especifica para LAB..."},\n'
    '  ...\n'
    "]}\n\n"
    "Ordene pelo rank (1 primeiro)."
)


def _salvar(dados):
    tmp = ARQUIVO_SAIDA.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)
    tmp.replace(ARQUIVO_SAIDA)


def executar():
    config = load_config()
    if not config.gemini_api_key:
        print("ERRO: GEMINI_API_KEY nao configurada.")
        sys.exit(1)

    with open(ARQUIVO_SAIDA, encoding="utf-8") as f:
        dados = json.load(f)

    with open(ARQUIVO_STARTUPS, encoding="utf-8") as f:
        raw = json.load(f)

    mapa_raw = {s["nome"]: s for s in raw}
    destaques = dados.get("destaque_lab", [])
    print(f"Destaques a analisar: {len(destaques)}")

    client = genai.Client(api_key=config.gemini_api_key)
    model = config.gemini_model

    todas_analises: dict[str, dict] = {}
    base_rank = 0

    for inicio in range(0, len(destaques), BATCH):
        fim = min(inicio + BATCH, len(destaques))
        lote = destaques[inicio:fim]
        print(f"\nLote {inicio//BATCH + 1}: {len(lote)} startups — {lote[0]}...")

        blocos = []
        for nome in lote:
            r = mapa_raw.get(nome, {})
            blocos.append(
                f"Nome: {nome}\n"
                f"Descricao: {r.get('descricao', '')[:300]}\n"
                f"Segmento: {r.get('segmento', 'N/I')}\n"
                f"Tecnologias: {', '.join(r.get('tecnologias', []))}\n"
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
                response = client.models.generate_content(
                    model=model, contents=prompt, config=cfg
                )
                texto = response.text.strip()
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

    dados["destaque_lab_analises"] = [
        {"nome": nome, "rank": i + 1, "analise": info["analise"]}
        for i, (nome, info) in enumerate(analises_ordenadas)
    ]

    _salvar(dados)
    print(f"\nSalvo! {len(dados['destaque_lab_analises'])} destaques com analise e rank.")


if __name__ == "__main__":
    executar()
