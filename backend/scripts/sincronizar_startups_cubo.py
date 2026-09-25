"""Sincroniza o banco do cubo com a lista atual de startups do portal Cubo.

Percorre a busca do Cubo card a card e identifica quais startups do banco
ainda estao no portal. Ao final, gera um relatorio com as que devem ser
removidas. Por padrao NAO remove nada; use --aplicar (apos conferir o
relatorio) para remover de fato.

Regras de identificacao:
- Rotulo do card que bate com um nome do banco (e cujo perfil nao esta na
  lista de perfis mortos do ultimo scan) -> mantem a startup do banco.
- Caso contrario, abre o perfil e identifica pelo nome/URL extraidos.

Uso:
    python scripts/sincronizar_startups_cubo.py            # coleta + relatorio
    python scripts/sincronizar_startups_cubo.py --aplicar  # remove do banco
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from selenium.webdriver.common.by import By

from cubo import scraper
from cubo.config import load_config
from cubo.supabase_client import criar_cliente_supabase

PROCESSED = Path(__file__).resolve().parent.parent / "data" / "processed"
ARQUIVO_SAIDAS = PROCESSED / "saidas_cubo.json"
ARQUIVO_RELATORIO = PROCESSED / "sincronizacao_cubo.json"
ARQUIVO_BACKUP = PROCESSED / "startups_removidas.json"

TABELAS_REF = [
    "startup_departamentos",
    "destaques_lab",
    "startup_favorites",
    "startup_users",
    "startup_status_log",
    "parcerias",
    "propostas",
]


def normalizar(texto: str) -> str:
    """Normaliza nome para comparacao (unicode, caixa e espacos)."""
    limpo = unicodedata.normalize("NFKC", texto or "")
    limpo = "".join(c if c.isalnum() or c.isspace() else " " for c in limpo)
    return " ".join(limpo.casefold().split())


def carregar_mortas() -> set[str]:
    """Nomes confirmados como fora do Cubo no ultimo scan."""
    mortas: set[str] = set()
    if ARQUIVO_SAIDAS.exists():
        with open(ARQUIVO_SAIDAS, encoding="utf-8") as f:
            relatorio = json.load(f)
        for item in relatorio.get("saidas", []):
            if item.get("resultado") == "confirmada":
                mortas.add(normalizar(item.get("nome", "")))
    return mortas


def carregar_startups(supabase) -> list[dict]:
    resposta = supabase.table("startups").select(
        "id, nome, url_perfil, status, data_adicionado"
    ).execute()
    return resposta.data or []


def coletar(supabase, config) -> dict:
    """Percorre o Cubo e monta o relatorio de sincronizacao."""
    startups = carregar_startups(supabase)
    mortas = carregar_mortas()

    por_nome: dict[str, list[dict]] = {}
    por_url: dict[str, dict] = {}
    for s in startups:
        por_nome.setdefault(normalizar(s["nome"]), []).append(s)
        url = (s.get("url_perfil") or "").strip()
        if url:
            por_url[url] = s

    presentes: set[str] = set()
    no_cubo_sem_banco: list[str] = []
    nao_resolvidos: list[str] = []
    rotulos_vistos: set[str] = set()
    total_cards = 0

    driver = scraper.criar_driver(headless=config.headless)
    try:
        ok = scraper.fazer_login(
            driver, config.cubo_email, config.cubo_password,
            timeout=config.selenium_timeout,
        )
        if not ok:
            print("ERRO: login no Cubo falhou.")
            sys.exit(1)

        driver.get(f"{scraper.URL_SEARCH}&page=1")
        time.sleep(4)
        total_cubo = scraper._ler_total_startups(driver)
        print(f"Total no header do Cubo: {total_cubo or '?'}")

        pagina = 1
        while pagina <= 100:
            if total_cubo and len(rotulos_vistos) >= total_cubo:
                print(f"Total do header alcancado: {len(rotulos_vistos)} rotulos.")
                break

            url_pagina = f"{scraper.URL_SEARCH}&page={pagina}"
            if pagina > 1:
                driver.get(url_pagina)
                time.sleep(4)
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(1)
            driver.execute_script("window.scrollTo(0, 0);")
            time.sleep(1)

            cards = driver.find_elements(
                By.CSS_SELECTOR, "div[role='button'][aria-label]"
            )
            if not cards:
                print(f"Pagina {pagina} sem cards — fim.")
                break

            def ler_rotulos(elementos) -> list[str]:
                valores = []
                for el in elementos:
                    try:
                        valores.append((el.get_attribute("aria-label") or "").strip())
                    except Exception:
                        valores.append("")
                return valores

            rotulos = ler_rotulos(cards)
            rotulos_vistos.update(r for r in rotulos if r)
            print(f"  Pagina {pagina}: {len(cards)} cards")

            indice = 0
            while indice < len(cards):
                rotulo = rotulos[indice]
                candidatos = por_nome.get(normalizar(rotulo), []) if rotulo else []
                confiavel = candidatos and not any(
                    normalizar(c["nome"]) in mortas for c in candidatos
                )

                if confiavel:
                    for c in candidatos:
                        presentes.add(c["id"])
                    total_cards += 1
                    indice += 1
                    continue

                try:
                    driver.execute_script(
                        "arguments[0].scrollIntoView({block:'center'});", cards[indice]
                    )
                    time.sleep(0.3)
                    cards[indice].click()
                    time.sleep(3)
                    perfil = scraper.extrair_perfil(driver, config.selenium_timeout)
                    url_perfil = driver.current_url.strip()

                    encontrados = por_nome.get(normalizar(perfil.nome), [])
                    if not encontrados and url_perfil in por_url:
                        encontrados = [por_url[url_perfil]]

                    if encontrados:
                        for c in encontrados:
                            presentes.add(c["id"])
                        print(f"    [ok] {rotulo or '(sem rotulo)'} -> {perfil.nome}")
                    else:
                        no_cubo_sem_banco.append(perfil.nome or rotulo)
                        print(f"    [?] no Cubo e fora do banco: {perfil.nome}")
                    total_cards += 1
                except Exception as erro:
                    nao_resolvidos.append(rotulo or "(sem rotulo)")
                    print(f"    [!] Nao resolvido: {rotulo!r} -> {erro}")
                finally:
                    driver.get(url_pagina)
                    time.sleep(4)
                    driver.execute_script(
                        "window.scrollTo(0, document.body.scrollHeight);"
                    )
                    time.sleep(1)
                    driver.execute_script("window.scrollTo(0, 0);")
                    time.sleep(1)
                    cards = driver.find_elements(
                        By.CSS_SELECTOR, "div[role='button'][aria-label]"
                    )
                    rotulos = ler_rotulos(cards)

                indice += 1

            pagina += 1
    finally:
        try:
            driver.quit()
        except Exception:
            pass

    remover = [s for s in startups if s["id"] not in presentes]

    relatorio = {
        "detectado_em": datetime.now(timezone.utc).isoformat(),
        "total_no_cubo": len(rotulos_vistos),
        "total_cards_processados": total_cards,
        "total_no_banco": len(startups),
        "mantidas": len(presentes),
        "remover": len(remover),
        "nao_resolvidos": nao_resolvidos,
        "no_cubo_sem_banco": no_cubo_sem_banco,
        "ids_mantidos": sorted(presentes),
        "startups_remover": [
            {"id": s["id"], "nome": s["nome"], "status": s["status"]} for s in remover
        ],
    }

    with open(ARQUIVO_RELATORIO, "w", encoding="utf-8") as f:
        json.dump(relatorio, f, ensure_ascii=False, indent=2)

    return relatorio


def _selecionar_duplicatas(mantidos: list[dict]) -> list[dict]:
    """Retorna as linhas mais antigas de cada nome normalizado duplicado."""
    grupos: dict[str, list[dict]] = {}
    for s in mantidos:
        grupos.setdefault(normalizar(s["nome"]), []).append(s)

    antigas: list[dict] = []
    for arr in grupos.values():
        if len(arr) > 1:
            ordenadas = sorted(
                arr, key=lambda s: (s.get("data_adicionado") or "", s["id"])
            )
            antigas.extend(ordenadas[:-1])
    return antigas


def aplicar(supabase) -> None:
    """Remove do banco as startups marcadas no relatorio de sincronizacao."""
    if not ARQUIVO_RELATORIO.exists():
        print("ERRO: rode a coleta antes (sem --aplicar).")
        sys.exit(1)

    with open(ARQUIVO_RELATORIO, encoding="utf-8") as f:
        relatorio = json.load(f)

    if relatorio.get("nao_resolvidos"):
        print("ERRO: ha cards nao resolvidos na coleta — nao vou remover nada.")
        for nome in relatorio["nao_resolvidos"]:
            print(f"  - {nome}")
        sys.exit(1)

    nomes: dict[str, str] = {
        s["id"]: s["nome"] for s in relatorio.get("startups_remover", [])
    }
    remover_ids = [s["id"] for s in relatorio.get("startups_remover", [])]

    # Duplicatas remanescentes entre as mantidas (mesmo nome normalizado):
    # mantem a mais recente e remove as antigas.
    mantidos = (
        supabase.table("startups")
        .select("id, nome, data_adicionado")
        .in_("id", relatorio.get("ids_mantidos", []))
        .execute()
        .data
        or []
    )
    duplicatas = _selecionar_duplicatas(mantidos)
    if duplicatas:
        print(f"Duplicatas remanescentes: {len(duplicatas)}")
        for d in duplicatas:
            print(f"  - {d['nome']} ({d.get('data_adicionado') or '?'})")
            nomes[d["id"]] = d["nome"]
            remover_ids.append(d["id"])

    remover_ids = list(dict.fromkeys(remover_ids))
    if not remover_ids:
        print("Nada a remover.")
        return

    print()
    print(f"Removendo {len(remover_ids)} startups...")

    # Backup das linhas completas antes de apagar
    resposta = supabase.table("startups").select("*").in_("id", remover_ids).execute()
    with open(ARQUIVO_BACKUP, "w", encoding="utf-8") as f:
        json.dump(resposta.data or [], f, ensure_ascii=False, indent=2)
    print(f"Backup salvo em: {ARQUIVO_BACKUP}")

    # Referencias que impedem/importam na remocao
    refs: dict[str, dict[str, int]] = {t: {} for t in TABELAS_REF}
    for tabela in TABELAS_REF:
        try:
            dados = supabase.table(tabela).select("startup_id").in_(
                "startup_id", remover_ids
            ).execute()
        except Exception as erro:
            print(f"  [!] Tabela {tabela} indisponivel (ignorada): {erro}")
            continue
        for row in dados.data or []:
            sid = row.get("startup_id")
            if sid:
                refs[tabela][sid] = refs[tabela].get(sid, 0) + 1

    protegidas = []
    removidas = 0
    erros = 0

    for sid in remover_ids:
        nome = nomes.get(sid, sid)

        if refs["propostas"].get(sid) or refs["parcerias"].get(sid):
            protegidas.append(nome)
            print(f"  [protegida] {nome} (tem proposta/parceria — nao removida)")
            continue

        try:
            # Tabelas sem ON DELETE CASCADE (NO ACTION) precisam ser limpas antes
            supabase.table("startup_departamentos").delete().eq("startup_id", sid).execute()
            supabase.table("destaques_lab").delete().eq("startup_id", sid).execute()
            supabase.table("startups").delete().eq("id", sid).execute()
            removidas += 1
        except Exception as erro:
            erros += 1
            print(f"  [!] Erro ao remover {nome}: {erro}")

    resposta = supabase.table("startups").select("id", count="exact").execute()
    print()
    print("=" * 60)
    print("  RESUMO DA REMOCAO")
    print("=" * 60)
    print(f"  Removidas:  {removidas}")
    print(f"  Protegidas: {len(protegidas)}")
    print(f"  Erros:      {erros}")
    print(f"  Startups no banco agora: {resposta.count if resposta.count is not None else '?'}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--aplicar",
        action="store_true",
        help="Remove do banco as startups do relatorio (rode a coleta antes).",
    )
    args = parser.parse_args()

    config = load_config()
    if not config.supabase_url or not config.supabase_service_role_key:
        print("ERRO: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nao configurados.")
        sys.exit(1)

    supabase = criar_cliente_supabase(
        config.supabase_url, config.supabase_service_role_key
    )

    if args.aplicar:
        aplicar(supabase)
        return

    if not config.cubo_email or not config.cubo_password:
        print("ERRO: CUBO_EMAIL e CUBO_PASSWORD nao configurados.")
        sys.exit(1)

    relatorio = coletar(supabase, config)

    print()
    print("=" * 60)
    print("  RELATORIO DE SINCRONIZACAO (nada foi removido)")
    print("=" * 60)
    print(f"  No Cubo:          {relatorio['total_no_cubo']}")
    print(f"  Cards lidos:      {relatorio['total_cards_processados']}")
    print(f"  No banco:         {relatorio['total_no_banco']}")
    print(f"  Mantidas:         {relatorio['mantidas']}")
    print(f"  A remover:        {relatorio['remover']}")
    print(f"  Nao resolvidos:   {len(relatorio['nao_resolvidos'])}")
    print(f"  No Cubo sem banco:{len(relatorio['no_cubo_sem_banco'])}")
    print()
    print("  --- A REMOVER ---")
    for s in relatorio["startups_remover"]:
        print(f"  - {s['nome']} | status: {s['status']}")
    if relatorio["no_cubo_sem_banco"]:
        print()
        print("  --- NO CUBO MAS FORA DO BANCO (nao serao adicionadas agora) ---")
        for nome in relatorio["no_cubo_sem_banco"]:
            print(f"  - {nome}")
    print()
    print(f"  Relatorio salvo em: {ARQUIVO_RELATORIO}")
    print("  Para aplicar: python scripts/sincronizar_startups_cubo.py --aplicar")


if __name__ == "__main__":
    main()
