-- ============================================================
-- PROPOSTAS DE INTEGRACAO
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE proposta_status AS ENUM ('pendente', 'aprovada', 'rejeitada');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE proposta_tipo AS ENUM ('poc', 'parceria', 'contratacao', 'outro');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tabela
CREATE TABLE IF NOT EXISTS public.propostas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id    UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  departamento_slug TEXT,
  usuario_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo_integracao proposta_tipo NOT NULL,
  justificativa TEXT NOT NULL,
  beneficios    TEXT[] NOT NULL DEFAULT '{}',
  status        proposta_status NOT NULL DEFAULT 'pendente',
  admin_notas   TEXT,
  admin_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_propostas_startup ON public.propostas(startup_id);
CREATE INDEX IF NOT EXISTS idx_propostas_usuario ON public.propostas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_propostas_status ON public.propostas(status);
CREATE INDEX IF NOT EXISTS idx_propostas_departamento ON public.propostas(departamento_slug);

-- RLS
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem criar
DROP POLICY IF EXISTS "Usuarios podem criar propostas" ON public.propostas;
CREATE POLICY "Usuarios podem criar propostas"
  ON public.propostas FOR INSERT
  TO authenticated
  WITH CHECK (usuario_id = auth.uid());

-- Usuario ve suas proprias + admin ve todas
DROP POLICY IF EXISTS "Usuarios veem suas propostas" ON public.propostas;
CREATE POLICY "Usuarios veem suas propostas"
  ON public.propostas FOR SELECT
  TO authenticated
  USING (
    usuario_id = auth.uid()
    OR public.is_admin()
  );

-- Admin pode atualizar (aprovar/rejeitar)
DROP POLICY IF EXISTS "Admin atualiza propostas" ON public.propostas;
CREATE POLICY "Admin atualiza propostas"
  ON public.propostas FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
