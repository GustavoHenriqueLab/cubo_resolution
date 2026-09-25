-- ============================================================
-- Anexos de propostas
--
-- Bucket PRIVADO "proposta-anexos" (download somente via URL
-- assinada) + tabela de metadados + RLS:
--   - veem/baixam: autor, gestor designado e admin
--   - anexam: autor (enquanto status 'pendente') e gestor
--     designado (durante a revisao)
--   - removem: quem anexa + admin
--
-- Path dos arquivos: {proposta_id}/{timestamp}-{nome}
-- Idempotente. Rode no SQL Editor do Supabase (banco do cubo).
-- ============================================================

-- 1. Bucket privado -----------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'proposta-anexos',
  'proposta-anexos',
  false,
  10485760, -- 10 MB por arquivo
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-zip-compressed'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Tabela de metadados ------------------------------------
CREATE TABLE IF NOT EXISTS public.proposta_anexos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id UUID NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  enviado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  nome        TEXT NOT NULL,
  path        TEXT NOT NULL UNIQUE,
  mime        TEXT,
  tamanho     INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposta_anexos_proposta
  ON public.proposta_anexos(proposta_id);

ALTER TABLE public.proposta_anexos ENABLE ROW LEVEL SECURITY;

-- 3. Funcoes de permissao -----------------------------------
CREATE OR REPLACE FUNCTION public.pode_ver_proposta(p_proposta_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.propostas p
    WHERE p.id = p_proposta_id
      AND (
        p.usuario_id = auth.uid()
        OR p.gestor_id = auth.uid()
        OR public.is_admin()
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.pode_anexar_proposta(p_proposta_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.propostas p
    WHERE p.id = p_proposta_id
      AND (
        (p.usuario_id = auth.uid() AND p.status = 'pendente')
        OR (p.gestor_id = auth.uid() AND p.gestor_status = 'pendente')
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.pode_remover_anexo(p_proposta_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.pode_anexar_proposta(p_proposta_id) OR public.is_admin();
$$;

GRANT EXECUTE ON FUNCTION public.pode_ver_proposta(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_anexar_proposta(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_remover_anexo(uuid) TO authenticated;

-- 4. RLS da tabela ------------------------------------------
DROP POLICY IF EXISTS "Anexos visiveis para quem ve a proposta" ON public.proposta_anexos;
CREATE POLICY "Anexos visiveis para quem ve a proposta"
  ON public.proposta_anexos FOR SELECT
  TO authenticated
  USING (public.pode_ver_proposta(proposta_id));

DROP POLICY IF EXISTS "Autor e gestor anexam" ON public.proposta_anexos;
CREATE POLICY "Autor e gestor anexam"
  ON public.proposta_anexos FOR INSERT
  TO authenticated
  WITH CHECK (
    public.pode_anexar_proposta(proposta_id)
    AND enviado_por = auth.uid()
  );

DROP POLICY IF EXISTS "Autor, gestor e admin removem anexo" ON public.proposta_anexos;
CREATE POLICY "Autor, gestor e admin removem anexo"
  ON public.proposta_anexos FOR DELETE
  TO authenticated
  USING (public.pode_remover_anexo(proposta_id));

-- 5. Policies do Storage ------------------------------------
DROP POLICY IF EXISTS "proposta_anexos_select" ON storage.objects;
CREATE POLICY "proposta_anexos_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'proposta-anexos'
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND public.pode_ver_proposta(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "proposta_anexos_insert" ON storage.objects;
CREATE POLICY "proposta_anexos_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'proposta-anexos'
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND public.pode_anexar_proposta(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "proposta_anexos_delete" ON storage.objects;
CREATE POLICY "proposta_anexos_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'proposta-anexos'
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND public.pode_remover_anexo(((storage.foldername(name))[1])::uuid)
  );
