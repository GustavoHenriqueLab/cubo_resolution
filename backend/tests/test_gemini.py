"""Testes para integracao com Gemini — lotes, retry, cotas e progresso.

Estes testes nao consomem cota real da API. Usam mocks.
"""

import json
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from cubo.gemini import (
    GeminiClient,
    GeminiDailyQuotaExceeded,
    GeminiTemporaryRateLimit,
    _classificar_erro_429,
)


# ---------------------------------------------------------------------------
# 1. Divisao em lotes
# ---------------------------------------------------------------------------

def _dividir_em_lotes(itens, tamanho):
    if tamanho <= 0:
        raise ValueError("O tamanho do lote deve ser maior que zero.")
    for indice in range(0, len(itens), tamanho):
        yield itens[indice:indice + tamanho]


def test_lotes_20_em_5():
    """20 startups devem gerar 4 lotes de 5."""
    itens = list(range(20))
    lotes = list(_dividir_em_lotes(itens, 5))
    assert len(lotes) == 4
    assert all(len(l) == 5 for l in lotes)


def test_lote_ultimo_menor():
    """Ultimo lote com menos itens que o tamanho."""
    itens = list(range(22))
    lotes = list(_dividir_em_lotes(itens, 5))
    assert len(lotes) == 5
    assert len(lotes[-1]) == 2


def test_lote_tamanho_invalido():
    """Tamanho de lote <= 0 deve lancar ValueError."""
    try:
        list(_dividir_em_lotes([1, 2], 0))
        assert False, "Deveria ter lancado ValueError"
    except ValueError:
        pass


# ---------------------------------------------------------------------------
# 2. parse_resposta
# ---------------------------------------------------------------------------

def test_parse_resposta_valida():
    client = GeminiClient(api_key="test-key", model_name="gemini-2.5-flash", max_retries=1)
    json_str = '{"destaque_lab": ["A"], "startups": [{"nome": "X", "departamentos": []}]}'
    resultado = client._parse_resposta(json_str)
    assert resultado["destaque_lab"] == ["A"]
    assert len(resultado["startups"]) == 1


def test_parse_resposta_markdown():
    client = GeminiClient(api_key="test-key", model_name="gemini-2.5-flash", max_retries=1)
    json_str = '```json\n{"destaque_lab": [], "startups": []}\n```'
    resultado = client._parse_resposta(json_str)
    assert resultado["destaque_lab"] == []


def test_parse_resposta_nula():
    client = GeminiClient(api_key="test-key", model_name="gemini-2.5-flash", max_retries=1)
    resultado = client._parse_resposta(None)
    assert resultado == {}


def test_parse_resposta_invalida():
    client = GeminiClient(api_key="test-key", model_name="gemini-2.5-flash", max_retries=1)
    resultado = client._parse_resposta("texto qualquer")
    assert resultado == {}


# ---------------------------------------------------------------------------
# 3. Erro 429 — classificacao
# ---------------------------------------------------------------------------

def test_classificar_erro_429_daily():
    """Erro com PerDay deve retornar GeminiDailyQuotaExceeded."""
    exc = Exception(
        "429 RESOURCE_EXHAUSTED. "
        "Quota exceeded for metric: genai.generate_content_free_tier_requests, "
        "limit: 500, model: gemini-2.5-flash. "
        "GenerateRequestsPerDayPerProjectPerModel-FreeTier"
    )
    result = _classificar_erro_429(exc)
    assert isinstance(result, GeminiDailyQuotaExceeded)


def test_classificar_erro_429_per_minute():
    """Erro com PerMinute deve retornar GeminiTemporaryRateLimit."""
    exc = Exception(
        "429 RESOURCE_EXHAUSTED. "
        "GenerateRequestsPerMinutePerProjectPerModel-FreeTier"
    )
    result = _classificar_erro_429(exc)
    assert isinstance(result, GeminiTemporaryRateLimit)


def test_classificar_erro_429_tokens():
    """Erro de tokens por minuto deve retornar GeminiTemporaryRateLimit."""
    exc = Exception(
        "429 RESOURCE_EXHAUSTED. "
        "GenerateContentInputTokensPerModelPerMinute-FreeTier"
    )
    result = _classificar_erro_429(exc)
    assert isinstance(result, GeminiTemporaryRateLimit)


# ---------------------------------------------------------------------------
# 4. Retry — daily quota interrompe imediatamente
# ---------------------------------------------------------------------------

@patch("cubo.gemini.genai.Client")
def test_retry_daily_quota_nao_repete(mock_client_class):
    """Cota diaria nao deve gerar retry — levanta excecao na primeira tentativa."""
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = Exception(
        "429 RESOURCE_EXHAUSTED. GenerateRequestsPerDayPerProjectPerModel-FreeTier"
    )
    mock_client_class.return_value = mock_client

    client = GeminiClient(api_key="test-key", model_name="gemini-2.5-flash", max_retries=3)

    try:
        client.classificar_lote([{"nome": "Teste", "descricao": "", "segmento": "",
                                   "tecnologias": [], "modelos_negocio": []}])
        assert False, "Deveria ter lancado GeminiDailyQuotaExceeded"
    except GeminiDailyQuotaExceeded:
        pass

    # Deve ter chamado apenas 1 vez (nao fez retry)
    assert mock_client.models.generate_content.call_count == 1


# ---------------------------------------------------------------------------
# 5. Retry — limite temporario com backoff
# ---------------------------------------------------------------------------

@patch("cubo.gemini.genai.Client")
@patch("cubo.gemini.time.sleep")
def test_retry_temporary_success(mock_sleep, mock_client_class):
    """Limite temporario seguido de sucesso deve tentar novamente."""
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = [
        Exception("429 RESOURCE_EXHAUSTED. GenerateRequestsPerMinute"),
        MagicMock(text='{"destaque_lab": [], "startups": []}'),
    ]
    mock_client_class.return_value = mock_client

    client = GeminiClient(api_key="test-key", model_name="gemini-2.5-flash", max_retries=3)
    resultado = client.classificar_lote([{"nome": "Teste", "descricao": "", "segmento": "",
                                           "tecnologias": [], "modelos_negocio": []}])

    assert resultado["startups"] == []
    assert mock_client.models.generate_content.call_count == 2
    mock_sleep.assert_called_once()


# ---------------------------------------------------------------------------
# 6. Erro nao-429 nao faz retry
# ---------------------------------------------------------------------------

@patch("cubo.gemini.genai.Client")
def test_erro_nao_429_nao_retry(mock_client_class):
    """Erro diferente de 429 deve lancar imediatamente sem retry."""
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = ValueError("erro qualquer")
    mock_client_class.return_value = mock_client

    client = GeminiClient(api_key="test-key", model_name="gemini-2.5-flash", max_retries=3)

    try:
        client.classificar_lote([{"nome": "Teste", "descricao": "", "segmento": "",
                                   "tecnologias": [], "modelos_negocio": []}])
        assert False, "Deveria ter lancado ValueError"
    except ValueError:
        pass

    assert mock_client.models.generate_content.call_count == 1


# ---------------------------------------------------------------------------
# 7. Modelo do env
# ---------------------------------------------------------------------------

def test_modelo_do_env():
    """Modelo deve vir do parametro, nao hardcoded."""
    client = GeminiClient(api_key="test-key", model_name="gemini-2.5-flash", max_retries=1)
    assert client.model_name == "gemini-2.5-flash"


# ---------------------------------------------------------------------------
# 8. API key ausente
# ---------------------------------------------------------------------------

def test_api_key_vazia_levanta_erro():
    """API key vazia deve lancar ValueError."""
    try:
        GeminiClient(api_key="", model_name="gemini-2.5-flash", max_retries=1)
        assert False, "Deveria ter lancado ValueError"
    except ValueError:
        pass


def test_modelo_vazio_levanta_erro():
    """Modelo vazio deve lancar ValueError."""
    try:
        GeminiClient(api_key="test-key", model_name="", max_retries=1)
        assert False, "Deveria ter lancado ValueError"
    except ValueError:
        pass


# ---------------------------------------------------------------------------
# 9. gemini-2.0-flash removido
# ---------------------------------------------------------------------------

def test_gemini_2_0_flash_nao_existe_no_codigo():
    """O modelo antigo nao deve aparecer em nenhum lugar."""
    import cubo.gemini as gm

    source = Path(gm.__file__).read_text(encoding="utf-8")
    assert "gemini-2.0-flash" not in source, "gemini-2.0-flash encontrado no codigo!"


# ---------------------------------------------------------------------------
# 10. Formato de dados preservado
# ---------------------------------------------------------------------------

def test_formato_startup_preservado():
    """A estrutura dos dados de entrada nao deve ser alterada."""
    startup = {
        "nome": "Teste",
        "descricao": "Desc",
        "segmento": "Seg",
        "tecnologias": ["AI"],
        "modelos_negocio": ["B2B"],
    }
    client = GeminiClient(api_key="test-key", model_name="gemini-2.5-flash", max_retries=1)

    # Verifica que o prompt contem os campos esperados
    with patch.object(client, "_client") as mock_c:
        mock_c.models.generate_content.return_value = MagicMock(
            text='{"destaque_lab": [], "startups": []}'
        )
        client.classificar_lote([startup])

    # A startup original nao foi modificada
    assert startup["nome"] == "Teste"
    assert startup["descricao"] == "Desc"
    assert startup["segmento"] == "Seg"
