-- PASSO 1: Adiciona 'sobrestado' ao ENUM (execute primeiro)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.startup_status'::regtype
      AND enumlabel = 'sobrestado'
  ) THEN
    ALTER TYPE public.startup_status ADD VALUE 'sobrestado';
  END IF;
END $$;
