-- PASSO 2: Corrige registros com valor antigo (execute depois do passo 1)
UPDATE public.startups SET status = 'sobrestado' WHERE status::text = 'em_pausa';
