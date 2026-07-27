"""Módulo de extração de dados com Selenium WebDriver.

Responsável por:
- Realizar login na plataforma Cubo Itaú.
- Navegar pela busca de startups no dashboard e extrair dados dos cards.
- Visitar perfis individuais para extrair founders, site e tecnologias.
- Tratar cards sem perfil (apenas nome) extraindo o que estiver visível.
"""

from __future__ import annotations

import logging
import re
import time

from selenium.common.exceptions import (
    InvalidSessionIdException,
    TimeoutException,
)
from selenium.webdriver import Chrome
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from cubo.models import Startup

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# URLs
# ---------------------------------------------------------------------------

URL_LOGIN = "https://app.cubo.itau/sign-in"
URL_SEARCH = "https://app.cubo.itau/dashboard/search?resultSet=startup"


def criar_driver(headless: bool = False) -> Chrome:
    """Cria e configura a instância do Chrome WebDriver."""
    options = Options()

    if headless:
        options.add_argument("--headless=new")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")

    options.add_argument("--start-maximized")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)

    options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    )

    driver = Chrome(options=options)
    driver.implicitly_wait(5)
    return driver


def fazer_login(
    driver: Chrome,
    email: str,
    senha: str,
    timeout: int = 15,
) -> bool:
    """Realiza login na área de membros do Cubo Itaú."""
    logger.info("Acessando página de login: %s", URL_LOGIN)
    driver.get(URL_LOGIN)

    wait = WebDriverWait(driver, timeout)

    try:
        campo_email = wait.until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, "input[type='email'], input[name='email']")
            )
        )
        campo_email.clear()
        campo_email.send_keys(email)

        campo_senha = driver.find_element(
            By.CSS_SELECTOR, "input[type='password'], input[name='password']"
        )
        campo_senha.clear()
        campo_senha.send_keys(senha)

        botao = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        botao.click()
        logger.info("Formulário enviado.")

        time.sleep(4)

        current_url = driver.current_url.lower()
        if "sign-in" not in current_url and "login" not in current_url:
            logger.info("Login bem-sucedido.")
            return True

        logger.warning("Login pode ter falhado.")
        return False

    except TimeoutException:
        logger.error("Timeout ao localizar campos de login.")
        return False


def _texto_linha_apos_rotulo(texto_pagina: str, rotulo: str) -> str:
    """Extrai o valor que aparece na linha seguinte a um rótulo."""
    linhas = texto_pagina.split("\n")
    for i, linha in enumerate(linhas):
        if linha.strip() == rotulo and i + 1 < len(linhas):
            valor = linhas[i + 1].strip()
            ignorar = {
                "Founders", "Segmento", "Site", "Tecnologias",
                "Modelo de negócio", "Modelos de negócio", "Latam",
                "Colaboradores", "País",
                "Aceitar todos", "Recusar todos",
                "Recusar não essenciais",
                "Configurações de cookies",
            }
            if valor and valor not in ignorar:
                return valor
    return ""


def _texto_multilinha_apos_rotulo(texto_pagina: str, rotulo: str) -> list[str]:
    """Extrai valores de múltiplas linhas após um rótulo (ex: tecnologias)."""
    linhas = texto_pagina.split("\n")
    resultados: list[str] = []
    coletando = False
    stop_labels = {
        "Founders", "Segmento", "Site", "Tecnologias",
        "Modelo de negócio", "Modelos de negócio", "Latam",
        "Colaboradores", "País",
        "compartilhar", "conectar-se", "Ler mais",
        "Política de Privacidade", "Termos de Uso",
        "Aceitar todos", "Recusar todos", "Recusar não essenciais",
    }

    for linha in linhas:
        stripped = linha.strip()
        if stripped == rotulo:
            coletando = True
            continue
        if coletando:
            if not stripped:
                break
            if stripped in stop_labels:
                break
            if any(stripped.startswith(prefix) for prefix in ("Colaboradores", "Aceitar", "Recusar", "Configura")):
                break
            if stripped in ("Cases de sucesso", "ver case", "Pitch", "Produtos e Serviços"):
                break
            if stripped not in resultados:
                resultados.append(stripped)

    return resultados


def extrair_perfil(driver: Chrome, timeout: int = 15) -> Startup:
    """Extrai os dados da página de perfil atualmente carregada no driver.

    A página de perfil do dashboard tem a estrutura:
    - Sidebar + breadcrumb "Home / [Nome]"
    - Tipo ("Startup")
    - Nome repetido
    - Descrição (texto longo)
    - Founders / Segmento / Site / Tecnologias / Colaboradores

    Args:
        driver: WebDriver já posicionado na página de perfil.
        timeout: Tempo máximo de espera.

    Returns:
        Instância de :class:`Startup` preenchida.
    """
    WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((By.TAG_NAME, "body"))
    )

    time.sleep(2)
    texto = driver.find_element(By.TAG_NAME, "body").text
    linhas = texto.split("\n")

    # --- Nome: linha logo antes de "Startup" (após o breadcrumb) ---
    nome = ""
    for i, linha in enumerate(linhas):
        linha = linha.strip()
        if linha == "Startup" and i > 2:
            # O nome está 1 ou 2 linhas antes de "Startup"
            for j in range(i - 1, max(i - 3, 0), -1):
                candidato = linhas[j].strip()
                if (
                    candidato
                    and candidato not in ("Home", "/")
                    and len(candidato) > 1
                    and "cookies" not in candidato.lower()
                    and "Utilizamos" not in candidato
                    and "Não rastrearemos" not in candidato
                    and "Aceitar" not in candidato
                    and "Recusar" not in candidato
                    and "Configura" not in candidato
                ):
                    nome = candidato
                    break
            break

    if not nome:
        nome = "N/I"

    # --- Descrição: primeiro texto longo (>=60 chars) após o nome ---
    descricao = ""
    achou_nome = False
    for linha in linhas:
        stripped = linha.strip()
        if stripped == nome:
            achou_nome = True
            continue
        if achou_nome and len(stripped) > 60 and "cookies" not in stripped.lower():
            descricao = stripped
            break

    # --- Campos por rótulo ---
    segmento = _texto_linha_apos_rotulo(texto, "Segmento")
    site = _texto_linha_apos_rotulo(texto, "Site")
    fundadores = _texto_linha_apos_rotulo(texto, "Founders")

    tecnologias = _texto_multilinha_apos_rotulo(texto, "Tecnologias")
    modelos = _texto_multilinha_apos_rotulo(texto, "Modelo de negócio")

    return Startup(
        nome=nome,
        descricao=descricao,
        segmento=segmento,
        fundadores=fundadores,
        site=site,
        url_perfil=driver.current_url,
        modelos_negocio=modelos,
        tecnologias=tecnologias,
    )


def _extrair_dados_card(card: WebElement) -> dict:
    """Extrai nome, segmento e modelo de negócio do card na busca."""
    texto = card.text
    linhas = [l.strip() for l in texto.split("\n") if l.strip()]

    nome = card.get_attribute("aria-label") or "N/I"

    segmento = ""
    modelo_negocio = ""
    descricao = ""

    for i, linha in enumerate(linhas):
        if linha == "Segmento" and i + 1 < len(linhas):
            segmento = linhas[i + 1]
        elif "Modelo de neg" in linha and i + 1 < len(linhas):
            candidato = linhas[i + 1]
            if candidato not in ("Segmento", "Cases de sucesso", "ver case", "Pitch") and len(candidato) < 80:
                modelo_negocio = candidato
        elif len(linha) > 60 and not descricao and linha != nome:
            descricao = linha

    return {
        "nome": nome,
        "segmento": segmento,
        "modelo_negocio": modelo_negocio,
        "descricao": descricao,
    }


def _startup_do_card(dados_card: dict) -> Startup:
    """Constrói uma Startup apenas com os dados visíveis no card."""
    return Startup(
        nome=dados_card["nome"],
        url_perfil="",
        descricao=dados_card.get("descricao", ""),
        segmento=dados_card.get("segmento", ""),
        modelos_negocio=[dados_card["modelo_negocio"]] if dados_card.get("modelo_negocio") else [],
    )


def _ler_total_startups(driver: Chrome) -> int:
    """Le o numero total de startups exibido no header da pagina de busca.

    Procura por padroes como "516 startups" ou "startups(516)".
    """
    try:
        body_text = driver.find_element(By.TAG_NAME, "body").text
        match = re.search(
            r"(\d[\d.,]*)\s*startup|startups?\s*\((\d[\d.,]*)\)",
            body_text,
            re.IGNORECASE,
        )
        if match:
            raw = (match.group(1) or match.group(2)).replace(",", "").replace(".", "")
            return int(raw)
    except Exception:
        logger.warning("Nao foi possivel ler o total de startups do header.")
    return 0


def coletar_e_extrair_startups(
    driver: Chrome,
    timeout: int = 15,
    nomes_salvos: set[str] | None = None,
):
    """Percorre as páginas da busca e extrai dados de cada startup.

    Para cada card, clica para abrir o perfil, extrai os dados e
    volta para a página de busca.

    Args:
        driver: WebDriver autenticado.
        timeout: Tempo de espera por elemento.
        nomes_salvos: Nomes de startups já persistidas, para pular
            cards sem precisar clicar.

    Yields:
        Tuplas ``(número_da_página, total_startups_cubo, Startup)``.
    """
    ja_salvos = set(nomes_salvos) if nomes_salvos else set()
    total_paginas_max = 100  # limite de seguranca, o loop para antes se necessario
    todos_extraidos: set[str] = set()

    # Le o total de startups do header do Cubo (apenas na pagina 1)
    total_cubo = 0
    url_pag1 = f"{URL_SEARCH}&page=1"
    driver.get(url_pag1)
    time.sleep(4)
    total_cubo = _ler_total_startups(driver)
    if total_cubo:
        logger.info("Total de startups no Cubo: %d", total_cubo)
    else:
        logger.warning("Nao foi possivel ler o total de startups do Cubo.")

    pagina = 1
    while pagina <= total_paginas_max:
        # Se ja sabemos o total do Cubo e ja coletamos tudo, para
        if total_cubo and (len(ja_salvos) + len(todos_extraidos)) >= total_cubo:
            logger.info(
                "Total alcancado: %d salvas + %d novas = %d (Cubo: %d). Parando.",
                len(ja_salvos), len(todos_extraidos),
                len(ja_salvos) + len(todos_extraidos), total_cubo,
            )
            break

        url = f"{URL_SEARCH}&page={pagina}"
        if pagina > 1:
            driver.get(url)
            time.sleep(4)
        # Scroll para garantir que todos os cards carreguem
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(1)
        driver.execute_script("window.scrollTo(0, 0);")
        time.sleep(1)

        def _achar_cards() -> list[WebElement]:
            cards = driver.find_elements(
                By.CSS_SELECTOR, "div[role='button'][aria-label]"
            )
            return cards

        startup_cards = _achar_cards()

        # Pagina vazia = fim da paginacao
        if not startup_cards:
            logger.info("Pagina %d sem cards — fim da paginacao.", pagina)
            break

        # Pre-checa se todos os cards desta página já foram salvos
        nomes_na_pagina: set[str] = set()
        for card in startup_cards:
            try:
                label = card.get_attribute("aria-label") or "N/I"
                nomes_na_pagina.add(label)
            except Exception:
                pass

        novos_na_pagina = nomes_na_pagina - ja_salvos - todos_extraidos
        if not novos_na_pagina and nomes_na_pagina:
            logger.info(
                "  %d startups na página %d [PULADA: todas já salvas]",
                len(startup_cards),
                pagina,
            )
            pagina += 1
            continue

        logger.info("  %d startups na página %d (%d novas)", len(startup_cards), pagina, len(novos_na_pagina))

        indice = 0
        while indice < len(startup_cards):
            card = startup_cards[indice]

            try:
                dados_card = _extrair_dados_card(card)
                nome = dados_card["nome"]
            except InvalidSessionIdException:
                logger.error("Sessão do navegador perdida. Interrompendo coleta.")
                return
            except Exception:
                logger.exception("Erro ao ler card — pulando.")
                indice += 1
                continue

            if nome in todos_extraidos or nome in ja_salvos:
                indice += 1
                continue

            tem_segmento = "Segmento" in card.text

            if not tem_segmento:
                logger.info(
                    "  [%d/%d p%d] %s -> card sem Segmento, tentando perfil...",
                    len(todos_extraidos) + 1,
                    total_cubo or 520,
                    pagina,
                    nome,
                )
                try:
                    ActionChains(driver).move_to_element(card).click().perform()
                    time.sleep(3)

                    startup = extrair_perfil(driver, timeout)
                    startup.url_perfil = driver.current_url

                    if not startup.segmento and dados_card["segmento"]:
                        startup.segmento = dados_card["segmento"]
                    if not startup.descricao and dados_card["descricao"]:
                        startup.descricao = dados_card["descricao"]

                    startup.modelos_negocio = [
                        m for m in startup.modelos_negocio
                        if m not in ("Cases de sucesso", "ver case", "Pitch", "Segmento")
                        and not m.startswith("http")
                        and len(m) < 60
                    ]

                    logger.info(
                        "  [%d/%d p%d] %s -> Founders: %s | Tech: %s",
                        len(todos_extraidos) + 1,
                        total_cubo or 520,
                        pagina,
                        startup.nome,
                        startup.fundadores,
                        startup.tecnologias,
                    )

                    todos_extraidos.add(nome)
                    yield pagina, total_cubo, startup

                    driver.get(url)
                    time.sleep(4)
                    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                    time.sleep(1)
                    driver.execute_script("window.scrollTo(0, 0);")
                    time.sleep(1)
                    startup_cards = _achar_cards()

                except Exception:
                    logger.info(
                        "  [%d/%d p%d] %s -> (apenas nome)",
                        len(todos_extraidos) + 1,
                        total_cubo or 520,
                        pagina,
                        nome,
                    )
                    startup = _startup_do_card(dados_card)
                    todos_extraidos.add(nome)
                    yield pagina, total_cubo, startup
                    try:
                        driver.get(url)
                        time.sleep(4)
                        startup_cards = _achar_cards()
                    except Exception:
                        pass

                indice += 1
                continue

            try:
                ActionChains(driver).move_to_element(card).click().perform()
                time.sleep(3)

                startup = extrair_perfil(driver, timeout)
                startup.url_perfil = driver.current_url

                # Complementa com dados do card
                if not startup.modelos_negocio and dados_card["modelo_negocio"]:
                    startup.modelos_negocio = [dados_card["modelo_negocio"]]
                if not startup.segmento and dados_card["segmento"]:
                    startup.segmento = dados_card["segmento"]
                if not startup.descricao and dados_card["descricao"]:
                    startup.descricao = dados_card["descricao"]

                # Filtra ruído dos modelos de negócio
                startup.modelos_negocio = [
                    m for m in startup.modelos_negocio
                    if m not in ("Cases de sucesso", "ver case", "Pitch", "Segmento")
                    and not m.startswith("http")
                    and len(m) < 60
                ]

                logger.info(
                    "  [%d/%d p%d] %s -> Founders: %s | Tech: %s",
                    len(todos_extraidos) + 1,
                    total_cubo or 520,
                    pagina,
                    startup.nome,
                    startup.fundadores,
                    startup.tecnologias,
                )

                todos_extraidos.add(nome)
                yield pagina, total_cubo, startup

                # Navega de volta para a página de busca via URL
                driver.get(url)
                time.sleep(4)
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(1)
                driver.execute_script("window.scrollTo(0, 0);")
                time.sleep(1)

                # Re-find cards
                startup_cards = _achar_cards()

            except TimeoutException:
                logger.error("  Timeout no perfil: %s — salvando dados do card", nome)
                startup = _startup_do_card(dados_card)
                todos_extraidos.add(nome)
                yield pagina, total_cubo, startup
                try:
                    driver.get(url)
                    time.sleep(4)
                    startup_cards = _achar_cards()
                except Exception:
                    pass

            except InvalidSessionIdException:
                logger.error("  Sessão perdida processando: %s — salvando dados do card", nome)
                startup = _startup_do_card(dados_card)
                todos_extraidos.add(nome)
                yield pagina, total_cubo, startup
                return

            except Exception:
                logger.exception("  Erro ao processar: %s — salvando dados do card", nome)
                startup = _startup_do_card(dados_card)
                todos_extraidos.add(nome)
                yield pagina, total_cubo, startup
                try:
                    driver.get(url)
                    time.sleep(4)
                    startup_cards = _achar_cards()
                except Exception:
                    pass

            indice += 1

        pagina += 1
