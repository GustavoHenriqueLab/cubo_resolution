export type StartupStatus =
  | "a_contatar"
  | "interesse"
  | "em_tratativas"
  | "em_poc"
  | "sobrestado"
  | "finalizado";

export const STATUS_LABELS: Record<StartupStatus, string> = {
  a_contatar: "A Contatar",
  interesse: "Interesse",
  em_tratativas: "Em Tratativas",
  em_poc: "Em POC",
  sobrestado: "Sobrestado",
  finalizado: "Finalizado",
};

export const STATUS_COLORS: Record<StartupStatus, string> = {
  a_contatar: "bg-slate-100 text-slate-600 border-slate-300",
  interesse: "bg-amber-50 text-amber-700 border-amber-300",
  em_tratativas: "bg-blue-50 text-blue-700 border-blue-300",
  em_poc: "bg-purple-50 text-purple-700 border-purple-300",
  sobrestado: "bg-red-50 text-red-600 border-red-300",
  finalizado: "bg-emerald-50 text-emerald-700 border-emerald-300",
};

export const STATUS_ORDER: StartupStatus[] = [
  "a_contatar",
  "interesse",
  "em_tratativas",
  "em_poc",
  "sobrestado",
  "finalizado",
];

export interface StartupRaw {
  id: number;
  nome: string;
  descricao: string;
  segmento: string;
  fundadores: string;
  site: string;
  url_perfil: string;
  modelos_negocio: string[];
  tecnologias: string[];
  status: StartupStatus;
  data_adicionado?: string;
}

export interface AvaliacaoGemini {
  problema_atendido?: string;
  aderencia_saude?: string;
  maturidade?: string;
  integracao?: string;
  conformidade?: string;
  impacto?: string;
  prazo?: string;
  riscos?: string;
  piloto?: string;
}

export interface StartupClassificada {
  nome: string;
  confianca: "alta" | "media";
  aderencia_lab?: "alta" | "media" | "baixa";
  analise?: string;
  avaliacao?: AvaliacaoGemini;
  rank?: number;
}

export interface DestacadoLab {
  nome: string;
  rank: number;
  analise: string;
}

export interface DepartamentosData {
  destaque_lab: string[];
  destaque_lab_analises?: DestacadoLab[];
  departamentos: {
    [departamento: string]: StartupClassificada[];
  };
}

export interface StartupEnriquecida {
  id: string;
  nome: string;
  confianca: "alta" | "media" | "baixa";
  aderencia_lab?: "alta" | "media" | "baixa";
  analise?: string;
  avaliacao?: AvaliacaoGemini;
  rank?: number;
  descricao: string;
  segmento: string;
  fundadores: string;
  site: string;
  url_perfil: string;
  modelos_negocio: string[];
  tecnologias: string[];
  departamentos: string[];
  confiancaPorDepartamento: Record<string, "alta" | "media">;
  status: StartupStatus;
  data_adicionado?: string;
}

export interface DepartamentoInfo {
  slug: string;
  nome: string;
  descricao: string;
  totalStartups: number;
  altaConfianca: number;
  mediaConfianca: number;
}

export type PropostaStatus = "pendente" | "aprovada" | "rejeitada";

export type PropostaTipo = "poc" | "parceria" | "contratacao" | "outro";

export const PROPOSTA_STATUS_LABELS: Record<PropostaStatus, string> = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
};

export const PROPOSTA_TIPO_LABELS: Record<PropostaTipo, string> = {
  poc: "POC",
  parceria: "Parceria",
  contratacao: "Contratacao",
  outro: "Outro",
};

export interface PropostaRaw {
  id: string;
  startup_id: string;
  departamento_slug: string | null;
  usuario_id: string;
  tipo_integracao: PropostaTipo;
  justificativa: string;
  beneficios: string[];
  status: PropostaStatus;
  admin_notas: string | null;
  admin_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropostaEnriquecida extends PropostaRaw {
  startup_nome: string;
  usuario_nome: string | null;
  usuario_email: string | null;
  departamento_nome: string | null;
}
