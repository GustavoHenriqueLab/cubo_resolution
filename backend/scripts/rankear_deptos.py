"""Ranqueamento de startups por departamento + analise dos destaques LAB.

Pede ao Gemini para:
1. Rankear startups dentro de cada departamento (1 = mais relevante)
2. Fornecer analise para os destaques LAB que nao tinham
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

ARQUIVO_SAIDA = Path(__file__).resolve().parent.parent / "data" / "processed" / "departamentos_startups.json"

SYSTEM_PROMPT_RANK = (
    f"{AVISO_DADOS_PUBLICOS}\n\n"
    "---\n\n"
    f"{CONTEXTO_COMPLETO}\n\n"
    "---\n\n"
    "Voce recebera uma lista de startups associadas a UM unico departamento "
    "da LAB Medicina Diagnostica. Sua tarefa e RANQUEAR essas startups da "
    "MAIS relevante (rank 1) para a MENOS relevante (ultimo rank) para a LAB, "
    "considerando:\n\n"
    "- Impacto real e imediato que a solucao traria para a LAB\n"
    "- Aderencia ao contexto especifico da LAB (4 unidades, Brasilia, patologia)\n"
    "- Maturidade da solucao e facilidade de integracao\n"
    "- Custo-beneficio e viabilidade de implementacao\n\n"
    "ATENCAO: Mantenha o nivel de confianca (alta/media) ja definido. "
    "Apenas ADICIONE o campo \"rank\" (numero inteiro, 1 = melhor).\n\n"
    "NAO altere os campos existentes. Retorne o JSON completo com o campo \"rank\" adicionado.\n\n"
    "Formato:\n"
    '{"startups": [{"nome": "...", "confianca": "alta", "rank": 1, ...todos os campos originais...}, ...]}\n\n'
    "Ordene o array de saida pelo rank (1 primeiro)."
)


def _dividir_em_lotes(itens, tamanho):
    for indice in range(0, len(itens), tamanho):
        yield itens[indice:indice + tamanho]


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

    deptos = dados.get("departamentos", {})
    client = GeminiClient(
        api_key=config.gemini_api_key,
        model_name=config.gemini_model,
        max_retries=config.gemini_max_retries,
    )
    client._system_prompt = SYSTEM_PROMPT_RANK

    total_deptos = len(DEPARTAMENTOS)

    for idx, depto_nome in enumerate(DEPARTAMENTOS, 1):
        startups = deptos.get(depto_nome, [])
        if not startups:
            continue

        print(f"\n[{idx}/{total_deptos}] {depto_nome}: {len(startups)} startups")

        # Envia em lotes de 30 (rankear é mais leve que análise completa)
        lotes = list(_dividir_em_lotes(startups, 30))
        todas_rankeadas = []

        for lote_idx, lote in enumerate(lotes, 1):
            nomes = [s["nome"] for s in lote]
            print(f"  Lote {lote_idx}/{len(lotes)}: {len(lote)} startups — {nomes[0]}...")

            # Monta prompt simples: só a lista de startups
            blocos = []
            for i, s in enumerate(lote, 1):
                blocos.append(
                    f"{i}. {s['nome']} | Confianca: {s.get('confianca','-')} | "
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
                _salvar(dados)
                return
            except (GeminiTemporaryRateLimit, GeminiQuotaError) as exc:
                print(f"\n[ERRO COTA] {exc}")
                _salvar(dados)
                return
            except Exception as exc:
                print(f"  [!] Erro: {exc}")
                continue

            # Merge ranks
            ranks_recebidos = {}
            for s in resposta.get("startups", []):
                nome = s.get("nome", "")
                rank = s.get("rank")
                if nome and rank is not None:
                    ranks_recebidos[nome] = int(rank)

            # Aplica ranks
            for s in lote:
                if s["nome"] in ranks_recebidos:
                    s["rank"] = ranks_recebidos[s["nome"]]

            todas_rankeadas.extend(lote)

            if config.gemini_delay_between_batches > 0 and lote_idx < len(lotes):
                time.sleep(config.gemini_delay_between_batches)

        # Ordena por rank (menor = melhor)
        todas_rankeadas.sort(key=lambda x: x.get("rank", 9999))
        deptos[depto_nome] = todas_rankeadas
        _salvar(dados)
        print(f"  Salvo: {len(todas_rankeadas)} startups ranqueadas.")

    _salvar(dados)
    print("\nRanqueamento concluido!")


if __name__ == "__main__":
    executar()
