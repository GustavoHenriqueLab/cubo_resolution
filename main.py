"""Ponto de entrada principal do extrator de startups do Cubo Itaú.

Orquestra o pipeline completo:
1. Abre o navegador e faz login na plataforma.
2. Percorre a busca paginada, clica em cada card de startup,
   extrai o perfil completo.
3. Salva tudo em um arquivo JSON para análise posterior.
"""

from __future__ import annotations

import json
import logging
import sys
import time
from dataclasses import asdict
from pathlib import Path

from selenium.common.exceptions import TimeoutException

from config import load_config
from cubo import scraper
from cubo.models import ScrapingReport, Startup

logger = logging.getLogger("cubo")

ARQUIVO_SAIDA = Path(__file__).resolve().parent / "startups_cubo.json"
ARQUIVO_PARCIAL = Path(__file__).resolve().parent / "startups_cubo_parcial.json"


def _configurar_logging() -> None:
    """Configura o formato e nível dos logs da aplicação."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)-7s] %(name)s — %(message)s",
        datefmt="%H:%M:%S",
        stream=sys.stdout,
    )


def _startup_para_dict(startup: Startup) -> dict:
    """Converte uma Startup para um dicionário serializável em JSON."""
    return {
        "nome": startup.nome,
        "descricao": startup.descricao,
        "segmento": startup.segmento,
        "fundadores": startup.fundadores,
        "site": startup.site,
        "url_perfil": startup.url_perfil,
        "modelos_negocio": startup.modelos_negocio,
        "tecnologias": startup.tecnologias,
    }


def _salvar_parcial(startups: list[dict]) -> None:
    """Salva os resultados parciais em disco para evitar perda de dados."""
    try:
        with open(ARQUIVO_PARCIAL, "w", encoding="utf-8") as f:
            json.dump(startups, f, ensure_ascii=False, indent=2)
    except Exception:
        logger.warning("Não foi possível salvar arquivo parcial.")


def _carregar_parcial() -> list[dict]:
    """Carrega resultados parciais salvos anteriormente."""
    if ARQUIVO_PARCIAL.exists():
        try:
            with open(ARQUIVO_PARCIAL, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return []


def executar() -> ScrapingReport:
    """Executa o pipeline completo de extração e persistência em JSON."""
    config = load_config()
    report = ScrapingReport()

    if not config.cubo_email or not config.cubo_password:
        logger.error("CUBO_EMAIL e CUBO_PASSWORD não configurados no .env")
        return report

    # Carrega progresso anterior (se houver)
    startups_salvas = _carregar_parcial()
    nomes_salvos: set[str] = {s["nome"] for s in startups_salvas}
    logger.info(
        "Progresso anterior: %d startups já coletadas.",
        len(startups_salvas),
    )

    driver = scraper.criar_driver(headless=config.headless)

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

        for startup in scraper.coletar_e_extrair_startups(
            driver,
            timeout=config.selenium_timeout,
        ):
            if startup.nome in nomes_salvos:
                report.total_encontrados += 1
                continue

            try:
                startups_salvas.append(_startup_para_dict(startup))
                nomes_salvos.add(startup.nome)
                report.total_extraidos += 1

                # Salva parcial a cada 10 startups
                if report.total_extraidos % 10 == 0:
                    _salvar_parcial(startups_salvas)
                    logger.info(
                        "▸ Parcial salvo: %d startups.",
                        len(startups_salvas),
                    )

            except Exception:
                logger.exception("Erro ao serializar: %s", startup.nome)
                report.total_falhas += 1
                report.erros.append(f"Serialize error: {startup.nome}")

            time.sleep(config.request_delay)

    finally:
        driver.quit()

    # Salva arquivo final
    _salvar_parcial(startups_salvas)
    with open(ARQUIVO_SAIDA, "w", encoding="utf-8") as f:
        json.dump(startups_salvas, f, ensure_ascii=False, indent=2)

    logger.info("Arquivo final salvo: %s", ARQUIVO_SAIDA)

    return report


def main() -> None:
    """Função de entrada do script."""
    _configurar_logging()

    logger.info("=" * 60)
    logger.info("Cubo Itaú — Startup Data Extractor")
    logger.info("Saída: %s", ARQUIVO_SAIDA)
    logger.info("=" * 60)

    try:
        report = executar()
    except KeyboardInterrupt:
        logger.warning("Interrompido pelo usuário. Dados parciais foram salvos.")
        sys.exit(0)
    except Exception:
        logger.exception("Erro fatal.")
        sys.exit(1)

    logger.info("=" * 60)
    logger.info("RESUMO")
    logger.info("=" * 60)
    logger.info("  Extraídos : %d", report.total_extraidos)
    logger.info("  Falhas    : %d", report.total_falhas)
    logger.info("  Arquivo   : %s", ARQUIVO_SAIDA)

    if report.erros:
        logger.info("  Erros (%d):", len(report.erros))
        for erro in report.erros[:10]:
            logger.info("    - %s", erro)

    logger.info("=" * 60)


if __name__ == "__main__":
    main()
