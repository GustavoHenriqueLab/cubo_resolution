export type StartupStatus = "a_contatar" | "em_contato" | "parceiro";

export const STATUS_LABELS: Record<StartupStatus, string> = {
  a_contatar: "A Contatar",
  em_contato: "Em Contato",
  parceiro: "Parceiro",
};

export const STATUS_COLORS: Record<StartupStatus, string> = {
  a_contatar: "bg-slate-100 text-slate-600 border-slate-300",
  em_contato: "bg-blue-50 text-blue-700 border-blue-300",
  parceiro: "bg-emerald-50 text-emerald-700 border-emerald-300",
};

export const STATUS_ORDER: StartupStatus[] = [
  "a_contatar",
  "em_contato",
  "parceiro",
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

export type PropostaStatus =
  | "pendente"
  | "em_tratativas"
  | "em_poc"
  | "aprovada"
  | "rejeitada"
  | "cancelada"
  | "finalizado";

export type PropostaTipo = "poc" | "parceria" | "contratacao" | "outro";

export const PROPOSTA_STATUS_LABELS: Record<PropostaStatus, string> = {
  pendente: "Pendente",
  em_tratativas: "Em Tratativas",
  em_poc: "Em POC",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
  cancelada: "Cancelada",
  finalizado: "Finalizado",
};

export const PROPOSTA_STATUS_COLORS: Record<PropostaStatus, string> = {
  pendente: "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-400",
  em_tratativas: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400",
  em_poc: "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-400",
  aprovada: "border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400",
  rejeitada: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400",
  cancelada: "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-400",
  finalizado: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400",
};

export const PROPOSTA_STATUS_FILTER_COLORS: Record<PropostaStatus, string> = {
  pendente: "border-yellow-400 bg-yellow-100 text-yellow-800 dark:border-yellow-400 dark:bg-yellow-500/20 dark:text-yellow-300",
  em_tratativas: "border-blue-400 bg-blue-100 text-blue-800 dark:border-blue-400 dark:bg-blue-500/20 dark:text-blue-300",
  em_poc: "border-purple-400 bg-purple-100 text-purple-800 dark:border-purple-400 dark:bg-purple-500/20 dark:text-purple-300",
  aprovada: "border-green-400 bg-green-100 text-green-800 dark:border-green-400 dark:bg-green-500/20 dark:text-green-300",
  rejeitada: "border-red-400 bg-red-100 text-red-800 dark:border-red-400 dark:bg-red-500/20 dark:text-red-300",
  cancelada: "border-gray-400 bg-gray-100 text-gray-700 dark:border-gray-500 dark:bg-gray-600 dark:text-gray-300",
  finalizado: "border-emerald-400 bg-emerald-100 text-emerald-800 dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-300",
};

export const PROPOSTA_TIPO_LABELS: Record<PropostaTipo, string> = {
  poc: "POC",
  parceria: "Parceria",
  contratacao: "Contratacao",
  outro: "Outro",
};

export interface Parceria {
  id: string;
  startup_id: string;
  startup_nome?: string;
  departamento_slug: string | null;
  departamento_nome: string | null;
  proposta_id: string | null;
  proposta_tipo?: string | null;
  descricao: string;
  created_at: string;
  updated_at: string;
}

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

export interface StartupStatusLogEntry {
  id: string;
  startup_id: string;
  admin_id: string | null;
  admin_nome: string | null;
  status_anterior: StartupStatus;
  status_novo: StartupStatus;
  notas: string;
  created_at: string;
}

export interface PropostaStatusLogEntry {
  id: string;
  proposta_id: string;
  admin_id: string | null;
  admin_nome: string | null;
  status_anterior: PropostaStatus;
  status_novo: PropostaStatus;
  notas: string;
  created_at: string;
}
