-- ============================================================
-- FlowLab — Status de Startups + Favoritos
-- Execute este script no SQL Editor do Supabase (ordem correta)
-- ============================================================

-- ============================================================
-- 1. ENUM DE STATUS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.startup_status AS ENUM (
    'a_contatar',
    'interesse',
    'em_tratativas',
    'em_poc',
    'sobrestado',
    'finalizado'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. COLUNA STATUS NA TABELA STARTUPS
-- ============================================================
ALTER TABLE public.startups
  ADD COLUMN IF NOT EXISTS status public.startup_status NOT NULL DEFAULT 'a_contatar';

-- ============================================================
-- 3. TABELA DE FAVORITOS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.startup_favorites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, startup_id)
);

-- ============================================================
-- 4. RLS — FAVORITOS
-- ============================================================
ALTER TABLE public.startup_favorites ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ver favoritos
CREATE POLICY "Autenticados leem favoritos"
  ON public.startup_favorites FOR SELECT
  TO authenticated
  USING (true);

-- Usuario insere apenas os proprios favoritos
CREATE POLICY "Usuario insere proprio favorito"
  ON public.startup_favorites FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Usuario remove apenas os proprios favoritos
CREATE POLICY "Usuario remove proprio favorito"
  ON public.startup_favorites FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Admin gerencia todos os favoritos
CREATE POLICY "Admin gerencia favoritos"
  ON public.startup_favorites FOR ALL
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 5. INDICE PARA BUSCA RAPIDA
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_startup_favorites_user_id
  ON public.startup_favorites(user_id);

CREATE INDEX IF NOT EXISTS idx_startup_favorites_startup_id
  ON public.startup_favorites(startup_id);

-- ============================================================
-- 6. STATUS LABELS (funcao auxiliar para exibicao)
-- ============================================================
CREATE OR REPLACE FUNCTION public.startup_status_label(s public.startup_status)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE s
    WHEN 'a_contatar'   THEN 'A Contatar'
    WHEN 'interesse'    THEN 'Interesse'
    WHEN 'em_tratativas' THEN 'Em Tratativas'
    WHEN 'em_poc'      THEN 'Em POC'
    WHEN 'sobrestado'  THEN 'Sobrestado'
    WHEN 'finalizado'  THEN 'Finalizado'
  END;
$$;

-- ============================================================
-- 7. USUARIOS ATRIBUIDOS A STARTUPS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.startup_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(startup_id, user_id)
);

ALTER TABLE public.startup_users ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ver atribuicoes
CREATE POLICY "Autenticados leem startup_users"
  ON public.startup_users FOR SELECT
  TO authenticated
  USING (true);

-- Admin gerencia atribuicoes
CREATE POLICY "Admin gerencia startup_users"
  ON public.startup_users FOR ALL
  TO authenticated
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_startup_users_startup_id
  ON public.startup_users(startup_id);

CREATE INDEX IF NOT EXISTS idx_startup_users_user_id
  ON public.startup_users(user_id);

-- ============================================================
-- 8. CORRIGIR VALORES LEGADOS (em_pausa → sobrestado)
-- ============================================================
UPDATE public.startups SET status = 'sobrestado' WHERE status::text = 'em_pausa';
