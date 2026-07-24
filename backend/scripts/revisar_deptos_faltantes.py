"""Revisao focada: pede ao Gemini para reanalisar startups nos departamentos
Area tecnica e Equipe Medica, que ficaram com poucas associacoes.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from cubo.config import load_config
from cubo.gemini import GeminiClient, GeminiDailyQuotaExceeded, GeminiTemporaryRateLimit, GeminiQuotaError
from cubo.empresa import CONTEXTO_COMPLETO

ARQUIVO_STARTUPS = Path(__file__).resolve().parent.parent / "data" / "raw" / "startups_cubo.json"
ARQUIVO_SAIDA = Path(__file__).resolve().parent.parent / "data" / "processed" / "departamentos_startups.json"
ARQUIVO_LOG = Path(__file__).resolve().parent.parent / "data" / "processed" / "revisao_area_tecnica_equipe_medica.json"

LOTE = 10

DEPARTAMENTOS_ALVO = ["Area tecnica", "Equipe Medica"]

CONTEXTO_DEPTOS = {
    "Area tecnica": (
        "Fluxo laboratorial — automacao de processos laboratoriais, "
        "equipamentos de diagnostico, analisadores bioquimicos, hematologia, "
        "imunologia, microbiologia clinica, citologia, histopatologia, "
        "gestao de amostras (pre-analitico, analitico, pos-analitico), "
        "LIS (Sistema de Informacao Laboratorial), controle de temperatura"
    ),
    "Equipe Medica": (
        "Analise histopatologica — patologistas e medicos patologistas, "
        "analise de laminas, diagnostico anatomopatologico, imuno-histoquimica, "
        "citologia oncótica, biopsias, laudos anatomopatologicos, "
        "correlacao clinico-patologica, segunda opiniao diagnostica, "
        "telepatologia, digitalizacao de laminas (whole slide imaging)"
    ),
}

SYSTEM_PROMPT = (
    "Voce e um consultor especializado em inovacao para laboratorios de "
    "medicina diagnostica. Seu cliente e:\n\n"
    f"{CONTEXTO_COMPLETO}\n\n"
    "---\n\n"
    "ATENCAO: Voce esta recebendo uma REVISAO. Uma analise anterior associou "
    "pouquissimas startups aos departamentos abaixo. Seu trabalho e revisar "
    "TODAS as startups desta lista e identificar quaisquer que TENHAM SIDO "
    "PERDIDAS — startups que DEVERIAM ter sido associadas a estes departamentos "
    "mas nao foram.\n\n"
    "Os departamentos a revisar sao:\n\n"
)

for depto in DEPARTAMENTOS_ALVO:
    SYSTEM_PROMPT += f"- **{depto}**: {CONTEXTO_DEPTOS[depto]}\n"

SYSTEM_PROMPT += (
    "\nINSTRUCOES:\n"
    "- Revise CADA startup da lista. Nao pule nenhuma.\n"
    "- Se uma startup ja foi corretamente classificada em OUTROS departamentos "
    "mas TAMBEM deveria estar nestes, INCLUA-A.\n"
    "- Amplie seu criterio: a startup nao precisa ser EXCLUSIVAMENTE destes "
    "departamentos. Se a tecnologia/solucao TEM APLICACAO DIRETA em area "
    "tecnica laboratorial ou equipe medica/patologia, associe.\n"
    "- Considere: startups de IA para imagem medica podem servir a Equipe Medica. "
    "Startups de automacao de processos podem servir a Area tecnica.\n"
    "- Startups de saude digital, telemedicina, gestao de laudos, interoperabilidade "
    "(HL7/FHIR), digitalizacao de laminas — tudo isso pode se encaixar.\n"
    "- Se a startup NAO se encaixa em nenhum destes dois departamentos, "
    "nao a inclua.\n\n"
    "Retorne APENAS um JSON valido no formato:\n"
    "{\n"
    '  "startups": [\n'
    "    {\n"
    '      "nome": "Nome da Startup",\n'
    '      "departamentos": [\n'
    "        {\n"
    '          "departamento": "Area tecnica" ou "Equipe Medica",\n'
    '          "confianca": "alta" ou "media",\n'
    '          "aderencia_lab": "alta" ou "media" ou "baixa",\n'
    '          "analise": "1-2 frases explicando o racional",\n'
    '          "avaliacao": {\n'
    '            "problema_atendido": "1 frase curta",\n'
    '            "aderencia_saude": "1 frase curta",\n'
    '            "maturidade": "1 frase curta",\n'
    '            "integracao": "1 frase curta",\n'
    '            "conformidade": "1 frase curta",\n'
    '            "impacto": "1 frase curta",\n'
    '            "prazo": "1 frase curta",\n'
    '            "riscos": "1 frase curta",\n'
    '            "piloto": "1 frase curta"\n'
    "          }\n"
    "        }\n"
    "      ]\n"
    "    }\n"
    "  ]\n"
    "}\n"
    "MAXIMO 15 palavras por campo de avaliacao. Seja direto."
)


def executar() -> None:
    config = load_config()

    if not config.gemini_api_key:
        print("ERRO: GEMINI_API_KEY nao configurada.")
        sys.exit(1)

    print(f"Modelo: {config.gemini_model}")
    print(f"Lote: {LOTE}")

    with open(ARQUIVO_STARTUPS, encoding="utf-8") as f:
        startups = json.load(f)

    with open(ARQUIVO_SAIDA, encoding="utf-8") as f:
        dados_atuais = json.load(f)

    deptos_atuais = dados_atuais.get("departamentos", {})
    nomes_existentes: dict[str, set[str]] = {
        d: {s["nome"] for s in deptos_atuais.get(d, [])}
        for d in DEPARTAMENTOS_ALVO
    }

    print(f"Area tecnica atual: {len(nomes_existentes['Area tecnica'])} startups")
    print(f"Equipe Medica atual: {len(nomes_existentes['Equipe Medica'])} startups")
    print(f"Total a revisar: {len(startups)}")
    print()

    client = GeminiClient(
        api_key=config.gemini_api_key,
        model_name=config.gemini_model,
        max_retries=config.gemini_max_retries,
    )

    novos: dict[str, list[dict]] = {d: [] for d in DEPARTAMENTOS_ALVO}

    for inicio in range(0, len(startups), LOTE):
        fim = min(inicio + LOTE, len(startups))
        lote = startups[inicio:fim]
        print(f"Revisando {inicio + 1}-{fim} de {len(startups)}...")

        blocos = []
        for i, s in enumerate(lote, inicio + 1):
            blocos.append(
                f"--- Startup {i} ---\n"
                f"Nome: {s['nome']}\n"
                f"Descricao: {s.get('descricao', '')[:400]}\n"
                f"Segmento: {s.get('segmento', 'N/I')}\n"
                f"Tecnologias: {', '.join(s.get('tecnologias', []))}\n"
                f"Modelos de negocio: {', '.join(s.get('modelos_negocio', []))}\n"
            )

        prompt = "Revise as seguintes startups para Area tecnica e Equipe Medica:\n\n" + "\n".join(blocos)

        try:
            # Usa o system prompt customizado de revisao
            client._system_prompt = SYSTEM_PROMPT
            resposta = client.classificar_lote(lote)
        except GeminiDailyQuotaExceeded as exc:
            print(f"\n[COTA DIARIA] {exc}")
            break
        except (GeminiTemporaryRateLimit, GeminiQuotaError) as exc:
            print(f"\n[ERRO COTA] {exc}")
            break
        except Exception as exc:
            print(f"  [!] Erro: {exc}")
            continue

        for c in resposta.get("startups", []):
            nome = c.get("nome", "")
            for d in c.get("departamentos", []):
                depto_nome = d.get("departamento", "")
                if depto_nome in novos and nome not in nomes_existentes[depto_nome]:
                    novos[depto_nome].append({
                        "nome": nome,
                        "confianca": d.get("confianca", "media"),
                        "aderencia_lab": d.get("aderencia_lab", "media"),
                        "analise": d.get("analise", ""),
                        "avaliacao": d.get("avaliacao", {}),
                    })
                    nomes_existentes[depto_nome].add(nome)

        print(f"  Novos: Area tecnica={len(novos['Area tecnica'])}, Equipe Medica={len(novos['Equipe Medica'])}")

    # Merge
    for depto in DEPARTAMENTOS_ALVO:
        deptos_atuais[depto].extend(novos[depto])

    dados_atuais["departamentos"] = deptos_atuais

    with open(ARQUIVO_SAIDA, "w", encoding="utf-8") as f:
        json.dump(dados_atuais, f, ensure_ascii=False, indent=2)

    # Relatorio
    print(f"\n{'=' * 50}")
    print("  REVISAO CONCLUIDA")
    print(f"{'=' * 50}")
    for depto in DEPARTAMENTOS_ALVO:
        total = len(deptos_atuais[depto])
        novos_count = len(novos[depto])
        print(f"  {depto}: {total} total (+{novos_count} novos)")
    print(f"\n  Salvo em: {ARQUIVO_SAIDA}")


if __name__ == "__main__":
    executar()
