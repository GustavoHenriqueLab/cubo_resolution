import type {
  DepartamentosData,
  StartupRaw,
  StartupEnriquecida,
  StartupClassificada,
  DepartamentoInfo,
} from "@/lib/types";
import { DEPARTAMENTOS, DEPARTAMENTOS_DESCRICOES } from "@/lib/constants";

import classificacao from "@/data/departamentos_startups.json";
import startupsRaw from "@/data/startups_cubo.json";

let _classificacaoCache: Record<string, StartupClassificada[]> | null = null;
let _indiceStartupDeptos: Map<string, string[]> | null = null;
let _indiceStartupConfianca: Map<string, Map<string, "alta" | "media">> | null = null;

function _getMapaClassificacao(): Record<string, StartupClassificada[]> {
  if (_classificacaoCache) return _classificacaoCache;

  const dados = classificacao as unknown as Record<string, unknown>;

  if (dados.departamentos && typeof dados.departamentos === "object") {
    _classificacaoCache = (dados as unknown as DepartamentosData).departamentos;
  } else {
    _classificacaoCache = dados as unknown as Record<string, StartupClassificada[]>;
  }

  return _classificacaoCache;
}

function _construirIndices(): void {
  if (_indiceStartupDeptos && _indiceStartupConfianca) return;

  const dados = _getMapaClassificacao();
  _indiceStartupDeptos = new Map();
  _indiceStartupConfianca = new Map();

  for (const [nomeDepto, startups] of Object.entries(dados)) {
    const slug = _nomeParaSlug(nomeDepto);
    for (const s of startups) {
      if (!_indiceStartupDeptos.has(s.nome)) {
        _indiceStartupDeptos.set(s.nome, []);
      }
      _indiceStartupDeptos.get(s.nome)!.push(nomeDepto);

      if (!_indiceStartupConfianca.has(s.nome)) {
        _indiceStartupConfianca.set(s.nome, new Map());
      }
      _indiceStartupConfianca.get(s.nome)!.set(slug, s.confianca);
    }
  }
}

function _nomeParaSlug(nome: string): string {
  const entry = Object.entries(DEPARTAMENTOS).find(
    ([, displayName]) => displayName === nome
  );
  return entry?.[0] ?? nome.toLowerCase().replace(/\s+/g, "-");
}

function _enriquecerStartup(s: StartupClassificada, rawData?: StartupRaw): Omit<StartupEnriquecida, "rank"> {
  _construirIndices();
  const deptos = _indiceStartupDeptos!.get(s.nome) ?? [];
  const confMap = _indiceStartupConfianca!.get(s.nome) ?? new Map();
  const confiancaRecord: Record<string, "alta" | "media"> = {};
  for (const [slug, conf] of confMap) {
    confiancaRecord[slug] = conf;
  }

  return {
    nome: s.nome,
    confianca: s.confianca,
    aderencia_lab: s.aderencia_lab,
    analise: s.analise,
    avaliacao: s.avaliacao,
    descricao: rawData?.descricao ?? "",
    segmento: rawData?.segmento ?? "",
    fundadores: rawData?.fundadores ?? "",
    site: rawData?.site ?? "",
    url_perfil: rawData?.url_perfil ?? "",
    modelos_negocio: rawData?.modelos_negocio ?? [],
    tecnologias: rawData?.tecnologias ?? [],
    departamentos: deptos,
    confiancaPorDepartamento: confiancaRecord,
    data_adicionado: rawData?.data_adicionado,
  };
}

export function getDadosClassificacao(): Record<string, StartupClassificada[]> {
  return _getMapaClassificacao();
}

export function getIndiceStartupDeptos(): Map<string, string[]> {
  _construirIndices();
  return _indiceStartupDeptos!;
}

export function getIndiceStartupConfianca(): Map<string, Map<string, "alta" | "media">> {
  _construirIndices();
  return _indiceStartupConfianca!;
}

export function getDestaqueLab(): string[] {
  const dados = classificacao as unknown as Record<string, unknown>;
  const destaques = dados.destaque_lab;
  if (Array.isArray(destaques)) {
    return destaques as string[];
  }
  return [];
}

export function getStartupsRaw(): StartupRaw[] {
  return startupsRaw as StartupRaw[];
}

export function getDepartamentos(): DepartamentoInfo[] {
  const dados = getDadosClassificacao();

  return Object.entries(DEPARTAMENTOS).map(([slug, nome]) => {
    const startups = dados[nome] ?? [];
    const alta = startups.filter((s) => s.confianca === "alta").length;
    const media = startups.filter((s) => s.confianca === "media").length;

    return {
      slug,
      nome,
      descricao: DEPARTAMENTOS_DESCRICOES[slug] ?? "",
      totalStartups: startups.length,
      altaConfianca: alta,
      mediaConfianca: media,
    };
  });
}

export function getDepartamentoPorSlug(slug: string): DepartamentoInfo | null {
  return getDepartamentos().find((d) => d.slug === slug) ?? null;
}

export function getStartupsPorDepartamento(
  slug: string
): StartupEnriquecida[] {
  const dados = getDadosClassificacao();
  const raw = getStartupsRaw();
  const nome = DEPARTAMENTOS[slug];
  if (!nome) return [];

  const mapaRaw = new Map(raw.map((s) => [s.nome, s]));
  const classificadas = dados[nome] ?? [];

  return classificadas
    .map((s) => {
      const rawData = mapaRaw.get(s.nome);
      const base = _enriquecerStartup(s, rawData);
      return {
        ...base,
        rank: s.rank,
      } as StartupEnriquecida;
    })
    .sort((a, b) => {
      if (a.rank != null && b.rank != null) return a.rank - b.rank;
      if (a.rank != null) return -1;
      if (b.rank != null) return 1;
      return a.nome.localeCompare(b.nome);
    });
}

export function getTodasStartups(): StartupEnriquecida[] {
  const dados = getDadosClassificacao();
  const raw = getStartupsRaw();
  const mapaRaw = new Map(raw.map((s) => [s.nome, s]));

  const destaques = getDestaqueLab();
  const destaquesSet = new Set(destaques);

  const mapaDestaqueRank = new Map<string, number>();
  const analisesRaw = (classificacao as unknown as Record<string, unknown>).destaque_lab_analises;
  if (Array.isArray(analisesRaw)) {
    for (const a of analisesRaw as unknown as { nome: string; rank: number }[]) {
      mapaDestaqueRank.set(a.nome, a.rank);
    }
  }

  const mapaEnriquecido = new Map<string, StartupEnriquecida>();

  for (const [, startups] of Object.entries(dados)) {
    for (const s of startups) {
      if (mapaEnriquecido.has(s.nome)) continue;

      const rawData = mapaRaw.get(s.nome);
      if (!rawData) continue; // ignora classificadas sem dados raw

      const ehDestaque = destaquesSet.has(s.nome);
      const base = _enriquecerStartup(s, rawData);

      mapaEnriquecido.set(s.nome, {
        ...base,
        rank: ehDestaque ? (mapaDestaqueRank.get(s.nome) ?? undefined) : undefined,
      });
    }
  }

  for (const rawData of raw) {
    if (mapaEnriquecido.has(rawData.nome)) continue;

    const ehDestaque = destaquesSet.has(rawData.nome);
    _construirIndices();
    const deptos = _indiceStartupDeptos!.get(rawData.nome) ?? [];
    const confMap = _indiceStartupConfianca!.get(rawData.nome) ?? new Map();
    const confiancaRecord: Record<string, "alta" | "media"> = {};
    for (const [slug, conf] of confMap) {
      confiancaRecord[slug] = conf;
    }

    const temDescricao =
      rawData.descricao && rawData.descricao.trim().length > 0;

    mapaEnriquecido.set(rawData.nome, {
      nome: rawData.nome,
      confianca: temDescricao ? "media" : "baixa",
      rank: ehDestaque ? (mapaDestaqueRank.get(rawData.nome) ?? undefined) : undefined,
      descricao: rawData.descricao,
      segmento: rawData.segmento,
      fundadores: rawData.fundadores,
      site: rawData.site,
      url_perfil: rawData.url_perfil,
      modelos_negocio: rawData.modelos_negocio,
      tecnologias: rawData.tecnologias,
      departamentos: deptos,
      confiancaPorDepartamento: confiancaRecord,
      data_adicionado: rawData.data_adicionado,
    });
  }

  return Array.from(mapaEnriquecido.values()).sort((a, b) =>
    a.nome.localeCompare(b.nome)
  );
}

export function getDepartamentosDaStartup(nome: string): string[] {
  _construirIndices();
  return _indiceStartupDeptos!.get(nome) ?? [];
}

export function getConfiancaNoDepartamento(
  startupNome: string,
  departamentoSlug: string
): "alta" | "media" | null {
  _construirIndices();
  const confMap = _indiceStartupConfianca!.get(startupNome);
  if (!confMap) return null;
  return confMap.get(departamentoSlug) ?? null;
}

export function getSegmentos(): string[] {
  const raw = getStartupsRaw();
  const segmentos = new Set(
    raw.map((s) => s.segmento).filter((seg) => seg && seg !== "N/I")
  );
  return Array.from(segmentos).sort();
}

export function getTecnologias(): string[] {
  const raw = getStartupsRaw();
  const tecnologias = new Set(raw.flatMap((s) => s.tecnologias));
  return Array.from(tecnologias).sort();
}

export function getStartupsDestaqueLab(): StartupEnriquecida[] {
  const dados = classificacao as unknown as Record<string, unknown>;
  const analisesRaw = dados.destaque_lab_analises;

  let destaquesOrdenados: string[];

  if (Array.isArray(analisesRaw) && analisesRaw.length > 0) {
    const analises = analisesRaw as unknown as { nome: string; rank: number; analise: string }[];
    analises.sort((a, b) => a.rank - b.rank);
    destaquesOrdenados = analises.map((a) => a.nome);
  } else {
    destaquesOrdenados = getDestaqueLab();
  }

  const raw = getStartupsRaw();
  const mapaRaw = new Map(raw.map((s) => [s.nome, s]));
  const dadosDeptos = getDadosClassificacao();

  const mapaAnalises = new Map<string, { rank: number; analise: string }>();
  if (Array.isArray(analisesRaw)) {
    for (const a of analisesRaw as unknown as { nome: string; rank: number; analise: string }[]) {
      mapaAnalises.set(a.nome, { rank: a.rank, analise: a.analise });
    }
  }

  _construirIndices();

  const enriquecidas: StartupEnriquecida[] = [];

  for (const nome of destaquesOrdenados) {
    const rawData = mapaRaw.get(nome);
    if (!rawData) continue;

    let confianca: "alta" | "media" = "media";
    for (const startups of Object.values(dadosDeptos)) {
      const match = startups.find((s) => s.nome === nome);
      if (match) {
        confianca = match.confianca;
        break;
      }
    }

    const infoAnalise = mapaAnalises.get(nome);
    const deptos = _indiceStartupDeptos!.get(nome) ?? [];
    const confMap = _indiceStartupConfianca!.get(nome) ?? new Map();
    const confiancaRecord: Record<string, "alta" | "media"> = {};
    for (const [slug, c] of confMap) {
      confiancaRecord[slug] = c;
    }

    enriquecidas.push({
      nome,
      confianca,
      rank: infoAnalise?.rank,
      analise: infoAnalise?.analise,
      descricao: rawData.descricao,
      segmento: rawData.segmento,
      fundadores: rawData.fundadores,
      site: rawData.site,
      url_perfil: rawData.url_perfil,
      modelos_negocio: rawData.modelos_negocio,
      tecnologias: rawData.tecnologias,
      departamentos: deptos,
      confiancaPorDepartamento: confiancaRecord,
      data_adicionado: rawData.data_adicionado,
    });
  }

  return enriquecidas;
}
