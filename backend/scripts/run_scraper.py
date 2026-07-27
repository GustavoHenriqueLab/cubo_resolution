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
from collections import Counter
from datetime import date, timedelta
from pathlib import Path

# Adiciona src/ ao path para importar o pacote cubo
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from cubo.config import load_config
from cubo import scraper
from cubo.models import ScrapingReport, Startup

logger = logging.getLogger("cubo")

ARQUIVO_SAIDA = Path(__file__).resolve().parent.parent / "data" / "raw" / "startups_cubo.json"
ARQUIVO_PARCIAL = Path(__file__).resolve().parent.parent / "data" / "raw" / "startups_cubo_parcial.json"
ARQUIVO_PAGINAS = Path(__file__).resolve().parent.parent / "data" / "raw" / "paginas_rastreadas.json"


def _configurar_logging() -> None:
    """Configura o formato e nível dos logs da aplicação."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)-7s] %(name)s — %(message)s",
        datefmt="%H:%M:%S",
        stream=sys.stdout,
    )


def _startup_para_dict(startup: Startup, id_: int, data_adicionado: str = "") -> dict:
    """Converte uma Startup para um dicionário serializável em JSON."""
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


def _salvar_parcial(startups: list[dict]) -> None:
    """Salva os resultados parciais em disco para evitar perda de dados."""
    try:
        with open(ARQUIVO_PARCIAL, "w", encoding="utf-8") as f:
            json.dump(startups, f, ensure_ascii=False, indent=2)
    except Exception:
        logger.warning("Não foi possível salvar arquivo parcial.")


def _carregar_parcial() -> list[dict]:
    """Carrega resultados parciais salvos anteriormente.

    Usa o arquivo com mais dados entre ``_parcial`` e o final,
    garantindo que nenhum dado seja perdido em caso de crash.
    """
    melhor: list[dict] = []
    for arquivo in (ARQUIVO_PARCIAL, ARQUIVO_SAIDA):
        if arquivo.exists():
            try:
                with open(arquivo, encoding="utf-8") as f:
                    dados = json.load(f)
                if len(dados) > len(melhor):
                    melhor = dados
            except Exception:
                pass
    return melhor


def _carregar_paginas() -> dict[int, list[str]]:
    """Carrega o tracking de páginas já processadas.

    Returns:
        Dicionário ``{número_página: [lista_de_nomes]}`` com nomes
        únicos por página.
    """
    if ARQUIVO_PAGINAS.exists():
        try:
            with open(ARQUIVO_PAGINAS, encoding="utf-8") as f:
                raw = json.load(f)
            return {
                int(k): list(dict.fromkeys(v)) for k, v in raw.items()
            }
        except Exception:
            pass
    return {}


def _salvar_paginas(rastreio: dict[int, list[str]]) -> None:
    """Persiste o tracking de páginas no disco, garantindo nomes únicos."""
    try:
        dedup = {p: list(dict.fromkeys(nomes)) for p, nomes in rastreio.items()}
        with open(ARQUIVO_PAGINAS, "w", encoding="utf-8") as f:
            json.dump(
                {str(k): v for k, v in dedup.items()},
                f,
                ensure_ascii=False,
                indent=2,
            )
    except Exception:
        logger.warning("Não foi possível salvar arquivo de páginas.")


def _pode_executar() -> tuple[bool, str]:
    """Verifica se ja passaram 30 dias desde a ultima extracao.

    Returns:
        Tupla (pode_executar, mensagem).
    """
    if not ARQUIVO_SAIDA.exists():
        return True, "Primeira execucao — arquivo de startups ainda nao existe."

    try:
        with open(ARQUIVO_SAIDA, encoding="utf-8") as f:
            startups = json.load(f)

        if not startups:
            return True, "Arquivo de startups vazio — primeira execucao."

        datas = [s.get("data_adicionado", "") for s in startups if s.get("data_adicionado")]
        if not datas:
            return True, "Nenhuma data_adicionado encontrada — permitindo execucao."

        ultima_data = max(datas)
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
    """Executa o pipeline completo de extração e persistência em JSON."""
    config = load_config()
    report = ScrapingReport()
    data_hoje = date.today().isoformat()

    pode, msg = _pode_executar()
    logger.info("Verificacao de periodo: %s", msg)
    if not pode:
        logger.warning("Execucao bloqueada: %s", msg)
        return report

    if not config.cubo_email or not config.cubo_password:
        logger.error("CUBO_EMAIL e CUBO_PASSWORD não configurados no .env")
        return report

    startups_salvas = _carregar_parcial()
    nomes_salvos: set[str] = {s["nome"] for s in startups_salvas}

    for i, s in enumerate(startups_salvas, start=1):
        if "id" not in s:
            s["id"] = i

    proximo_id = len(startups_salvas) + 1

    rastreio = _carregar_paginas()

    logger.info(
        "Progresso anterior: %d startups em %d páginas rastreadas.",
        len(startups_salvas),
        len(rastreio),
    )

    driver = scraper.criar_driver(headless=config.headless)
    total_cubo = 0

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
                startups_salvas.append(
                    _startup_para_dict(startup, proximo_id, data_hoje)
                )
                nomes_salvos.add(startup.nome)
                proximo_id += 1
                report.total_extraidos += 1

                rastreio.setdefault(pagina, [])
                if startup.nome not in rastreio[pagina]:
                    rastreio[pagina].append(startup.nome)

                if report.total_extraidos % 10 == 0:
                    _salvar_parcial(startups_salvas)
                    _salvar_paginas(rastreio)
                    logger.info(
                        ">> Parciais salvos: %d startups.",
                        len(startups_salvas),
                    )

            except Exception:
                logger.exception("Erro ao serializar: %s", startup.nome)
                report.total_falhas += 1
                report.erros.append(f"Serialize error: {startup.nome}")

            time.sleep(config.request_delay)

    except KeyboardInterrupt:
        logger.warning("Interrompido pelo usuário. Salvando dados parciais...")
    finally:
        _salvar_parcial(startups_salvas)
        _salvar_paginas(rastreio)
        try:
            driver.quit()
        except Exception:
            pass

    with open(ARQUIVO_SAIDA, "w", encoding="utf-8") as f:
        json.dump(startups_salvas, f, ensure_ascii=False, indent=2)

    logger.info("Arquivo final salvo: %s", ARQUIVO_SAIDA)
    logger.info("Tracking de páginas salvo: %s", ARQUIVO_PAGINAS)

    # Verifica duplicatas
    nomes_contados = Counter(s["nome"] for s in startups_salvas)
    duplicatas = [n for n, c in nomes_contados.items() if c > 1]
    if duplicatas:
        logger.warning("DUPLICATAS ENCONTRADAS (%d): %s", len(duplicatas), duplicatas)
        # Remove duplicatas mantendo a primeira ocorrencia
        vistos: set[str] = set()
        dedup = []
        for s in startups_salvas:
            if s["nome"] not in vistos:
                vistos.add(s["nome"])
                dedup.append(s)
        startups_salvas[:] = dedup
        logger.info("Duplicatas removidas. Total apos dedup: %d", len(startups_salvas))

        # Re-salva o JSON limpo
        with open(ARQUIVO_SAIDA, "w", encoding="utf-8") as f:
            json.dump(startups_salvas, f, ensure_ascii=False, indent=2)

    # Compara com o total do Cubo
    if total_cubo and len(startups_salvas) != total_cubo:
        logger.warning(
            "DISCREPANCIA: JSON tem %d startups, Cubo reporta %d (diferença: %+d)",
            len(startups_salvas),
            total_cubo,
            len(startups_salvas) - total_cubo,
        )
    elif total_cubo:
        logger.info("Total confere: %d startups = Cubo (%d)", len(startups_salvas), total_cubo)

    return report


def main() -> None:
    """Função de entrada do script."""
    _configurar_logging()

    logger.info("=" * 60)
    logger.info("Cubo Itaú — Startup Data Extractor")
    logger.info("Saída: %s", ARQUIVO_SAIDA)
    logger.info("Tracking: %s", ARQUIVO_PAGINAS)
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
