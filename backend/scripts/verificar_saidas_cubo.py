"""Compara as startups do banco com as que estao no portal do Cubo.

Somente leitura no banco: gera um relatorio (JSON + console) das startups que
temos cadastradas e que nao aparecem mais na busca do Cubo, confirmando cada
candidata abrindo o respectivo perfil.

Uso:
    python scripts/verificar_saidas_cubo.py
"""

from __future__ import annotations

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

ARQUIVO_SAIDA = (
    Path(__file__).resolve().parent.parent / "data" / "processed" / "saidas_cubo.json"
)


def normalizar(nome: str) -> str:
    """Normaliza nome para comparacao (unicode, caixa e espacos)."""
    texto = unicodedata.normalize("NFKC", nome or "").casefold()
    return " ".join(texto.split())


def main() -> None:
    config = load_config()

    if not config.cubo_email or not config.cubo_password:
        print("ERRO: CUBO_EMAIL e CUBO_PASSWORD nao configurados no backend/.env")
        sys.exit(1)
    if not config.supabase_url or not config.supabase_service_role_key:
        print("ERRO: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nao configurados no backend/.env")
        sys.exit(1)

    supabase = criar_cliente_supabase(
        config.supabase_url, config.supabase_service_role_key
    )
    resposta = supabase.table("startups").select("id, nome, url_perfil, status").execute()
    startups = resposta.data or []

    print("=" * 60)
    print("  VERIFICACAO DE SAIDAS DO CUBO")
    print("=" * 60)
    print(f"  Startups no banco: {len(startups)}")
    print()

    driver = scraper.criar_driver(headless=config.headless)
    saidas: list[dict] = []
    total_cubo = 0
    nomes_cubo: set[str] = set()

    try:
        ok = scraper.fazer_login(
            driver,
            config.cubo_email,
            config.cubo_password,
            timeout=config.selenium_timeout,
        )
        if not ok:
            print("ERRO: login no Cubo falhou.")
            sys.exit(1)

        total_cubo, nomes_cubo = scraper.coletar_nomes_cubo(
            driver, timeout=config.selenium_timeout
        )

        norm_cubo = {normalizar(n) for n in nomes_cubo}
        candidatas = [s for s in startups if normalizar(s["nome"]) not in norm_cubo]

        print()
        print(f"  Nomes coletados no Cubo: {len(nomes_cubo)} (header: {total_cubo or '?'})")
        print(f"  Nomes no banco:          {len(startups)}")
        print(f"  Candidatas a saida:      {len(candidatas)}")
        print()

        for i, s in enumerate(candidatas, 1):
            nome = s["nome"]
            url = (s.get("url_perfil") or "").strip()
            resultado = "sem_url"
            url_final = ""

            if url:
                try:
                    driver.get(url)
                    time.sleep(3)
                    url_final = driver.current_url
                    corpo = driver.find_element(By.TAG_NAME, "body").text
                    if normalizar(nome) in normalizar(corpo):
                        resultado = "nao_confirmada"
                    else:
                        resultado = "confirmada"
                except Exception as erro:
                    resultado = "erro_ao_abrir"
                    print(f"    [!] Erro ao abrir {url}: {erro}")

            saidas.append(
                {
                    "nome": nome,
                    "status": s.get("status"),
                    "url_perfil": url,
                    "resultado": resultado,
                    "url_final": url_final,
                }
            )
            print(f"  [{i}/{len(candidatas)}] {resultado:15s} | {nome}")
    finally:
        try:
            driver.quit()
        except Exception:
            pass

    confirmadas = [s for s in saidas if s["resultado"] == "confirmada"]

    relatorio = {
        "detectado_em": datetime.now(timezone.utc).isoformat(),
        "total_no_cubo": len(nomes_cubo),
        "total_no_banco": len(startups),
        "candidatas": len(saidas),
        "confirmadas": len(confirmadas),
        "saidas": saidas,
    }

    ARQUIVO_SAIDA.parent.mkdir(parents=True, exist_ok=True)
    with open(ARQUIVO_SAIDA, "w", encoding="utf-8") as f:
        json.dump(relatorio, f, ensure_ascii=False, indent=2)

    print()
    print("=" * 60)
    print("  RESUMO")
    print("=" * 60)
    print(f"  No Cubo agora: {len(nomes_cubo)}")
    print(f"  No banco:      {len(startups)}")
    print(f"  Candidatas:    {len(saidas)} (confirmadas: {len(confirmadas)})")
    print()

    if confirmadas:
        print("  --- CONFIRMADAS (sairam do Cubo) ---")
        for s in confirmadas:
            print(
                f"  [SAIU] {s['nome']} | status: {s['status']} | "
                f"{s['url_perfil'] or '(sem url)'}"
            )
        print()

    outras = [s for s in saidas if s["resultado"] != "confirmada"]
    if outras:
        print("  --- NAO CONFIRMADAS ---")
        for s in outras:
            print(
                f"  [{s['resultado']}] {s['nome']} | {s['url_perfil'] or '(sem url)'}"
            )
        print()

    print(f"  Relatorio salvo em: {ARQUIVO_SAIDA}")


if __name__ == "__main__":
    main()
