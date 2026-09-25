-- ============================================================
-- Fluxo de propostas com GESTOR (manager)
--
-- Adiciona:
--  - propostas.gestor_id / gestor_status / gestor_notas
--  - funcoes is_manager() e listar_gestores()
--  - RLS: gestor ve e atualiza as propostas destinadas a ele,
--         insere no log e le perfis (nome dos autores)
--
-- Idempotente. Rode no SQL Editor do Supabase (banco do cubo).
-- ============================================================

-- 1. Colunas -------------------------------------------------
ALTER TABLE public.propostas
  ADD COLUMN IF NOT EXISTS gestor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gestor_status TEXT NOT NULL DEFAULT 'aprovada'
    CHECK (gestor_status IN ('pendente', 'aprovada', 'rejeitada')),
  ADD COLUMN IF NOT EXISTS gestor_notas TEXT;

-- As propostas existentes (default 'aprovada' no ADD COLUMN) continuam no
-- fluxo do admin; novas propostas com gestor nascem 'pendente' (a API seta).
ALTER TABLE public.propostas
  ALTER COLUMN gestor_status SET DEFAULT 'pendente';

CREATE INDEX IF NOT EXISTS idx_propostas_gestor ON public.propostas(gestor_id);

-- 2. Funcoes -------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role = 'manager' FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.listar_gestores()
RETURNS TABLE (id uuid, nome text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id, COALESCE(nome, 'Gestor')
  FROM public.profiles
  WHERE role = 'manager'
  ORDER BY nome;
$$;

GRANT EXECUTE ON FUNCTION public.listar_gestores() TO authenticated;

-- 3. RLS: propostas ------------------------------------------
DROP POLICY IF EXISTS "Usuarios veem suas propostas" ON public.propostas;
CREATE POLICY "Usuarios veem suas propostas"
  ON public.propostas FOR SELECT
  TO authenticated
  USING (
    usuario_id = auth.uid()
    OR gestor_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Admin atualiza propostas" ON public.propostas;
CREATE POLICY "Gestor e admin atualizam propostas"
  ON public.propostas FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR (gestor_id = auth.uid() AND gestor_status = 'pendente' AND public.is_manager())
  )
  WITH CHECK (
    public.is_admin()
    OR (gestor_id = auth.uid() AND public.is_manager())
  );

-- Usuario cria a propria proposta; direto ao admin so gestor/admin
DROP POLICY IF EXISTS "Usuarios podem criar propostas" ON public.propostas;
CREATE POLICY "Usuarios podem criar propostas"
  ON public.propostas FOR INSERT
  TO authenticated
  WITH CHECK (
    usuario_id = auth.uid()
    AND (
      gestor_id IS NOT NULL
      OR public.is_manager()
      OR public.is_admin()
    )
  );

-- 4. RLS: proposta_status_log --------------------------------
DROP POLICY IF EXISTS "Admin insere proposta_status_log" ON public.proposta_status_log;
CREATE POLICY "Gestor e admin inserem proposta_status_log"
  ON public.proposta_status_log FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.propostas p
      WHERE p.id = proposta_id AND p.gestor_id = auth.uid()
    )
  );

-- 5. RLS: profiles (gestor le nomes dos autores) -------------
DROP POLICY IF EXISTS "Gestor le perfis" ON public.profiles;
CREATE POLICY "Gestor le perfis"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_manager());
