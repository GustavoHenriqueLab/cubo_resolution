"""Modelos de domínio da aplicação.

Define os dataclasses que representam as entidades extraídas do
site do Cubo Itaú.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Startup:
    """Representa uma startup residente ou associada ao Cubo Itaú."""

    nome: str
    url_perfil: str
    descricao: str = ""
    segmento: str = ""
    fundadores: str = ""
    site: str = ""
    modelos_negocio: list[str] = field(default_factory=list)
    tecnologias: list[str] = field(default_factory=list)


@dataclass
class ScrapingReport:
    """Relatório de execução do scraping."""

    total_encontrados: int = 0
    total_extraidos: int = 0
    total_falhas: int = 0
    erros: list[str] = field(default_factory=list)
