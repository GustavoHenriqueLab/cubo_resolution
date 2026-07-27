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
