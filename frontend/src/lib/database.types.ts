export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nome: string | null;
          role: "admin" | "viewer";
          departamento_slug: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          nome?: string | null;
          role?: "admin" | "viewer";
          departamento_slug?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string | null;
          role?: "admin" | "viewer";
          departamento_slug?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      departamentos: {
        Row: {
          slug: string;
          nome: string;
          descricao: string | null;
        };
        Insert: {
          slug: string;
          nome: string;
          descricao?: string | null;
        };
        Update: {
          slug?: string;
          nome?: string;
          descricao?: string | null;
        };
      };
      startups: {
        Row: {
          id: string;
          nome: string;
          descricao: string;
          segmento: string;
          fundadores: string;
          site: string;
          url_perfil: string;
          modelos_negocio: string[];
          tecnologias: string[];
          status: "a_contatar" | "interesse" | "em_tratativas" | "em_poc" | "sobrestado" | "finalizado";
          data_adicionado: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          descricao?: string;
          segmento?: string;
          fundadores?: string;
          site?: string;
          url_perfil?: string;
          modelos_negocio?: string[];
          tecnologias?: string[];
          status?: "a_contatar" | "interesse" | "em_tratativas" | "em_poc" | "sobrestado" | "finalizado";
          data_adicionado?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          descricao?: string;
          segmento?: string;
          fundadores?: string;
          site?: string;
          url_perfil?: string;
          modelos_negocio?: string[];
          tecnologias?: string[];
          status?: "a_contatar" | "interesse" | "em_tratativas" | "em_poc" | "sobrestado" | "finalizado";
          data_adicionado?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      startup_departamentos: {
        Row: {
          id: string;
          startup_id: string;
          departamento_slug: string;
          confianca: "alta" | "media";
          aderencia_lab: "alta" | "media" | "baixa" | null;
          analise: string | null;
          avaliacao: Json | null;
          rank: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          startup_id: string;
          departamento_slug: string;
          confianca: "alta" | "media";
          aderencia_lab?: "alta" | "media" | "baixa" | null;
          analise?: string | null;
          avaliacao?: Json | null;
          rank?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          startup_id?: string;
          departamento_slug?: string;
          confianca?: "alta" | "media";
          aderencia_lab?: "alta" | "media" | "baixa" | null;
          analise?: string | null;
          avaliacao?: Json | null;
          rank?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      destaques_lab: {
        Row: {
          id: string;
          startup_id: string;
          rank: number;
          analise: string | null;
          batch_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          startup_id: string;
          rank: number;
          analise?: string | null;
          batch_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          startup_id?: string;
          rank?: number;
          analise?: string | null;
          batch_id?: string | null;
          created_at?: string;
        };
      };
      pipeline_executions: {
        Row: {
          id: string;
          type: "scraper" | "classifier" | "ranker" | "destaques";
          status: "pending" | "running" | "completed" | "failed";
          started_at: string | null;
          completed_at: string | null;
          summary: Json | null;
          triggered_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: "scraper" | "classifier" | "ranker" | "destaques";
          status?: "pending" | "running" | "completed" | "failed";
          started_at?: string | null;
          completed_at?: string | null;
          summary?: Json | null;
          triggered_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: "scraper" | "classifier" | "ranker" | "destaques";
          status?: "pending" | "running" | "completed" | "failed";
          started_at?: string | null;
          completed_at?: string | null;
          summary?: Json | null;
          triggered_by?: string | null;
          created_at?: string;
        };
      };
      startup_favorites: {
        Row: {
          id: string;
          user_id: string;
          startup_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          startup_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          startup_id?: string;
          created_at?: string;
        };
      };
      startup_users: {
        Row: {
          id: string;
          startup_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          startup_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          startup_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      startup_status: "a_contatar" | "interesse" | "em_tratativas" | "em_poc" | "sobrestado" | "finalizado";
    };
  };
}
