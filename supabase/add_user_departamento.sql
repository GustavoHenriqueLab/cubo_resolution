-- Adiciona departamento_slug à tabela profiles
-- e atualiza o trigger de criação de usuário

-- 1. Adicionar coluna
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS departamento_slug TEXT
  REFERENCES public.departamentos(slug) ON DELETE SET NULL;

-- 2. Atualizar a função do trigger para salvar departamento_slug
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, role, departamento_slug)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.email),
    'viewer',
    NEW.raw_user_meta_data ->> 'departamento_slug'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- O trigger permanece o mesmo (já foi recriado pelo schema.sql)
