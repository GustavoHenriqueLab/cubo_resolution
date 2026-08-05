"""Associa startups do Cubo Itau aos departamentos usando Google Gemini.

Orquestra o pipeline:
1. Carrega as startups do Supabase.
2. Usa ``cubo.gemini.GeminiClient`` para classificar em lotes com analise.
3. Salva progresso incremental no Supabase (startup_departamentos).
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


def _dividir_em_lotes(itens: list, tamanho: int):
    """Divide uma lista em lotes de tamanho fixo."""
    if tamanho <= 0:
        raise ValueError("O tamanho do lote deve ser maior que zero.")
    for indice in range(0, len(itens), tamanho):
        yield itens[indice:indice + tamanho]


def _carregar_progresso(supabase) -> tuple[set[str], list[str], str | None]:
    """Carrega nomes ja processados e destaques existentes do Supabase."""
    nomes_processados: set[str] = set()
    destaques_lab: list[str] = []
    execution_id: str | None = None

    try:
        # Nomes ja classificados
        response = supabase.table("startup_departamentos").select("startup:startups(nome)").execute()
        for row in response.data:
            startup = row.get("startup", {})
            if startup and startup.get("nome"):
                nomes_processados.add(startup["nome"])

        # Destaques ja existentes
        dest_response = supabase.table("destaques_lab").select("startup:startups(nome)").execute()
        for row in dest_response.data:
            startup = row.get("startup", {})
            if startup and startup.get("nome"):
                destaques_lab.append(startup["nome"])

        print(f"Progresso anterior: {len(nomes_processados)} startups ja classificadas, {len(destaques_lab)} destaques.")
    except Exception as e:
        print(f"Aviso: nao foi possivel carregar progresso: {e}")

    # Marca pipeline como running
    try:
        exec_response = supabase.table("pipeline_executions").insert({
            "type": "classifier",
            "status": "running",
            "started_at": "now()",
        }).execute()
        execution_id = exec_response.data[0]["id"] if exec_response.data else None
    except Exception:
        pass

    return nomes_processados, destaques_lab, execution_id


def _salvar_classificacao(supabase, nome: str, depto_nome: str, dados: dict, startup_id: str, batch_id: str | None = None) -> None:
    """Insere ou atualiza uma classificacao no Supabase."""
    slug = SLUG_MAP.get(depto_nome, "")
    if not slug:
        return

    try:
        supabase.table("startup_departamentos").upsert({
            "startup_id": startup_id,
            "departamento_slug": slug,
            "confianca": dados.get("confianca", "media"),
            "aderencia_lab": dados.get("aderencia_lab", "media"),
            "analise": dados.get("analise", ""),
            "avaliacao": dados.get("avaliacao", {}),
        }, on_conflict="startup_id,departamento_slug").execute()
    except Exception as e:
        print(f"  [!] Erro ao salvar {nome} no depto {depto_nome}: {e}")


def _salvar_destaque(supabase, nome: str, startup_id: str, batch_id: str | None) -> None:
    """Insere um destaque LAB no Supabase (rank temporario, sera atualizado depois)."""
    try:
        # Verifica se ja existe
        existing = supabase.table("destaques_lab").select("id").eq("startup_id", startup_id).execute()
        if not existing.data:
            supabase.table("destaques_lab").insert({
                "startup_id": startup_id,
                "rank": 999,  # placeholder
                "batch_id": batch_id,
            }).execute()
    except Exception as e:
        print(f"  [!] Erro ao salvar destaque {nome}: {e}")


def _buscar_startup_id(supabase, nome: str) -> str | None:
    """Busca o UUID de uma startup pelo nome."""
    try:
        response = supabase.table("startups").select("id").eq("nome", nome).execute()
        if response.data:
            return response.data[0]["id"]
    except Exception:
        pass
    return None


def _imprimir_relatorio(supabase) -> None:
    """Exibe o sumario da classificacao."""
    try:
        response = supabase.table("startup_departamentos").select("departamento_slug, confianca, startup:startups(nome)").execute()
        deptos_count = {slug: {"total": 0, "alta": 0} for slug in SLUG_MAP.values()}
        nomes = set()
        for row in response.data:
            deptos_count[row["departamento_slug"]]["total"] += 1
            if row["confianca"] == "alta":
                deptos_count[row["departamento_slug"]]["alta"] += 1
            startup = row.get("startup", {})
            if startup and startup.get("nome"):
                nomes.add(startup["nome"])

        dest_response = supabase.table("destaques_lab").select("id", count="exact").execute()
        num_destaques = dest_response.count if hasattr(dest_response, 'count') else len(dest_response.data)

        print(f"\n{'=' * 55}")
        print("  ASSOCIACAO DEPARTAMENTOS x STARTUPS (Gemini)")
        print(f"{'=' * 55}")
        print(f"  Startups processadas  : {len(nomes)}")
        print(f"  Destaques LAB          : {num_destaques}")
        print(f"{'=' * 55}\n")

        for slug in SLUG_MAP.values():
            c = deptos_count.get(slug, {"total": 0, "alta": 0})
            print(f"--- {slug}: {c['total']} startups ({c['alta']} alta confianca)")
    except Exception as e:
        print(f"\n  [!] Erro ao gerar relatorio: {e}")


def executar() -> None:
    """Executa o pipeline completo de classificacao com analise."""
    config = load_config()

    if not config.gemini_api_key:
        print("ERRO: GEMINI_API_KEY nao configurada no .env")
        sys.exit(1)

    if not config.supabase_url or not config.supabase_service_role_key:
        print("ERRO: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nao configurados no .env")
        sys.exit(1)

    supabase = criar_cliente_supabase(config.supabase_url, config.supabase_service_role_key)

    print(f"Modelo Gemini: {config.gemini_model}")
    print(f"Tamanho do lote: {config.startup_batch_size}")
    print()

    client = GeminiClient(
        api_key=config.gemini_api_key,
        model_name=config.gemini_model,
        max_retries=config.gemini_max_retries,
    )

    # Carrega startups do Supabase
    response = supabase.table("startups").select("*").execute()
    startups = response.data

    # Carrega progresso anterior
    nomes_processados, destaques_lab, execution_id = _carregar_progresso(supabase)

    # Filtra apenas startups pendentes
    pendentes = [s for s in startups if s["nome"] not in nomes_processados]
    total = len(startups)

    # Separa startups sem conteudo
    sem_conteudo = [
        s for s in pendentes
        if not s.get("descricao")
        and not s.get("segmento")
        and not s.get("site")
        and not s.get("fundadores")
        and not s.get("tecnologias")
    ]
    if sem_conteudo:
        print(f"Startups sem conteudo (puladas do Gemini): {len(sem_conteudo)}")
        for s in sem_conteudo:
            print(f"  - {s['nome']}")
            nomes_processados.add(s["nome"])
        pendentes = [s for s in pendentes if s["nome"] not in nomes_processados]

    pendentes_count = len(pendentes)

    if pendentes_count == 0:
        print("Todas as startups ja foram processadas.")
        _imprimir_relatorio(supabase)
        return

    print(f"Total de startups: {total}")
    print(f"Ja processadas: {total - pendentes_count}")
    print(f"Pendentes: {pendentes_count}")
    print()

    # Converte os dados para o formato esperado pelo Gemini (dict com strings)
    startups_para_gemini = []
    for s in pendentes:
        startups_para_gemini.append({
            "nome": s["nome"],
            "descricao": s.get("descricao", ""),
            "segmento": s.get("segmento", ""),
            "tecnologias": s.get("tecnologias", []),
            "modelos_negocio": s.get("modelos_negocio", []),
        })

    lotes = list(_dividir_em_lotes(startups_para_gemini, config.startup_batch_size))
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
            _finalizar_execucao(supabase, execution_id, "interrupted")
            _imprimir_relatorio(supabase)
            sys.exit(0)
        except (GeminiTemporaryRateLimit, GeminiQuotaError) as exc:
            print(f"\n  [ERRO COTA] {exc}")
            _finalizar_execucao(supabase, execution_id, "failed")
            _imprimir_relatorio(supabase)
            sys.exit(1)
        except Exception as exc:
            print(f"  [!] Erro nao recuperavel: {exc}")
            _finalizar_execucao(supabase, execution_id, "failed")
            sys.exit(1)

        # Coleta destaques_lab deste lote
        destaques = resposta.get("destaque_lab", [])
        for nome in destaques:
            if nome not in destaques_lab:
                destaques_lab.append(nome)
                startup_id = _buscar_startup_id(supabase, nome)
                if startup_id:
                    _salvar_destaque(supabase, nome, startup_id, execution_id)

        # Processa classificacoes
        classificacoes = resposta.get("startups", [])
        for c in classificacoes:
            nome = c.get("nome", "")
            startup_id = _buscar_startup_id(supabase, nome)
            if not startup_id:
                continue

            deptos = c.get("departamentos", [])
            for d in deptos:
                depto_nome = d.get("departamento", "")
                if depto_nome in DEPARTAMENTOS:
                    _salvar_classificacao(supabase, nome, depto_nome, d, startup_id, execution_id)

        processados_nesta_execucao += len(lote)
        nomes_processados.update(nomes_lote)

        print(
            f"  [OK] Progresso: "
            f"{len(nomes_processados)}/{total} startups."
        )

        if idx_lote < total_lotes and config.gemini_delay_between_batches > 0:
            time.sleep(config.gemini_delay_between_batches)

    _finalizar_execucao(supabase, execution_id, "completed")
    _imprimir_relatorio(supabase)
    print("Processamento concluido com sucesso!")


def _finalizar_execucao(supabase, execution_id: str | None, status: str) -> None:
    """Atualiza o status da execucao no Supabase."""
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
