import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import type { StartupStatus, Parceria, StartupStatusLogEntry, PropostaStatusLogEntry } from "@/lib/types";
import { DEPARTAMENTOS } from "@/lib/constants";

const VALID_STATUSES: StartupStatus[] = [
  "a_contatar",
  "em_contato",
  "parceiro",
];

function normalizeStatus(raw: unknown): StartupStatus {
  if (typeof raw === "string" && VALID_STATUSES.includes(raw as StartupStatus)) {
    return raw as StartupStatus;
  }
  return "a_contatar";
}

type StartupRow = Database["public"]["Tables"]["startups"]["Row"];
type StartupClassifRow =
  Database["public"]["Tables"]["startup_departamentos"]["Row"];
type DestaqueRow = Database["public"]["Tables"]["destaques_lab"]["Row"];
type DepartamentoRow = Database["public"]["Tables"]["departamentos"]["Row"];
type PipelineRow = Database["public"]["Tables"]["pipeline_executions"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>;

// ============================================================
// DEPARTAMENTOS
// ============================================================

export async function getDepartamentos(): Promise<
  {
    slug: string;
    nome: string;
    descricao: string;
    totalStartups: number;
    altaConfianca: number;
    mediaConfianca: number;
  }[]
> {
  const supabase = await createClient();

  const [deptosRes, countsRes] = await Promise.all([
    supabase.from("departamentos").select("slug, nome, descricao"),
    supabase.from("startup_departamentos").select("departamento_slug, confianca"),
  ]);

  const deptos = deptosRes.data;
  if (!deptos) return [];

  const countMap = new Map<string, { total: number; alta: number; media: number }>();

  for (const c of (countsRes.data ?? []) as AnyRow[]) {
    const slug = c.departamento_slug as string;
    const conf = c.confianca as string;
    if (!countMap.has(slug)) {
      countMap.set(slug, { total: 0, alta: 0, media: 0 });
    }
    const entry = countMap.get(slug)!;
    entry.total++;
    if (conf === "alta") entry.alta++;
    else entry.media++;
  }

  return (deptos as AnyRow[]).map((d) => {
    const c = countMap.get(d.slug) ?? { total: 0, alta: 0, media: 0 };
    return {
      slug: d.slug,
      nome: d.nome,
      descricao: d.descricao ?? "",
      totalStartups: c.total,
      altaConfianca: c.alta,
      mediaConfianca: c.media,
    };
  });
}

export async function getDepartamentoPorSlug(slug: string): Promise<{
  slug: string;
  nome: string;
  descricao: string;
  totalStartups: number;
  altaConfianca: number;
  mediaConfianca: number;
} | null> {
  const supabase = await createClient();

  const { data: depto } = await supabase
    .from("departamentos")
    .select("slug, nome, descricao")
    .eq("slug", slug)
    .maybeSingle();

  if (!depto) return null;

  const { data: counts } = await supabase
    .from("startup_departamentos")
    .select("confianca")
    .eq("departamento_slug", slug);

  let alta = 0;
  let media = 0;
  for (const c of (counts ?? []) as AnyRow[]) {
    const conf = c.confianca as string;
    if (conf === "alta") alta++;
    else media++;
  }

  return {
    slug: (depto as AnyRow).slug,
    nome: (depto as AnyRow).nome,
    descricao: (depto as AnyRow).descricao ?? "",
    totalStartups: alta + media,
    altaConfianca: alta,
    mediaConfianca: media,
  };
}

// ============================================================
// STARTUPS
// ============================================================

export async function getStartupsPorDepartamento(slug: string) {
  const supabase = await createClient();

  const { data: depto } = await supabase
    .from("departamentos")
    .select("slug, nome")
    .eq("slug", slug)
    .maybeSingle();

  if (!depto) return [];

  const deptoNome = (depto as AnyRow).nome as string;

  const { data: rels } = await supabase
    .from("startup_departamentos")
    .select(
      "id, startup_id, departamento_slug, confianca, aderencia_lab, analise, avaliacao, rank, startup:startups(*)",
    )
    .eq("departamento_slug", slug)
    .order("rank", { ascending: true, nullsFirst: false })
    .order("confianca", { ascending: false });

  if (!rels) return [];

  return (rels as AnyRow[])
    .map((rel) => {
      const s = (rel.startup as AnyRow) ?? {};
      return {
        id: s.id ?? "",
        nome: s.nome ?? "",
        confianca: rel.confianca as "alta" | "media" | "baixa",
        aderencia_lab: rel.aderencia_lab as
          | "alta"
          | "media"
          | "baixa"
          | undefined,
        analise: rel.analise ?? undefined,
        avaliacao: rel.avaliacao as Record<string, string> | undefined,
        rank: rel.rank ?? undefined,
        descricao: s.descricao ?? "",
        segmento: s.segmento ?? "",
        fundadores: s.fundadores ?? "",
        site: s.site ?? "",
        url_perfil: s.url_perfil ?? "",
        modelos_negocio: (s.modelos_negocio ?? []) as string[],
        tecnologias: (s.tecnologias ?? []) as string[],
        departamentos: [deptoNome],
        confiancaPorDepartamento: {
          [slug]: rel.confianca as "alta" | "media",
        },
        status: normalizeStatus(s.status),
        data_adicionado: s.data_adicionado ?? undefined,
      };
    })
    .sort((a, b) => {
      if (a.rank != null && b.rank != null) return a.rank - b.rank;
      if (a.rank != null) return -1;
      if (b.rank != null) return 1;
      return a.nome.localeCompare(b.nome);
    });
}

export async function getTodasStartups() {
  const supabase = await createClient();

  const [startupsRes, relsRes, destaquesRes, deptosRes] = await Promise.all([
    supabase
      .from("startups")
      .select("id, nome, descricao, segmento, fundadores, site, url_perfil, modelos_negocio, tecnologias, status, data_adicionado")
      .order("nome"),
    supabase
      .from("startup_departamentos")
      .select("startup_id, departamento_slug, confianca, aderencia_lab, analise, avaliacao, rank"),
    supabase
      .from("destaques_lab")
      .select("startup_id, rank, analise")
      .order("rank"),
    supabase
      .from("departamentos")
      .select("slug, nome"),
  ]);

  const startups = startupsRes.data;
  const rels = relsRes.data;
  const destaques = destaquesRes.data;
  const deptosData = deptosRes.data;

  if (!startups) return [];

  const relsPorStartup = new Map<
    string,
    { departamento_slug: string; confianca: string; aderencia_lab: string | null; analise: string | null; avaliacao: Record<string, string> | null; rank: number | null }[]
  >();
  for (const r of (rels ?? []) as AnyRow[]) {
    const sid = r.startup_id as string;
    if (!relsPorStartup.has(sid)) {
      relsPorStartup.set(sid, []);
    }
    relsPorStartup.get(sid)!.push({
      departamento_slug: r.departamento_slug as string,
      confianca: r.confianca as string,
      aderencia_lab: r.aderencia_lab as string | null,
      analise: r.analise as string | null,
      avaliacao: r.avaliacao as Record<string, string> | null,
      rank: r.rank as number | null,
    });
  }

  const destaqueRank = new Map<string, { rank: number; analise: string }>();
  for (const d of (destaques ?? []) as AnyRow[]) {
    destaqueRank.set(d.startup_id as string, {
      rank: d.rank as number,
      analise: (d.analise as string) ?? "",
    });
  }

  const slugParaNome = new Map<string, string>();
  for (const d of (deptosData ?? []) as AnyRow[]) {
    slugParaNome.set(d.slug as string, d.nome as string);
  }

  return (startups as AnyRow[]).map((s) => {
    const id = s.id as string;
    const rels = relsPorStartup.get(id) ?? [];
    const deptos = rels.map(
      (r) => slugParaNome.get(r.departamento_slug) ?? r.departamento_slug,
    );
    const confRecord: Record<string, "alta" | "media"> = {};
    for (const r of rels) {
      confRecord[r.departamento_slug] = r.confianca as "alta" | "media";
    }

    const ehDestaque = destaqueRank.has(id);
    const temDescricao =
      s.descricao && (s.descricao as string).trim().length > 0;

    const melhorRel = rels
      .filter((r) => r.analise || r.avaliacao)
      .sort((a, b) => (a.confianca === "alta" ? -1 : 1) - (b.confianca === "alta" ? -1 : 1))[0];

    return {
      id: s.id as string,
      nome: s.nome as string,
      confianca: (
        temDescricao ? "media" : "baixa"
      ) as "alta" | "media" | "baixa",
      aderencia_lab: (melhorRel?.aderencia_lab as "alta" | "media" | "baixa" | undefined) ?? undefined,
      analise: (melhorRel?.analise ?? undefined) as string | undefined,
      avaliacao: (melhorRel?.avaliacao ?? undefined) as Record<string, string> | undefined,
      rank: ehDestaque
        ? (destaqueRank.get(id)?.rank ?? undefined)
        : undefined,
      descricao: (s.descricao as string) ?? "",
      segmento: (s.segmento as string) ?? "",
      fundadores: (s.fundadores as string) ?? "",
      site: (s.site as string) ?? "",
      url_perfil: (s.url_perfil as string) ?? "",
      modelos_negocio: (s.modelos_negocio ?? []) as string[],
      tecnologias: (s.tecnologias ?? []) as string[],
      departamentos: deptos,
      confiancaPorDepartamento: confRecord,
      status: normalizeStatus(s.status),
      data_adicionado: s.data_adicionado ?? undefined,
    };
  });
}

export async function getDestaqueLab(): Promise<string[]> {
  const supabase = await createClient();

  const { data: destaques } = await supabase
    .from("destaques_lab")
    .select("startup_id, startup:startups(nome)")
    .order("rank");

  return ((destaques ?? []) as AnyRow[]).map(
    (d) => (d.startup as AnyRow)?.nome ?? "",
  );
}

export async function getStartupsDestaqueLab() {
  const supabase = await createClient();

  const { data: destaques } = await supabase
    .from("destaques_lab")
    .select("startup_id, rank, analise, startup:startups(*)")
    .order("rank");

  if (!destaques) return [];

  const { data: rels } = await supabase
    .from("startup_departamentos")
    .select("startup_id, departamento_slug, confianca");

  const relsMap = new Map<string, { slug: string; confianca: string }[]>();
  for (const r of (rels ?? []) as AnyRow[]) {
    const sid = r.startup_id as string;
    if (!relsMap.has(sid)) relsMap.set(sid, []);
    relsMap.get(sid)!.push({
      slug: r.departamento_slug as string,
      confianca: r.confianca as string,
    });
  }

  const { data: deptosData } = await supabase
    .from("departamentos")
    .select("slug, nome");

  const slugParaNome = new Map<string, string>();
  for (const d of (deptosData ?? []) as AnyRow[]) {
    slugParaNome.set(d.slug as string, d.nome as string);
  }

  return (destaques as AnyRow[]).map((d) => {
    const s = (d.startup as AnyRow) ?? {};
    const sid = d.startup_id as string;
    const rels = relsMap.get(sid) ?? [];
    const deptos = rels.map((r) => slugParaNome.get(r.slug) ?? r.slug);
    const confRecord: Record<string, "alta" | "media"> = {};
    let confianca: "alta" | "media" = "media";
    for (const r of rels) {
      confRecord[r.slug] = r.confianca as "alta" | "media";
      if (r.confianca === "alta") confianca = "alta";
    }

    return {
      id: sid,
      nome: s.nome ?? "",
      confianca,
      rank: d.rank as number,
      analise: (d.analise as string) ?? undefined,
      descricao: (s.descricao as string) ?? "",
      segmento: (s.segmento as string) ?? "",
      fundadores: (s.fundadores as string) ?? "",
      site: (s.site as string) ?? "",
      url_perfil: (s.url_perfil as string) ?? "",
      modelos_negocio: (s.modelos_negocio ?? []) as string[],
      tecnologias: (s.tecnologias ?? []) as string[],
      departamentos: deptos,
      confiancaPorDepartamento: confRecord,
      status: normalizeStatus(s.status),
      data_adicionado: s.data_adicionado ?? undefined,
    };
  });
}

export async function getSegmentos(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("startups").select("segmento");

  const segmentos = new Set(
    ((data ?? []) as AnyRow[])
      .map((s) => s.segmento as string)
      .filter((seg) => seg && seg !== "N/I"),
  );
  return Array.from(segmentos).sort();
}

export async function getTecnologias(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("startups").select("tecnologias");

  const tecnologias = new Set(
    ((data ?? []) as AnyRow[]).flatMap(
      (s) => (s.tecnologias ?? []) as string[],
    ),
  );
  return Array.from(tecnologias).sort();
}

// ============================================================
// PIPELINE EXECUTIONS
// ============================================================

export async function getPipelineExecutions(
  limit = 10,
): Promise<PipelineRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pipeline_executions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data as unknown as PipelineRow[]) ?? [];
}

export async function triggerPipeline(
  type: "scraper" | "classifier" | "ranker" | "destaques",
  userId: string,
) {
  const supabase = await createClient();
  return supabase.from("pipeline_executions").insert({
    type,
    status: "pending",
    triggered_by: userId,
  } as any);
}

// ============================================================
// USERS (admin)
// ============================================================

export async function getProfiles(): Promise<ProfileRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return (data as unknown as ProfileRow[]) ?? [];
}

export async function updateUserRole(userId: string, role: "admin" | "viewer") {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("profiles").update({ role }).eq("id", userId);

  if (error) {
    console.error("[updateUserRole] Error:", error.message);
    throw new Error(error.message);
  }
}

export async function updateUserDepartment(userId: string, departamento_slug: string | null) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error("[updateUserDepartment] No authenticated user");
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("profiles")
    .update({ departamento_slug })
    .eq("id", userId);

  if (error) {
    console.error("[updateUserDepartment] Error:", error.message, error);
    throw new Error(error.message);
  }
}

export async function getCurrentProfile(): Promise<ProfileRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (data as unknown as ProfileRow) ?? null;
}

// ============================================================
// FAVORITOS
// ============================================================

export async function getStartupFavorites(): Promise<Set<string>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data } = await supabase
    .from("startup_favorites")
    .select("startup_id")
    .eq("user_id", user.id);

  return new Set(((data ?? []) as { startup_id: string }[]).map((f) => f.startup_id));
}

export async function getFavoritedStartups() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const [{ data: favs }, { data: rels }, { data: destaques }, { data: deptosData }] = await Promise.all([
    supabase
      .from("startup_favorites")
      .select("startup_id, startup:startups(id, nome, descricao, segmento, fundadores, site, url_perfil, modelos_negocio, tecnologias, status, data_adicionado)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("startup_departamentos").select("startup_id, departamento_slug, confianca, rank"),
    supabase.from("destaques_lab").select("startup_id, rank, analise").order("rank"),
    supabase.from("departamentos").select("slug, nome"),
  ]);

  if (!favs) return [];

  const startups = (favs as AnyRow[]).map((f) => {
    const s = (f.startup as AnyRow) ?? {};
    return { ...s, id: f.startup_id } as StartupRow;
  });

  const relsPorStartup = new Map<
    string,
    { departamento_slug: string; confianca: string; rank: number | null }[]
  >();
  for (const r of (rels ?? []) as AnyRow[]) {
    const sid = r.startup_id as string;
    if (!relsPorStartup.has(sid)) relsPorStartup.set(sid, []);
    relsPorStartup.get(sid)!.push({
      departamento_slug: r.departamento_slug as string,
      confianca: r.confianca as string,
      rank: r.rank as number | null,
    });
  }

  const destaqueRank = new Map<string, { rank: number; analise: string }>();
  for (const d of (destaques ?? []) as AnyRow[]) {
    destaqueRank.set(d.startup_id as string, {
      rank: d.rank as number,
      analise: (d.analise as string) ?? "",
    });
  }

  const slugParaNome = new Map<string, string>();
  for (const d of (deptosData ?? []) as AnyRow[]) {
    slugParaNome.set(d.slug as string, d.nome as string);
  }

  return startups.map((s) => {
    const id = s.id as string;
    const rels = relsPorStartup.get(id) ?? [];
    const deptos = rels.map(
      (r) => slugParaNome.get(r.departamento_slug) ?? r.departamento_slug,
    );
    const confRecord: Record<string, "alta" | "media"> = {};
    for (const r of rels) {
      confRecord[r.departamento_slug] = r.confianca as "alta" | "media";
    }

    const ehDestaque = destaqueRank.has(id);
    const temDescricao = s.descricao && (s.descricao as string).trim().length > 0;

    return {
      id: id,
      nome: s.nome as string,
      confianca: (temDescricao ? "media" : "baixa") as "alta" | "media" | "baixa",
      aderencia_lab: undefined as "alta" | "media" | "baixa" | undefined,
      analise: undefined as string | undefined,
      avaliacao: undefined as Record<string, string> | undefined,
      rank: ehDestaque ? (destaqueRank.get(id)?.rank ?? undefined) : undefined,
      descricao: (s.descricao as string) ?? "",
      segmento: (s.segmento as string) ?? "",
      fundadores: (s.fundadores as string) ?? "",
      site: (s.site as string) ?? "",
      url_perfil: (s.url_perfil as string) ?? "",
      modelos_negocio: (s.modelos_negocio ?? []) as string[],
      tecnologias: (s.tecnologias ?? []) as string[],
      departamentos: deptos,
      confiancaPorDepartamento: confRecord,
      status: normalizeStatus(s.status),
      data_adicionado: s.data_adicionado ?? undefined,
    };
  });
}

export async function toggleFavorite(startupId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: existing } = await supabase
    .from("startup_favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("startup_id", startupId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("startup_favorites")
      .delete()
      .eq("id", (existing as { id: string }).id);
    return false;
  } else {
    await supabase.from("startup_favorites").insert({
      user_id: user.id,
      startup_id: startupId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    return true;
  }
}

// ============================================================
// STATUS
// ============================================================

export async function updateStartupStatus(
  startupId: string,
  status: StartupStatus,
  notas: string = "",
): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || (profile as { role: string }).role !== "admin") return false;

  const { data: current } = await (supabase as any)
    .from("startups")
    .select("status")
    .eq("id", startupId)
    .maybeSingle();

  if (!current) return false;

  const statusAnterior: StartupStatus = normalizeStatus((current as any).status);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error } = await (supabase as any)
    .from("startups")
    .update({ status })
    .eq("id", startupId)
    .select("id")
    .maybeSingle();

  if (error) return false;

  if (statusAnterior !== status || notas.trim()) {
    await (supabase as any)
      .from("startup_status_log")
      .insert({
        startup_id: startupId,
        admin_id: user.id,
        status_anterior: statusAnterior,
        status_novo: status,
        notas: notas.trim(),
      });
  }

  return updated !== null;
}

// ============================================================
// ADMIN — STARTUPS COM DETALHES
// ============================================================

export interface AdminStartupRow {
  id: string;
  nome: string;
  status: StartupStatus;
  segmento: string;
  site: string;
  departamentos: string[];
  fundadores: string;
  atribuidos: { id: string; nome: string }[];
  todos_usuarios: { id: string; nome: string }[];
  data_adicionado: string | null;
}

export async function getAdminStartups(): Promise<AdminStartupRow[]> {
  const supabase = await createClient();

  const [startupsRes, assignmentsRes, relsRes, profilesRes] = await Promise.all([
    supabase.from("startups").select("id, nome, status, segmento, site, fundadores, data_adicionado").order("nome"),
    supabase.from("startup_users").select("startup_id, user:profiles(id, nome)"),
    supabase.from("startup_departamentos").select("startup_id, departamento:departamentos(nome)"),
    supabase.from("profiles").select("id, nome").order("nome"),
  ]);

  const startups = startupsRes.data;
  const assignments = assignmentsRes.data;
  const rels = relsRes.data;
  const profiles = profilesRes.data;

  if (!startups) return [];

  const assignMap = new Map<string, { id: string; nome: string }[]>();
  for (const a of (assignments ?? []) as AnyRow[]) {
    const sid = a.startup_id as string;
    const user = a.user as AnyRow;
    if (!assignMap.has(sid)) assignMap.set(sid, []);
    assignMap.get(sid)!.push({ id: user?.id ?? "", nome: user?.nome ?? "—" });
  }

  const deptMap = new Map<string, string[]>();
  for (const r of (rels ?? []) as AnyRow[]) {
    const sid = r.startup_id as string;
    const dept = r.departamento as AnyRow;
    const nome = dept?.nome ?? "—";
    if (!deptMap.has(sid)) deptMap.set(sid, []);
    deptMap.get(sid)!.push(nome);
  }

  const todosUsuarios = ((profiles ?? []) as AnyRow[]).map((p) => ({
    id: p.id as string,
    nome: (p.nome as string) ?? "—",
  }));

  return (startups as AnyRow[]).map((s) => ({
    id: s.id as string,
    nome: s.nome as string,
    status: normalizeStatus(s.status),
    segmento: (s.segmento as string) ?? "",
    site: (s.site as string) ?? "",
    departamentos: deptMap.get(s.id as string) ?? [],
    fundadores: (s.fundadores as string) ?? "",
    atribuidos: assignMap.get(s.id as string) ?? [],
    todos_usuarios: todosUsuarios,
    data_adicionado: s.data_adicionado ?? null,
  }));
}

export async function toggleStartupUser(
  startupId: string,
  userId: string,
): Promise<{ assigned: boolean }> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("startup_users")
    .select("id")
    .eq("startup_id", startupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("startup_users")
      .delete()
      .eq("id", (existing as { id: string }).id);
    return { assigned: false };
  } else {
    await supabase.from("startup_users").insert({
      startup_id: startupId,
      user_id: userId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    return { assigned: true };
  }
}

// ============================================================
// PROPOSTAS
// ============================================================

export async function submitProposta(data: {
  startupId: string;
  departamentoSlug: string | null;
  tipoIntegracao: string;
  justificativa: string;
  beneficios: string[];
}): Promise<string> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nao autenticado");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error, data: result } = await (supabase as any).from("propostas").insert({
    startup_id: data.startupId,
    departamento_slug: data.departamentoSlug,
    usuario_id: user.id,
    tipo_integracao: data.tipoIntegracao,
    justificativa: data.justificativa,
    beneficios: data.beneficios,
    status: "pendente",
  } as any).select("id").single();

  if (error) throw new Error(error.message);
  return (result as { id: string }).id;
}

export interface PropostaAdminRow {
  id: string;
  startup_id: string;
  startup_nome: string;
  departamento_slug: string | null;
  departamento_nome: string | null;
  usuario_id: string;
  usuario_nome: string | null;
  usuario_departamento: string | null;
  tipo_integracao: string;
  justificativa: string;
  beneficios: string[];
  status: string;
  admin_notas: string | null;
  created_at: string;
  updated_at: string;
}

export async function getPropostasAdmin(): Promise<PropostaAdminRow[]> {
  const supabase = await createClient();

  const { data } = await (supabase as any)
    .from("propostas")
    .select("*")
    .order("created_at", { ascending: false });

  if (!data) return [];

  // Enrich with startup name and user info
  const startupIds = [...new Set((data as AnyRow[]).map((p) => p.startup_id as string))];
  const userIds = [...new Set((data as AnyRow[]).map((p) => p.usuario_id as string))];

  const [{ data: startups }, { data: profiles }] = await Promise.all([
    supabase.from("startups").select("id, nome").in("id", startupIds),
    supabase.from("profiles").select("id, nome, departamento_slug").in("id", userIds),
  ]);

  const startupMap = new Map((startups ?? []).map((s: any) => [s.id, s.nome]));
  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  const resolveDepto = (slug: string | null) => (slug ? DEPARTAMENTOS[slug] ?? slug : null);

  return (data as AnyRow[]).map((p) => {
    const profile = profileMap.get(p.usuario_id as string) ?? {};
    return {
      id: p.id as string,
      startup_id: p.startup_id as string,
      startup_nome: startupMap.get(p.startup_id as string) ?? "—",
      departamento_slug: p.departamento_slug as string | null,
      departamento_nome: resolveDepto(p.departamento_slug as string | null) ?? "Geral (LAB)",
      usuario_id: p.usuario_id as string,
      usuario_nome: profile.nome ?? "—",
      usuario_departamento: resolveDepto(profile.departamento_slug ?? null),
      tipo_integracao: p.tipo_integracao as string,
      justificativa: p.justificativa as string,
      beneficios: (p.beneficios as string[]) ?? [],
      status: p.status as string,
      admin_notas: p.admin_notas as string | null,
      created_at: p.created_at as string,
      updated_at: p.updated_at as string,
    };
  });
}

export async function updatePropostaStatus(
  propostaId: string,
  status: string,
  notas: string,
): Promise<void> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = (supabase as any)
    .from("propostas")
    .update({
      status,
      admin_notas: notas,
      admin_id: user?.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", propostaId);

  if (error) throw new Error(error.message);
}

export async function getPropostasUsuario(): Promise<PropostaAdminRow[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await (supabase as any)
    .from("propostas")
    .select("*")
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });

  if (!data) return [];

  const startupIds = [...new Set((data as AnyRow[]).map((p: AnyRow) => p.startup_id as string))];

  const [{ data: startups }, { data: profile }] = await Promise.all([
    supabase.from("startups").select("id, nome").in("id", startupIds),
    supabase.from("profiles").select("nome, departamento_slug").eq("id", user.id).maybeSingle(),
  ]);

  const startupMap = new Map((startups ?? []).map((s: any) => [s.id, s.nome]));
  const resolveDepto = (slug: string | null) => (slug ? DEPARTAMENTOS[slug] ?? slug : null);
  const usuarioNome = (profile as any)?.nome ?? "—";
  const usuarioDepto = resolveDepto((profile as any)?.departamento_slug ?? null);

  return (data as AnyRow[]).map((p) => ({
    id: p.id as string,
    startup_id: p.startup_id as string,
    startup_nome: startupMap.get(p.startup_id as string) ?? "—",
    departamento_slug: p.departamento_slug as string | null,
    departamento_nome: resolveDepto(p.departamento_slug as string | null),
    usuario_id: p.usuario_id as string,
    usuario_nome: usuarioNome,
    usuario_departamento: usuarioDepto,
    tipo_integracao: p.tipo_integracao as string,
    justificativa: p.justificativa as string,
    beneficios: (p.beneficios as string[]) ?? [],
    status: p.status as string,
    admin_notas: p.admin_notas as string | null,
    created_at: p.created_at as string,
    updated_at: p.updated_at as string,
  }));
}

// ============================================================
// PARCERIAS
// ============================================================

export async function getParcerias(): Promise<Parceria[]> {
  const supabase = await createClient();

  const { data } = await (supabase as any)
    .from("parcerias")
    .select("*")
    .order("created_at", { ascending: false });

  if (!data) return [];

  const startupIds = [...new Set((data as AnyRow[]).map((p) => p.startup_id as string))];
  const propostaIds = [...new Set((data as AnyRow[]).filter((p) => p.proposta_id).map((p) => p.proposta_id as string))];

  const [{ data: startups }, { data: propostas }] = await Promise.all([
    startupIds.length > 0
      ? supabase.from("startups").select("id, nome").in("id", startupIds)
      : Promise.resolve({ data: [] }),
    propostaIds.length > 0
      ? (supabase as any).from("propostas").select("id, tipo_integracao").in("id", propostaIds)
      : Promise.resolve({ data: [] }),
  ]);

  const startupMap = new Map((startups ?? []).map((s: any) => [s.id, s.nome]));
  const propostaMap = new Map((propostas ?? []).map((p: any) => [p.id, p.tipo_integracao]));
  const resolveDepto = (slug: string | null) => (slug ? DEPARTAMENTOS[slug] ?? slug : null);

  return (data as AnyRow[]).map((p) => ({
    id: p.id as string,
    startup_id: p.startup_id as string,
    startup_nome: startupMap.get(p.startup_id as string),
    departamento_slug: p.departamento_slug as string | null,
    departamento_nome: resolveDepto(p.departamento_slug as string | null),
    proposta_id: p.proposta_id as string | null,
    proposta_tipo: (propostaMap.get(p.proposta_id as string) as string) ?? null,
    descricao: (p.descricao as string) ?? "",
    created_at: p.created_at as string,
    updated_at: p.updated_at as string,
  }));
}

export async function updateParceriaDescricao(
  parceriaId: string,
  descricao: string,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from("parcerias")
    .update({ descricao, updated_at: new Date().toISOString() })
    .eq("id", parceriaId);

  if (error) throw new Error(error.message);
}

// ============================================================
// STATUS LOG
// ============================================================

export async function getStartupStatusLog(
  startupId: string,
): Promise<StartupStatusLogEntry[]> {
  const supabase = await createClient();

  const { data } = await (supabase as any)
    .from("startup_status_log")
    .select("*")
    .eq("startup_id", startupId)
    .order("created_at", { ascending: false });

  if (!data) return [];

  const adminIds = [...new Set(
    (data as AnyRow[]).filter((l) => l.admin_id).map((l) => l.admin_id as string),
  )];

  const { data: profiles } = adminIds.length > 0
    ? await supabase.from("profiles").select("id, nome").in("id", adminIds)
    : { data: [] };

  const adminMap = new Map((profiles ?? []).map((p: any) => [p.id, p.nome]));

  return (data as AnyRow[]).map((l) => ({
    id: l.id as string,
    startup_id: l.startup_id as string,
    admin_id: l.admin_id as string | null,
    admin_nome: (l.admin_id ? adminMap.get(l.admin_id as string) ?? null : null) as string | null,
    status_anterior: normalizeStatus(l.status_anterior),
    status_novo: normalizeStatus(l.status_novo),
    notas: (l.notas as string) ?? "",
    created_at: l.created_at as string,
  }));
}

// ============================================================
// PROPOSTA STATUS LOG
// ============================================================

export async function getPropostaStatusLog(
  propostaId: string,
): Promise<PropostaStatusLogEntry[]> {
  const supabase = await createClient();

  const { data } = await (supabase as any)
    .from("proposta_status_log")
    .select("*")
    .eq("proposta_id", propostaId)
    .order("created_at", { ascending: true });

  if (!data) return [];

  const adminIds = [...new Set(
    (data as AnyRow[]).filter((l) => l.admin_id).map((l) => l.admin_id as string),
  )];

  const { data: profiles } = adminIds.length > 0
    ? await supabase.from("profiles").select("id, nome").in("id", adminIds)
    : { data: [] };

  const adminMap = new Map((profiles ?? []).map((p: any) => [p.id, p.nome]));

  return (data as AnyRow[]).map((l) => ({
    id: l.id as string,
    proposta_id: l.proposta_id as string,
    admin_id: l.admin_id as string | null,
    admin_nome: (l.admin_id ? adminMap.get(l.admin_id as string) ?? null : null) as string | null,
    status_anterior: l.status_anterior as PropostaStatusLogEntry["status_anterior"],
    status_novo: l.status_novo as PropostaStatusLogEntry["status_novo"],
    notas: (l.notas as string) ?? "",
    created_at: l.created_at as string,
  }));
}
