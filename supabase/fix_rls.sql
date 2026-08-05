-- ============================================================
-- CORRIGIR RECURSAO INFINITA NAS POLITICAS RLS
-- ============================================================
-- Problema: politicas admin consultam profiles, que tem RLS
-- que consulta profiles -> loop infinito.
-- Solucao: remover politicas recursivas com sub-select em profiles.
-- Usar funcao SECURITY DEFINER para bypassar RLS no check de role.

-- 1. Criar funcao auxiliar (bypassa RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Remover TODAS as politicas antigas
DROP POLICY IF EXISTS "Usuario ve proprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admin gerencia perfis" ON public.profiles;
DROP POLICY IF EXISTS "Autenticados leem startups" ON public.startups;
DROP POLICY IF EXISTS "Admin gerencia startups" ON public.startups;
DROP POLICY IF EXISTS "Autenticados leem classificacoes" ON public.startup_departamentos;
DROP POLICY IF EXISTS "Admin gerencia classificacoes" ON public.startup_departamentos;
DROP POLICY IF EXISTS "Autenticados leem destaques" ON public.destaques_lab;
DROP POLICY IF EXISTS "Admin gerencia destaques" ON public.destaques_lab;
DROP POLICY IF EXISTS "Autenticados leem departamentos" ON public.departamentos;
DROP POLICY IF EXISTS "Admin ve execucoes" ON public.pipeline_executions;
DROP POLICY IF EXISTS "Admin gerencia execucoes" ON public.pipeline_executions;

-- 3. Recriar politicas SEM recursao

-- profiles: cada um ve o proprio
CREATE POLICY "Usuario ve proprio perfil"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- profiles: admin gerencia (usa funcao em vez de sub-select)
CREATE POLICY "Admin gerencia perfis"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_admin());

-- departamentos: qualquer autenticado le
CREATE POLICY "Autenticados leem departamentos"
  ON public.departamentos FOR SELECT
  TO authenticated
  USING (true);

-- startups: autenticados leem
CREATE POLICY "Autenticados leem startups"
  ON public.startups FOR SELECT
  TO authenticated
  USING (true);

-- startups: admin gerencia (usa funcao)
CREATE POLICY "Admin gerencia startups"
  ON public.startups FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin atualiza startups"
  ON public.startups FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- startup_departamentos: autenticados leem
CREATE POLICY "Autenticados leem classificacoes"
  ON public.startup_departamentos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin gerencia classificacoes"
  ON public.startup_departamentos FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin atualiza classificacoes"
  ON public.startup_departamentos FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- destaques_lab: autenticados leem
CREATE POLICY "Autenticados leem destaques"
  ON public.destaques_lab FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin gerencia destaques"
  ON public.destaques_lab FOR ALL
  TO authenticated
  USING (public.is_admin());

-- pipeline_executions: admin le/gerencia
CREATE POLICY "Admin ve execucoes"
  ON public.pipeline_executions FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admin gerencia execucoes"
  ON public.pipeline_executions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());
