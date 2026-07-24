"""Cliente Google Gemini para classificacao de startups em departamentos.

Abstrai a conexao com a API, o system prompt com os departamentos e
contexto da empresa, e a logica de classificacao em lote com parsing
de resposta JSON incluindo analise e avaliacao detalhada.
"""

from __future__ import annotations

import json
import logging
import random
import time

from google import genai
from google.genai import types
from google.genai.errors import ClientError

from cubo.empresa import (
    CONTEXTO_COMPLETO,
    CRITERIOS_AVALIACAO,
    AVISO_DADOS_PUBLICOS,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Excecoes especificas
# ---------------------------------------------------------------------------


class GeminiQuotaError(Exception):
    """Erro relacionado a cota da API Gemini."""


class GeminiDailyQuotaExceeded(GeminiQuotaError):
    """Cota diaria do Gemini esgotada — nao fazer retry."""


class GeminiTemporaryRateLimit(GeminiQuotaError):
    """Limite temporario (RPM/TPM) — pode tentar novamente com backoff."""


# ---------------------------------------------------------------------------
# Definicoes dos departamentos
# ---------------------------------------------------------------------------

DEPARTAMENTOS = [
    "Atendimento",
    "Comercial",
    "Qualidade",
    "Transporte",
    "Biologia Molecular",
    "Faturamento",
    "RH",
    "\u00c1rea T\u00e9cnica",
    "Estoque",
    "Financeiro",
    "TI",
    "Equipe M\u00e9dica",
]

DESCRICAO_DEPTOS: dict[str, str] = {
    "Atendimento": (
        "Frente geral de atendimento do laboratorio — recepcao de pacientes, "
        "agendamento de exames, triagem, liberacao de laudos, contato com "
        "medicos solicitantes, call center, SAC laboratorial"
    ),
    "Comercial": (
        "Relacionamento com parceiros — convenios com planos de saude, "
        "contratos com hospitais e clinicas, prospeccao de novos clientes "
        "B2B, gestao de carteira de medicos parceiros, CRM, representantes comerciais"
    ),
    "Qualidade": (
        "Controle de qualidade de processos e auditoria — ISO 9001, ISO 15189, "
        "BPF, acreditacao laboratorial (PALC, DICQ), auditorias internas e externas, "
        "nao conformidades, acoes corretivas, indicadores de qualidade, "
        "controle de qualidade interno e externo (CQI/CQE)"
    ),
    "Transporte": (
        "Logistica laboratorial — coleta e transporte de amostras biologicas, "
        "frota de veiculos, rotas de coleta, logistica reversa de materiais, "
        "cadeia fria, rastreamento de amostras, entregas de kits e insumos, "
        "motoboys, motoristas, tracking em tempo real"
    ),
    "Biologia Molecular": (
        "Patologia molecular — extracao de DNA/RNA, PCR em tempo real, "
        "sequenciamento NGS, analise de mutacoes geneticas, biomarcadores "
        "moleculares, medicina personalizada, oncologia molecular, "
        "farmacogenetica, diagnostico molecular de doencas infecciosas"
    ),
    "Faturamento": (
        "Responsavel pela gestao de faturamento de plano de saude — TISS/ANS, "
        "TUSS, guias de procedimentos, autorizacoes, glosas, conciliacao de "
        "repasses, fechamento de lote, integracao com operadoras, "
        "faturamento SUS, contas medicas, analise de glosas hospitalares"
    ),
    "RH": (
        "Setor de recursos humanos e departamento pessoal — recrutamento e "
        "selecao de profissionais de saude, folha de pagamento, controle de "
        "ponto, ferias, beneficios, medicina ocupacional, treinamento de "
        "biosseguranca, gestao de escala e plantao, compliance trabalhista"
    ),
    "\u00c1rea T\u00e9cnica": (
        "Fluxo laboratorial — automacao de processos laboratoriais, "
        "equipamentos de diagnostico, analisadores bioquimicos, hematologia, "
        "imunologia, microbiologia clinica, citologia, histopatologia, "
        "gestao de amostras (pre-analitico, analitico, pos-analitico), "
        "LIS (Sistema de Informacao Laboratorial), controle de temperatura"
    ),
    "Estoque": (
        "Gestao de estoque — almoxarifado de reagentes e insumos laboratoriais, "
        "controle de validade, rastreabilidade de lotes, inventario de materiais, "
        "curva ABC, ponto de ressuprimento, integracao com fornecedores, "
        "controle de kits de coleta, EPIs, gestao de consumo por setor"
    ),
    "Financeiro": (
        "Gestao de contas a pagar e receber — tesouraria, fluxo de caixa, "
        "conciliacao bancaria, pagamento a fornecedores, controle de "
        "inadimplencia, negociacao de prazos, DRE, orcamento, "
        "gestao de custos operacionais laboratoriais, contabilidade"
    ),
    "TI": (
        "Tecnologia da informacao e AI — LIS/HIS, integracao de sistemas "
        "laboratoriais, infraestrutura de servidores, cloud computing, "
        "ciberseguranca de dados de pacientes (LGPD), inteligencia artificial "
        "para diagnostico, automacao RPA, APIs de interoperabilidade (HL7/FHIR), "
        "PACS, backup e disaster recovery"
    ),
    "Equipe M\u00e9dica": (
        "Analise histopatologica — patologistas e medicos patologistas, "
        "analise de laminas, diagnostico anatomopatologico, imuno-histoquimica, "
        "citologia oncótica, biopsias, laudos anatomopatologicos, "
        "correlacao clinico-patologica, segunda opiniao diagnostica, "
        "telepatologia, digitalizacao de laminas (whole slide imaging)"
    ),
}


def _construir_system_prompt() -> str:
    """Monta o system prompt com contexto da empresa, departamentos e criterios."""
    prompt = (
        f"{AVISO_DADOS_PUBLICOS}\n\n"
        "---\n\n"
        "Voce e um consultor especializado em inovacao para laboratorios "
        "de medicina diagnostica. Seu cliente e a empresa abaixo:\n\n"
        f"{CONTEXTO_COMPLETO}\n\n"
        "---\n\n"
        "Voce recebera uma lista de startups do ecossistema Cubo Itau "
        "com: nome, descricao, segmento, tecnologias e modelos de negocio.\n\n"
        "Para cada startup, analise se ela e relevante para cada um dos "
        "12 departamentos abaixo. Uma startup pode ser associada a "
        "multiplos departamentos ou a nenhum.\n\n"
        "DEPARTAMENTOS E SEU CONTEXTO NA LAB:\n"
    )
    for depto in DEPARTAMENTOS:
        prompt += f"- **{depto}**: {DESCRICAO_DEPTOS[depto]}\n"

    prompt += (
        "\nCRITERIOS DE ASSOCIACAO:\n"
        "- So associe se a startup REALMENTE entrega valor para aquele departamento\n"
        "- Nao associe so porque a tecnologia 'poderia ser usada'\n"
        "- Priorize startups cujo segmento, descricao ou tecnologias indicam foco real\n"
        '- Para "Biologia Molecular", "Qualidade" e "Equipe Medica": seja muito restritivo\n'
        '- Para "TI": so associe se a startup e DO setor de TI/saude digital\n\n'
        "NIVEIS DE ADERENCIA A LAB:\n"
        "- Use aderencia_lab = 'alta' quando a startup resolve um problema "
        "real e especifico da LAB hoje (4 unidades, Brasilia, foco em patologia)\n"
        "- Use aderencia_lab = 'media' quando e relevante mas indireto ou generico\n"
        "- Use aderencia_lab = 'baixa' quando faz sentido para o departamento "
        "mas tem pouca aderencia ao contexto especifico da LAB\n\n"
        f"{CRITERIOS_AVALIACAO}\n\n"
        "FORMATO DE SAIDA — retorne APENAS um JSON valido:\n"
        "{\n"
        '  "destaque_lab": ["Startup X", "Startup Y"],\n'
        '  "startups": [\n'
        "    {\n"
        '      "nome": "Nome da Startup",\n'
        '      "departamentos": [\n'
        "        {\n"
        '          "departamento": "Nome do Depto",\n'
        '          "confianca": "alta" ou "media",\n'
        '          "aderencia_lab": "alta" ou "media" ou "baixa",\n'
        '          "analise": "1-2 frases explicando o racional da associacao '
        "e o valor especifico para a LAB. Mencione a dor resolvida, o impacto "
        'esperado e a viabilidade para a LAB.",\n'
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
        "}\n\n"
        "REGRAS IMPORTANTES:\n"
        '- "destaque_lab": liste de 8 a 15 startups MAIS RELEVANTES para a LAB.\n'
        '- "analise": MAXIMO 3 frases curtas. Seja direto.\n'
        '- CADA CAMPO de "avaliacao": MAXIMO 15 palavras. UMA frase.\n'
        '- Nao repita informacao entre analise e avaliacao.\n'
        '- "confianca": "alta" = claramente focada no departamento. '
        '"media" = aplicacao relevante mas nao e o foco principal.\n'
        "- Se nenhum departamento for relevante, retorne \"departamentos\": [].\n"
        "- CERTIFIQUE-SE de que o JSON esta completo e bem formatado."
    )
    return prompt


# ---------------------------------------------------------------------------
# Helpers de erro
# ---------------------------------------------------------------------------


def _classificar_erro_429(exc: Exception) -> GeminiQuotaError:
    """Analisa um erro 429 e retorna a excecao especifica adequada."""
    erro_str = str(exc)

    # Tenta extrair detalhes estruturados do ClientError
    detalhes_raw: list[dict] = []
    if isinstance(exc, ClientError) and hasattr(exc, "response"):
        try:
            body = exc.response.json() if callable(exc.response.json) else {}
        except Exception:
            body = {}
        error_block = body.get("error", {})
        detalhes_raw = error_block.get("details", [])

    # Extrai informacoes de cota
    modelo = ""
    metrica = ""
    quota_id = ""

    for detail in detalhes_raw:
        violations = detail.get("violations", [])
        for v in violations:
            modelo = v.get("quotaDimensions", {}).get("model", modelo)
            metrica_val = v.get("quotaMetric", "")
            quota_val = v.get("quotaId", "")
            if "PerDay" in quota_val:
                metrica = metrica_val
                quota_id = quota_val
            elif not quota_id:
                metrica = metrica_val
                quota_id = quota_val

    # Se nao conseguiu extrair, usa busca textual
    if not quota_id and "RESOURCE_EXHAUSTED" in erro_str:
        if "GenerateRequestsPerDay" in erro_str:
            quota_id = "GenerateRequestsPerDay"
        elif "GenerateContentInputTokensPerModelPerMinute" in erro_str:
            quota_id = "InputTokensPerMinute"
        elif "GenerateRequestsPerMinute" in erro_str:
            quota_id = "GenerateRequestsPerMinute"

    if not modelo and "model:" in erro_str:
        idx = erro_str.find("model:")
        if idx >= 0:
            modelo = erro_str[idx + 6:].split("\n")[0].strip()

    # Classifica
    if quota_id and "PerDay" in quota_id:
        return GeminiDailyQuotaExceeded(
            f"Cota diaria do Gemini esgotada para o modelo {modelo or 'configurado'}. "
            f"Metrica: {metrica or quota_id}. "
            "O processamento foi interrompido e os resultados ja concluidos foram preservados."
        )

    return GeminiTemporaryRateLimit(
        f"Limite temporario do Gemini atingido. "
        f"Modelo: {modelo or 'configurado'}. "
        f"Metrica: {metrica or quota_id or 'desconhecida'}. "
        f"Detalhes: {erro_str[:200]}"
    )


# ---------------------------------------------------------------------------
# Cliente Gemini
# ---------------------------------------------------------------------------


class GeminiClient:
    """Cliente para o Google Gemini com system prompt contextualizado."""

    def __init__(
        self,
        api_key: str,
        model_name: str,
        max_retries: int = 3,
    ) -> None:
        if not api_key:
            raise ValueError("GEMINI_API_KEY nao configurada.")
        if not model_name:
            raise ValueError("GEMINI_MODEL nao configurado.")

        self._client = genai.Client(
            api_key=api_key,
        )
        self._model_name = model_name
        self._system_prompt = _construir_system_prompt()
        self._max_retries = max_retries

    @property
    def model_name(self) -> str:
        return self._model_name

    def classificar_lote(self, startups: list[dict]) -> dict:
        """Classifica um lote de startups nos departamentos com analise detalhada.

        Args:
            startups: Lista de dicionarios com chaves ``nome``, ``descricao``,
                ``segmento``, ``tecnologias`` e ``modelos_negocio``.

        Returns:
            Dicionario com ``startups`` (lista de classificacoes) e
            ``destaque_lab`` (lista de nomes).

        Raises:
            GeminiDailyQuotaExceeded: Cota diaria esgotada — nao tentar novamente.
            GeminiTemporaryRateLimit: Limite temporario — tentativas esgotadas.
            GeminiQuotaError: Outro erro de cota.
        """
        blocos = []
        for i, s in enumerate(startups, 1):
            bloco = (
                f"--- Startup {i} ---\n"
                f"Nome: {s['nome']}\n"
                f"Descricao: {s.get('descricao', '')[:400]}\n"
                f"Segmento: {s.get('segmento', 'N/I')}\n"
                f"Tecnologias: {', '.join(s.get('tecnologias', []))}\n"
                f"Modelos de negocio: {', '.join(s.get('modelos_negocio', []))}\n"
            )
            blocos.append(bloco)

        prompt = "Classifique as seguintes startups:\n\n" + "\n".join(blocos)

        logger.info(
            "Chamando Gemini: modelo=%s, lote=%d startup(s), tentativas_max=%d",
            self._model_name,
            len(startups),
            self._max_retries,
        )

        config = types.GenerateContentConfig(
            system_instruction=self._system_prompt,
            temperature=0.1,
            max_output_tokens=8192,
        )

        for tentativa in range(1, self._max_retries + 1):
            try:
                response = self._client.models.generate_content(
                    model=self._model_name,
                    contents=prompt,
                    config=config,
                )
                logger.info(
                    "Gemini OK: lote=%d startup(s), tentativa=%d",
                    len(startups),
                    tentativa,
                )
                return self._parse_resposta(response.text)

            except Exception as exc:
                erro_str = str(exc)
                is_429 = "429" in erro_str or "RESOURCE_EXHAUSTED" in erro_str

                if is_429:
                    quota_error = _classificar_erro_429(exc)

                    # Cota diaria — interrompe imediatamente
                    if isinstance(quota_error, GeminiDailyQuotaExceeded):
                        logger.warning(
                            "Cota diaria esgotada (modelo=%s, lote=%d). "
                            "Interrompendo retries imediatamente.",
                            self._model_name,
                            len(startups),
                        )
                        raise quota_error

                    # Limite temporario — backoff exponencial
                    if tentativa < self._max_retries:
                        jitter = random.uniform(0, 5)
                        espera = min(90, (2 ** tentativa) * 20 + jitter)

                        # Respeita retryDelay da API se for maior
                        retry_delay = self._extrair_retry_delay(exc)
                        if retry_delay and retry_delay > espera:
                            espera = min(90, retry_delay + jitter)

                        logger.warning(
                            "Limite temporario (tentativa %d/%d, modelo=%s). "
                            "Aguardando %.0fs...",
                            tentativa,
                            self._max_retries,
                            self._model_name,
                            espera,
                        )
                        time.sleep(espera)
                        continue

                    # Esgotou tentativas para limite temporario
                    logger.error(
                        "Limite temporario — tentativas esgotadas (modelo=%s). "
                        "%s",
                        self._model_name,
                        str(quota_error)[:200],
                    )
                    raise quota_error

                # Erro nao relacionado a cota — nao faz retry
                logger.error(
                    "Erro na API Gemini (nao-recuperavel, modelo=%s): %s",
                    self._model_name,
                    erro_str[:300],
                )
                raise

        # Nao deve chegar aqui, mas por seguranca
        return {}

    @staticmethod
    def _extrair_retry_delay(exc: Exception) -> float | None:
        """Tenta extrair o retryDelay do corpo do erro 429."""
        if isinstance(exc, ClientError) and hasattr(exc, "response"):
            try:
                body = exc.response.json() if callable(exc.response.json) else {}
            except Exception:
                return None
            details = body.get("error", {}).get("details", [])
            for d in details:
                rd = d.get("retryDelay")
                if rd:
                    try:
                        return float(str(rd).replace("s", ""))
                    except (ValueError, TypeError):
                        pass
        return None

    @staticmethod
    def _parse_resposta(texto: str) -> dict:
        """Extrai o JSON da resposta do Gemini, removendo fences markdown."""
        if texto is None:
            return {}
        texto = texto.strip()
        if texto.startswith("```json"):
            texto = texto[7:]
        elif texto.startswith("```"):
            texto = texto[3:]
        if texto.endswith("```"):
            texto = texto[:-3]
        texto = texto.strip()

        try:
            dados = json.loads(texto)
            return {
                "startups": dados.get("startups", []),
                "destaque_lab": dados.get("destaque_lab", []),
            }
        except json.JSONDecodeError:
            logger.warning(
                "Falha ao parsear JSON do Gemini. Resposta: %s", texto[:500]
            )
            return {}
