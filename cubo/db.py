"""Camada de persistência via Supabase (PostgreSQL).

Oferece funções para inicializar a conexão e realizar operações de
leitura e escrita no banco, incluindo upsert das startups com seus
relacionamentos N:N.

.. attention::
   O schema DDL (``sql/schema.sql``) deve ser executado manualmente no
   **SQL Editor** do Supabase antes da primeira execução do scraper.
"""

from __future__ import annotations

import logging
from typing import Any

from supabase import Client as SupabaseClient
from supabase import create_client

from config import Config
from cubo.models import Startup

logger = logging.getLogger(__name__)


def inicializar_banco(config: Config) -> SupabaseClient:
    """Cria e retorna o cliente Supabase autenticado.

    .. note::
       As tabelas não são criadas automaticamente. Execute o script
       ``sql/schema.sql`` no SQL Editor do Supabase antes de usar.

    Returns:
        Cliente Supabase autenticado com a *service_role key*.
    """
    return create_client(config.supabase_url, config.supabase_service_role_key)


def _salvar_dimensao(
    client: SupabaseClient,
    tabela: str,
    nome: str,
) -> int:
    """Insere um registro em tabela de dimensão (se não existir).

    Args:
        client: Cliente Supabase.
        tabela: Nome da tabela (``modelos_negocio`` ou ``tecnologias``).
        nome: Valor único a ser inserido.

    Returns:
        ``id`` do registro (existente ou recém-criado).
    """
    response = (
        client.table(tabela)
        .upsert({"nome": nome}, on_conflict="nome")
        .execute()
    )

    if not response.data:
        response = (
            client.table(tabela)
            .select("id")
            .eq("nome", nome)
            .execute()
        )

    return response.data[0]["id"]


def salvar_startup(client: SupabaseClient, startup: Startup) -> None:
    """Persiste uma startup e seus relacionamentos no banco.

    Utiliza *upsert* pela coluna ``url_perfil``, permitindo
    re-execuções seguras do scraper sem duplicação.

    Os relacionamentos antigos com ``modelos_negocio`` e
    ``tecnologias`` são removidos antes da reinserção.

    Args:
        client: Cliente Supabase.
        startup: Instância de :class:`Startup` com os dados extraídos.
    """
    startup_data: dict[str, Any] = {
        "nome": startup.nome,
        "descricao": startup.descricao,
        "segmento": startup.segmento,
        "fundadores": startup.fundadores,
        "site": startup.site,
        "url_perfil": startup.url_perfil,
    }

    response = (
        client.table("startups")
        .upsert(startup_data, on_conflict="url_perfil")
        .execute()
    )

    if not response.data:
        logger.error("Falha ao salvar startup: %s", startup.nome)
        return

    startup_id: int = response.data[0]["id"]

    # Remove relacionamentos antigos.
    client.table("startup_modelos_negocio") \
        .delete() \
        .eq("startup_id", startup_id) \
        .execute()

    client.table("startup_tecnologias") \
        .delete() \
        .eq("startup_id", startup_id) \
        .execute()

    # Insere modelos de negócio.
    for modelo in startup.modelos_negocio:
        modelo_id = _salvar_dimensao(client, "modelos_negocio", modelo)
        client.table("startup_modelos_negocio").upsert(
            {
                "startup_id": startup_id,
                "modelo_negocio_id": modelo_id,
            },
            on_conflict="startup_id,modelo_negocio_id",
        ).execute()

    # Insere tecnologias.
    for tecnologia in startup.tecnologias:
        tecnologia_id = _salvar_dimensao(client, "tecnologias", tecnologia)
        client.table("startup_tecnologias").upsert(
            {
                "startup_id": startup_id,
                "tecnologia_id": tecnologia_id,
            },
            on_conflict="startup_id,tecnologia_id",
        ).execute()

    logger.info(
        "Salvo: %s | Modelos: %s | Tecnologias: %s",
        startup.nome,
        startup.modelos_negocio,
        startup.tecnologias,
    )
