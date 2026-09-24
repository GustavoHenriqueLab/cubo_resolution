-- ============================================================
-- Backfill: cria profiles para usuarios do Auth sem profile
-- Rode no SQL Editor do Supabase (banco do cubo) ANTES do
-- promote_admin.sql, quando existirem contas antigas criadas
-- antes do schema.sql (que nao ganharam profile pelo trigger).
-- ============================================================

INSERT INTO public.profiles (id, nome, role)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'nome', u.email),
       'viewer'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
