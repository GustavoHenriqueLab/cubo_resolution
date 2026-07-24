import type {
  DepartamentosData,
  StartupRaw,
  StartupEnriquecida,
  StartupClassificada,
  DepartamentoInfo,
} from "@/lib/types";
import { DEPARTAMENTOS, DEPARTAMENTOS_DESCRICOES, nomeParaSlug } from "@/lib/constants";

import classificacao from "@/data/departamentos_startups.json";
import startupsRaw from "@/data/startups_cubo.json";

function _getMapaClassificacao(): Record<string, StartupClassificada[]> {
  const dados = classificacao as unknown as Record<string, unknown>;

  if (dados.departamentos && typeof dados.departamentos === "object") {
    return (dados as unknown as DepartamentosData).departamentos;
  }

  return dados as unknown as Record<string, StartupClassificada[]>;
}

export function getDadosClassificacao(): Record<string, StartupClassificada[]> {
  return _getMapaClassificacao();
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
      return {
        nome: s.nome,
        confianca: s.confianca,
        aderencia_lab: s.aderencia_lab,
        analise: s.analise,
        avaliacao: s.avaliacao,
        rank: s.rank,
        descricao: rawData?.descricao ?? "",
        segmento: rawData?.segmento ?? "",
        fundadores: rawData?.fundadores ?? "",
        site: rawData?.site ?? "",
        url_perfil: rawData?.url_perfil ?? "",
        modelos_negocio: rawData?.modelos_negocio ?? [],
        tecnologias: rawData?.tecnologias ?? [],
      };
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

  // Classificadas (com analise)
  for (const [, startups] of Object.entries(dados)) {
    for (const s of startups) {
      if (mapaEnriquecido.has(s.nome)) continue;

      const rawData = mapaRaw.get(s.nome);
      const ehDestaque = destaquesSet.has(s.nome);

      mapaEnriquecido.set(s.nome, {
        nome: s.nome,
        confianca: s.confianca,
        aderencia_lab: s.aderencia_lab,
        analise: s.analise,
        avaliacao: s.avaliacao,
        rank: ehDestaque ? (mapaDestaqueRank.get(s.nome) ?? undefined) : undefined,
        descricao: rawData?.descricao ?? "",
        segmento: rawData?.segmento ?? "",
        fundadores: rawData?.fundadores ?? "",
        site: rawData?.site ?? "",
        url_perfil: rawData?.url_perfil ?? "",
        modelos_negocio: rawData?.modelos_negocio ?? [],
        tecnologias: rawData?.tecnologias ?? [],
      });
    }
  }

  // Nao classificadas (sem analise, mas estao no raw)
  for (const rawData of raw) {
    if (mapaEnriquecido.has(rawData.nome)) continue;

    const ehDestaque = destaquesSet.has(rawData.nome);

    mapaEnriquecido.set(rawData.nome, {
      nome: rawData.nome,
      confianca: "media",
      rank: ehDestaque ? (mapaDestaqueRank.get(rawData.nome) ?? undefined) : undefined,
      descricao: rawData.descricao,
      segmento: rawData.segmento,
      fundadores: rawData.fundadores,
      site: rawData.site,
      url_perfil: rawData.url_perfil,
      modelos_negocio: rawData.modelos_negocio,
      tecnologias: rawData.tecnologias,
    });
  }

  return Array.from(mapaEnriquecido.values()).sort((a, b) =>
    a.nome.localeCompare(b.nome)
  );
}

export function getDepartamentosDaStartup(nome: string): string[] {
  const dados = getDadosClassificacao();
  const deptos: string[] = [];

  for (const [deptoNome, startups] of Object.entries(dados)) {
    if (startups.some((s) => s.nome === nome)) {
      deptos.push(deptoNome);
    }
  }

  return deptos;
}

export function getConfiancaNoDepartamento(
  startupNome: string,
  departamentoSlug: string
): "alta" | "media" | null {
  const dados = getDadosClassificacao();
  const nomeDepto = DEPARTAMENTOS[departamentoSlug];
  if (!nomeDepto) return null;

  const classificadas = dados[nomeDepto] ?? [];
  const match = classificadas.find((s) => s.nome === startupNome);
  return match?.confianca ?? null;
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
    });
  }

  return enriquecidas;
}
