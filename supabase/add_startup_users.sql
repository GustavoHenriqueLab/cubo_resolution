-- ============================================================
-- Startup_users: atribuicao de startups a usuarios
-- (secao 7 do add_status_favoritos.sql — para ambientes onde a
--  tabela nao foi criada na epoca)
--
-- Idempotente: pode rodar mesmo que parte dos objetos ja exista.
-- Rode no SQL Editor do Supabase (banco do cubo).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.startup_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(startup_id, user_id)
);

ALTER TABLE public.startup_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados leem startup_users" ON public.startup_users;
CREATE POLICY "Autenticados leem startup_users"
  ON public.startup_users FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin gerencia startup_users" ON public.startup_users;
CREATE POLICY "Admin gerencia startup_users"
  ON public.startup_users FOR ALL
  TO authenticated
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_startup_users_startup_id
  ON public.startup_users(startup_id);

CREATE INDEX IF NOT EXISTS idx_startup_users_user_id
  ON public.startup_users(user_id);

GRANT ALL ON public.startup_users TO anon, authenticated, service_role;
