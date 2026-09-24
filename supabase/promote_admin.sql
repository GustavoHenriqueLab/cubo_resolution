-- ============================================================
-- Promover um usuario a admin
-- Rode no SQL Editor do Supabase (banco do cubo).
-- Se existirem contas antigas sem profile, rode antes o
-- backfill_profiles.sql (senao o UPDATE nao encontra a linha).
-- ============================================================

UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email = 'gustavo.henrique@laboratoriolab.com.br'
);
