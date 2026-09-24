-- ============================================================
-- Limpar apenas propostas e parcerias
-- Mantem startups, classificacoes, destaques, favoritos,
-- atribuicoes, status log de startups, pipelines e usuarios.
-- Execute no SQL Editor do Supabase (como owner, ignora RLS).
-- ============================================================

-- Ordem respeita as FKs:
--   proposta_status_log -> propostas
--   parcerias           -> propostas / startups
DELETE FROM public.proposta_status_log;
DELETE FROM public.parcerias;
DELETE FROM public.propostas;
