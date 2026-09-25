-- ============================================================
-- Adiciona o papel 'manager' (gestor) aos profiles
--
-- Idempotente: remove qualquer CHECK de role existente e recria
-- com os tres papeis (admin, manager, viewer).
-- Rode no SQL Editor do Supabase (banco do cubo).
-- ============================================================

DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'manager', 'viewer'));
