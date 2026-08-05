-- Garante que o UPDATE em startups funcione com a funcao is_admin()
-- sem recursao infinita. Execute no SQL Editor do Supabase.

-- 1. Criar/atualizar a funcao is_admin (bypassa RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Remover politicas antigas de startups que podem causar recursao
DROP POLICY IF EXISTS "Admin gerencia startups" ON public.startups;
DROP POLICY IF EXISTS "Admin atualiza startups" ON public.startups;
DROP POLICY IF EXISTS "Autenticados leem startups" ON public.startups;

-- 3. Recriar politicas usando a funcao is_admin()
CREATE POLICY "Autenticados leem startups"
  ON public.startups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin insere startups"
  ON public.startups FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin atualiza startups"
  ON public.startups FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin deleta startups"
  ON public.startups FOR DELETE
  TO authenticated
  USING (public.is_admin());
