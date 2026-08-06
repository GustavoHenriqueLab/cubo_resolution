-- ============================================================
-- MIGRACAO: Novos status de propostas + simplificar startup_status + parcerias
-- ============================================================

-- ============================================================
-- 1. EXPANDIR ENUM proposta_status
-- ============================================================
ALTER TYPE proposta_status ADD VALUE IF NOT EXISTS 'em_tratativas';
ALTER TYPE proposta_status ADD VALUE IF NOT EXISTS 'em_poc';
ALTER TYPE proposta_status ADD VALUE IF NOT EXISTS 'cancelada';
ALTER TYPE proposta_status ADD VALUE IF NOT EXISTS 'finalizado';

-- ============================================================
-- 2. CRIAR NOVO ENUM startup_status (substitui o antigo)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE startup_status_new AS ENUM ('a_contatar', 'em_contato', 'parceiro');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Remover default temporariamente e alterar tipo + mapear valores
ALTER TABLE public.startups ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.startups
  ALTER COLUMN status TYPE startup_status_new
  USING (
    CASE status::text
      WHEN 'finalizado' THEN 'parceiro'::startup_status_new
      WHEN 'a_contatar' THEN 'a_contatar'::startup_status_new
      ELSE 'em_contato'::startup_status_new
    END
  );

-- Renomear enums: startup_status -> startup_status_old, startup_status_new -> startup_status
ALTER TYPE startup_status RENAME TO startup_status_old;
ALTER TYPE startup_status_new RENAME TO startup_status;

-- Dropar funcao que depende do enum antigo
DROP FUNCTION IF EXISTS public.startup_status_label(startup_status_old);
DROP FUNCTION IF EXISTS public.startup_status_label(startup_status);

-- Dropar tabelas que dependem do enum antigo (se existirem de execucao anterior)
DROP TABLE IF EXISTS public.startup_status_log CASCADE;

-- Dropar o enum antigo
DROP TYPE startup_status_old;

-- Ajustar o default da coluna
ALTER TABLE public.startups
  ALTER COLUMN status SET DEFAULT 'a_contatar'::startup_status;

-- ============================================================
-- 3. ATUALIZAR FUNCAO startup_status_label
-- ============================================================
CREATE OR REPLACE FUNCTION public.startup_status_label(s public.startup_status)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE s
    WHEN 'a_contatar' THEN 'A Contatar'
    WHEN 'em_contato' THEN 'Em Contato'
    WHEN 'parceiro'   THEN 'Parceiro'
  END;
$$;

-- ============================================================
-- 4. TABELA DE LOG DE STATUS DE STARTUPS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.startup_status_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id      UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  admin_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status_anterior startup_status NOT NULL,
  status_novo     startup_status NOT NULL,
  notas           TEXT DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_startup_status_log_startup ON public.startup_status_log(startup_id);
CREATE INDEX IF NOT EXISTS idx_startup_status_log_created ON public.startup_status_log(created_at);

-- RLS: todos autenticados podem ler o log, admin insere
ALTER TABLE public.startup_status_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados leem status_log" ON public.startup_status_log;
CREATE POLICY "Autenticados leem status_log"
  ON public.startup_status_log FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin insere status_log" ON public.startup_status_log;
CREATE POLICY "Admin insere status_log"
  ON public.startup_status_log FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- ============================================================
-- 5. TABELA DE LOG DE STATUS DE PROPOSTAS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.proposta_status_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id     UUID NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  admin_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status_anterior proposta_status NOT NULL,
  status_novo     proposta_status NOT NULL,
  notas           TEXT DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposta_status_log_proposta ON public.proposta_status_log(proposta_id);
CREATE INDEX IF NOT EXISTS idx_proposta_status_log_created ON public.proposta_status_log(created_at);

-- RLS: todos autenticados podem ler o log, admin insere
ALTER TABLE public.proposta_status_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados leem proposta_status_log" ON public.proposta_status_log;
CREATE POLICY "Autenticados leem proposta_status_log"
  ON public.proposta_status_log FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin insere proposta_status_log" ON public.proposta_status_log;
CREATE POLICY "Admin insere proposta_status_log"
  ON public.proposta_status_log FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- ============================================================
-- 6. CRIAR TABELA parcerias
-- ============================================================
CREATE TABLE IF NOT EXISTS public.parcerias (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id         UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  departamento_slug  TEXT,
  proposta_id        UUID REFERENCES public.propostas(id) ON DELETE SET NULL,
  descricao          TEXT DEFAULT '',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parcerias_startup ON public.parcerias(startup_id);
CREATE INDEX IF NOT EXISTS idx_parcerias_departamento ON public.parcerias(departamento_slug);
CREATE INDEX IF NOT EXISTS idx_parcerias_proposta ON public.parcerias(proposta_id);

-- ============================================================
-- 7. RLS — parcerias
-- ============================================================
ALTER TABLE public.parcerias ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ver parcerias
DROP POLICY IF EXISTS "Autenticados leem parcerias" ON public.parcerias;
CREATE POLICY "Autenticados leem parcerias"
  ON public.parcerias FOR SELECT
  TO authenticated
  USING (true);

-- Admin gerencia parcerias
DROP POLICY IF EXISTS "Admin gerencia parcerias" ON public.parcerias;
CREATE POLICY "Admin gerencia parcerias"
  ON public.parcerias FOR ALL
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 8. TRIGGER: quando proposta e finalizada → startup vira parceiro + cria parceria
-- ============================================================
CREATE OR REPLACE FUNCTION public.on_proposta_finalizada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'finalizado' AND (OLD.status IS NULL OR OLD.status <> 'finalizado') THEN
    -- Atualiza a startup para parceiro
    UPDATE public.startups
    SET status = 'parceiro'
    WHERE id = NEW.startup_id;

    -- Cria o registro de parceria
    INSERT INTO public.parcerias (startup_id, departamento_slug, proposta_id, descricao)
    VALUES (
      NEW.startup_id,
      NEW.departamento_slug,
      NEW.id,
      COALESCE(NEW.admin_notas, '')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_proposta_finalizada ON public.propostas;
CREATE TRIGGER trigger_proposta_finalizada
  AFTER UPDATE ON public.propostas
  FOR EACH ROW
  EXECUTE FUNCTION public.on_proposta_finalizada();
