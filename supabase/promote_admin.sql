-- ============================================================
-- Promover o primeiro usuario a admin
-- Execute no SQL Editor do Supabase APOS criar a primeira conta
-- ============================================================

-- Substitua 'seu-email@exemplo.com' pelo email do admin
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'seu-email@exemplo.com'
);
