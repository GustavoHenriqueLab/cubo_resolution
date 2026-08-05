"""Ponto de entrada principal do extrator de startups do Cubo Itau.

Orquestra o pipeline completo:
1. Abre o navegador e faz login na plataforma.
2. Percorre a busca paginada, clica em cada card de startup,
   extrai o perfil completo.
3. Salva diretamente no Supabase.
"""

from __future__ import annotations

import json
import logging
import sys
import time
from collections import Counter
from datetime import date, timedelta
from pathlib import Path

# Adiciona src/ ao path para importar o pacote cubo
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from cubo.config import load_config
from cubo import scraper
from cubo.models import ScrapingReport, Startup
from cubo.supabase_client import criar_cliente_supabase

logger = logging.getLogger("cubo")

# Ainda mantemos JSON local como backup
ARQUIVO_SAIDA = Path(__file__).resolve().parent.parent / "data" / "raw" / "startups_cubo.json"


def _configurar_logging() -> None:
    """Configura o formato e nivel dos logs da aplicacao."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)-7s] %(name)s — %(message)s",
        datefmt="%H:%M:%S",
        stream=sys.stdout,
    )


def _carregar_nomes_supabase(supabase) -> set[str]:
    """Carrega os nomes de startups ja existentes no Supabase para evitar duplicatas."""
    try:
        response = supabase.table("startups").select("nome").execute()
        return {s["nome"] for s in response.data}
    except Exception:
        logger.warning("Nao foi possivel carregar startups do Supabase. Iniciando do zero.")
        return set()


def _salvar_startup_no_supabase(supabase, startup_dict: dict) -> bool:
    """Insere ou atualiza uma startup no Supabase."""
    try:
        supabase.table("startups").upsert(
            {
                "nome": startup_dict["nome"],
                "descricao": startup_dict.get("descricao", ""),
                "segmento": startup_dict.get("segmento", ""),
                "fundadores": startup_dict.get("fundadores", ""),
                "site": startup_dict.get("site", ""),
                "url_perfil": startup_dict.get("url_perfil", ""),
                "modelos_negocio": startup_dict.get("modelos_negocio", []),
                "tecnologias": startup_dict.get("tecnologias", []),
                "data_adicionado": startup_dict.get("data_adicionado"),
            },
            on_conflict="nome",
        ).execute()
        return True
    except Exception as e:
        logger.error("Erro ao salvar %s no Supabase: %s", startup_dict.get("nome"), e)
        return False


def _startup_para_dict(startup: Startup, id_: int, data_adicionado: str = "") -> dict:
    """Converte uma Startup para um dicionario serializavel em JSON."""
    return {
        "id": id_,
        "nome": startup.nome,
        "descricao": startup.descricao,
        "segmento": startup.segmento,
        "fundadores": startup.fundadores,
        "site": startup.site,
        "url_perfil": startup.url_perfil,
        "modelos_negocio": startup.modelos_negocio,
        "tecnologias": startup.tecnologias,
        "data_adicionado": data_adicionado,
    }


def _pode_executar(supabase) -> tuple[bool, str]:
    """Verifica se ja passaram 30 dias desde a ultima extracao."""
    try:
        response = supabase.table("startups").select("data_adicionado").order("data_adicionado", desc=True).limit(1).execute()
        if not response.data:
            return True, "Primeira execucao — sem startups no banco."

        ultima_data = response.data[0].get("data_adicionado")
        if not ultima_data:
            return True, "Nenhuma data_adicionado encontrada — permitindo execucao."

        ultima = date.fromisoformat(ultima_data)
        dias = (date.today() - ultima).days

        if dias < 30:
            return False, (
                f"Ultima extracao foi ha {dias} dias ({ultima_data}). "
                f"Minimo de 30 dias necessario. Faltam {30 - dias} dias."
            )

        return True, f"Ultima extracao: {ultima_data} ({dias} dias atras). Execucao permitida."
    except Exception as e:
        return True, f"Erro ao verificar data: {e}. Permitindo execucao."


def executar() -> ScrapingReport:
    """Executa o pipeline completo de extracao e persistencia no Supabase."""
    config = load_config()
    report = ScrapingReport()
    data_hoje = date.today().isoformat()

    if not config.supabase_url or not config.supabase_service_role_key:
        logger.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nao configurados no .env")
        return report

    supabase = criar_cliente_supabase(config.supabase_url, config.supabase_service_role_key)

    nomes_salvos = _carregar_nomes_supabase(supabase)

    pode, msg = _pode_executar(supabase)
    logger.info("Verificacao de periodo: %s", msg)
    if not pode:
        logger.warning("Execucao bloqueada: %s", msg)
        return report

    if not config.cubo_email or not config.cubo_password:
        logger.error("CUBO_EMAIL e CUBO_PASSWORD nao configurados no .env")
        return report

    # Marca pipeline como running
    try:
        exec_response = supabase.table("pipeline_executions").insert({
            "type": "scraper",
            "status": "running",
            "started_at": "now()",
        }).execute()
        execution_id = exec_response.data[0]["id"] if exec_response.data else None
    except Exception:
        execution_id = None

    driver = scraper.criar_driver(headless=config.headless)
    total_cubo = 0
    startups_salvas: list[dict] = []

    try:
        sucesso = scraper.fazer_login(
            driver,
            config.cubo_email,
            config.cubo_password,
            timeout=config.selenium_timeout,
        )

        if not sucesso:
            logger.error("Login falhou.")
            return report

        for pagina, total_cubo_atual, startup in scraper.coletar_e_extrair_startups(
            driver,
            timeout=config.selenium_timeout,
            nomes_salvos=nomes_salvos,
        ):
            if not total_cubo and total_cubo_atual:
                total_cubo = total_cubo_atual
            if startup.nome in nomes_salvos:
                report.total_encontrados += 1
                continue

            try:
                startup_dict = _startup_para_dict(startup, 0, data_hoje)
                if _salvar_startup_no_supabase(supabase, startup_dict):
                    nomes_salvos.add(startup.nome)
                    startups_salvas.append(startup_dict)
                    report.total_extraidos += 1
                else:
                    report.total_falhas += 1
                    report.erros.append(f"Supabase error: {startup.nome}")

                if report.total_extraidos % 10 == 0:
                    logger.info(">> Progresso: %d startups salvas.", len(startups_salvas))

            except Exception:
                logger.exception("Erro ao serializar: %s", startup.nome)
                report.total_falhas += 1
                report.erros.append(f"Serialize error: {startup.nome}")

            time.sleep(config.request_delay)

    except KeyboardInterrupt:
        logger.warning("Interrompido pelo usuario.")
    finally:
        try:
            driver.quit()
        except Exception:
            pass

    # Salva backup JSON local
    try:
        with open(ARQUIVO_SAIDA, "w", encoding="utf-8") as f:
            json.dump(startups_salvas, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

    # Atualiza pipeline_execution
    if execution_id:
        try:
            supabase.table("pipeline_executions").update({
                "status": "completed",
                "completed_at": "now()",
                "summary": {
                    "total_extracted": report.total_extraidos,
                    "total_failures": report.total_falhas,
                    "total_cubo": total_cubo,
                },
            }).eq("id", execution_id).execute()
        except Exception:
            pass

    logger.info("Arquivo final salvo (backup): %s", ARQUIVO_SAIDA)
    logger.info("Total de startups no Supabase: %d", len(nomes_salvos))

    return report


def main() -> None:
    """Funcao de entrada do script."""
    _configurar_logging()

    logger.info("=" * 60)
    logger.info("Cubo Itau — Startup Data Extractor (Supabase)")
    logger.info("=" * 60)

    try:
        report = executar()
    except KeyboardInterrupt:
        logger.warning("Interrompido pelo usuario.")
        sys.exit(0)
    except Exception:
        logger.exception("Erro fatal.")
        sys.exit(1)

    logger.info("=" * 60)
    logger.info("RESUMO")
    logger.info("=" * 60)
    logger.info("  Extraidos : %d", report.total_extraidos)
    logger.info("  Falhas    : %d", report.total_falhas)

    if report.erros:
        logger.info("  Erros (%d):", len(report.erros))
        for erro in report.erros[:10]:
            logger.info("    - %s", erro)

    logger.info("=" * 60)


if __name__ == "__main__":
    main()
