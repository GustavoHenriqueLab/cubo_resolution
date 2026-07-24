"""Associa startups do Cubo Itau aos departamentos usando Google Gemini.

Orquestra o pipeline:
1. Carrega as startups do JSON.
2. Usa ``cubo.gemini.GeminiClient`` para classificar em lotes com analise.
3. Salva progresso incremental em ``data/processed/departamentos_startups.json``.
4. Ao retomar, pula startups ja processadas.
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

ARQUIVO_STARTUPS = Path(__file__).resolve().parent.parent / "data" / "raw" / "startups_cubo.json"
ARQUIVO_SAIDA = Path(__file__).resolve().parent.parent / "data" / "processed" / "departamentos_startups.json"


def _dividir_em_lotes(itens: list, tamanho: int):
    """Divide uma lista em lotes de tamanho fixo."""
    if tamanho <= 0:
        raise ValueError("O tamanho do lote deve ser maior que zero.")
    for indice in range(0, len(itens), tamanho):
        yield itens[indice:indice + tamanho]


def _carregar_progresso() -> tuple[dict, set[str]]:
    """Carrega resultados anteriores para evitar reprocessamento.

    Returns:
        Tupla (resultado_anterior, nomes_ja_processados).
    """
    resultado: dict[str, list[dict]] = {d: [] for d in DEPARTAMENTOS}
    destaques_lab: list[str] = []
    nomes_processados: set[str] = set()

    if ARQUIVO_SAIDA.exists():
        try:
            with open(ARQUIVO_SAIDA, encoding="utf-8") as f:
                dados = json.load(f)
            resultado = {d: dados.get("departamentos", {}).get(d, []) for d in DEPARTAMENTOS}
            destaques_lab = dados.get("destaque_lab", [])
            for startups in resultado.values():
                for s in startups:
                    nomes_processados.add(s["nome"])
            print(f"Progresso anterior: {len(nomes_processados)} startups ja processadas.")
        except Exception:
            print("Aviso: nao foi possivel carregar progresso anterior. Iniciando do zero.")

    return {"departamentos": resultado, "destaque_lab": destaques_lab}, nomes_processados


def _salvar_progresso(resultado: dict) -> None:
    """Salva o resultado atual no disco de forma atomica."""
    tmp = ARQUIVO_SAIDA.with_suffix(".tmp")
    try:
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(resultado, f, ensure_ascii=False, indent=2)
        tmp.replace(ARQUIVO_SAIDA)
    except Exception:
        print("  [!] Aviso: nao foi possivel salvar progresso.")


def _imprimir_relatorio(resultado: dict) -> None:
    """Exibe o sumario da classificacao no terminal."""
    deptos = resultado.get("departamentos", {})
    destaques = resultado.get("destaque_lab", [])

    total_startups_processadas = len({
        s["nome"] for startups in deptos.values() for s in startups
    })

    print(f"\n{'=' * 55}")
    print("  ASSOCIACAO DEPARTAMENTOS x STARTUPS (Gemini + Analise LAB)")
    print(f"{'=' * 55}")
    print(f"  Startups processadas  : {total_startups_processadas}")
    print(f"  Destaques LAB          : {len(destaques)}")
    print(f"  Arquivo                : {ARQUIVO_SAIDA}")
    print(f"{'=' * 55}\n")

    if destaques:
        print("--- Destaques para LAB ---")
        for nome in destaques[:20]:
            print(f"  * {nome}")
        if len(destaques) > 20:
            print(f"  ... +{len(destaques) - 20} mais")
        print()

    for depto in DEPARTAMENTOS:
        matches = deptos.get(depto, [])
        altas = sum(1 for m in matches if m.get("confianca") == "alta")
        print(f"--- {depto}: {len(matches)} startups ({altas} alta confianca) ---")
        for m in matches[:8]:
            marca = "***" if m.get("confianca") == "alta" else "  "
            aderencia = m.get("aderencia_lab", "-")
            print(f"  {marca} {m['nome']}  [aderencia LAB: {aderencia}]")
        if len(matches) > 8:
            print(f"  ... +{len(matches) - 8} mais")
        print()


def _ordenar_resultados(resultado: dict) -> None:
    """Ordena startups dentro de cada departamento: alta confianca primeiro."""
    deptos = resultado.get("departamentos", {})
    for depto in deptos:
        deptos[depto].sort(
            key=lambda x: (0 if x.get("confianca") == "alta" else 1, x["nome"].lower())
        )


def executar() -> None:
    """Executa o pipeline completo de classificacao com analise."""
    config = load_config()

    if not config.gemini_api_key:
        print("ERRO: GEMINI_API_KEY nao configurada no .env")
        sys.exit(1)

    print(f"Modelo Gemini: {config.gemini_model}")
    print(f"Tamanho do lote: {config.startup_batch_size}")
    print(f"Max retries: {config.gemini_max_retries}")
    print(f"Delay entre lotes: {config.gemini_delay_between_batches}s")
    print()

    client = GeminiClient(
        api_key=config.gemini_api_key,
        model_name=config.gemini_model,
        max_retries=config.gemini_max_retries,
    )

    with open(ARQUIVO_STARTUPS, encoding="utf-8") as f:
        startups = json.load(f)

    # Carrega progresso anterior
    resultado, nomes_processados = _carregar_progresso()
    destaques_lab: list[str] = resultado.get("destaque_lab", [])

    # Filtra apenas startups pendentes
    pendentes = [s for s in startups if s["nome"] not in nomes_processados]
    total = len(startups)
    pendentes_count = len(pendentes)

    if pendentes_count == 0:
        print("Todas as startups ja foram processadas.")
        _ordenar_resultados(resultado)
        _imprimir_relatorio(resultado)
        return

    print(f"Total de startups: {total}")
    print(f"Ja processadas: {total - pendentes_count}")
    print(f"Pendentes: {pendentes_count}")
    print()

    lotes = list(_dividir_em_lotes(pendentes, config.startup_batch_size))
    total_lotes = len(lotes)
    processados_nesta_execucao = 0

    for idx_lote, lote in enumerate(lotes, 1):
        nomes_lote = [s["nome"] for s in lote]
        print(
            f"Lote {idx_lote}/{total_lotes}: "
            f"processando {len(lote)} startup(s) -- {nomes_lote[0]}..."
        )

        try:
            resposta = client.classificar_lote(lote)
        except GeminiDailyQuotaExceeded as exc:
            print(f"\n  [COTA DIARIA] {exc}")
            print(f"  Progresso salvo: {len(nomes_processados) + processados_nesta_execucao} startups.")
            _salvar_progresso(resultado)
            _ordenar_resultados(resultado)
            _imprimir_relatorio(resultado)
            sys.exit(0)
        except (GeminiTemporaryRateLimit, GeminiQuotaError) as exc:
            print(f"\n  [ERRO COTA] {exc}")
            print(f"  Salvando progresso e interrompendo...")
            _salvar_progresso(resultado)
            _ordenar_resultados(resultado)
            _imprimir_relatorio(resultado)
            sys.exit(1)
        except Exception as exc:
            print(f"  [!] Erro nao recuperavel: {exc}")
            _salvar_progresso(resultado)
            print(f"  Progresso salvo. Corrija o erro e execute novamente.")
            sys.exit(1)

        # Coleta destaques_lab deste lote
        destaques = resposta.get("destaque_lab", [])
        for nome in destaques:
            if nome not in destaques_lab:
                destaques_lab.append(nome)

        # Processa classificacoes
        classificacoes = resposta.get("startups", [])
        for c in classificacoes:
            nome = c.get("nome", "")
            deptos = c.get("departamentos", [])
            for d in deptos:
                depto_nome = d.get("departamento", "")
                if depto_nome in resultado["departamentos"]:
                    resultado["departamentos"][depto_nome].append({
                        "nome": nome,
                        "confianca": d.get("confianca", "media"),
                        "aderencia_lab": d.get("aderencia_lab", "media"),
                        "analise": d.get("analise", ""),
                        "avaliacao": d.get("avaliacao", {}),
                    })

        resultado["destaque_lab"] = destaques_lab
        processados_nesta_execucao += len(lote)
        nomes_processados.update(nomes_lote)

        # Salva progresso apos cada lote
        _salvar_progresso(resultado)
        print(
            f"  [OK] Salvo. Progresso: "
            f"{len(nomes_processados)}/{total} startups."
        )

        # Delay entre lotes (exceto no ultimo)
        if idx_lote < total_lotes and config.gemini_delay_between_batches > 0:
            time.sleep(config.gemini_delay_between_batches)

    _ordenar_resultados(resultado)
    _salvar_progresso(resultado)
    _imprimir_relatorio(resultado)
    print("Processamento concluido com sucesso!")


if __name__ == "__main__":
    executar()
