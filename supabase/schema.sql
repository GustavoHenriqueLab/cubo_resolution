-- ============================================================
-- FlowLab — Schema Supabase
-- Execute este script no SQL Editor do Supabase (ordem correta)
-- ============================================================

-- ============================================================
-- 1. PERFIS (extensao dos usuarios do Supabase Auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome       TEXT,
  role       TEXT NOT NULL DEFAULT 'viewer'
               CHECK (role IN ('admin', 'viewer')),
  departamento_slug TEXT REFERENCES public.departamentos(slug) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. DEPARTAMENTOS (12 registros fixos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.departamentos (
  slug      TEXT PRIMARY KEY,
  nome      TEXT NOT NULL,
  descricao TEXT
);

-- ============================================================
-- 3. STARTUPS (dados brutos do scraper)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.startups (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome             TEXT NOT NULL UNIQUE,
  descricao        TEXT DEFAULT '',
  segmento         TEXT DEFAULT '',
  fundadores       TEXT DEFAULT '',
  site             TEXT DEFAULT '',
  url_perfil       TEXT DEFAULT '',
  modelos_negocio  TEXT[] DEFAULT '{}',
  tecnologias      TEXT[] DEFAULT '{}',
  data_adicionado  DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. STARTUP x DEPARTAMENTO (classificacao Gemini, N:M)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.startup_departamentos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id        UUID NOT NULL REFERENCES public.startups(id)
                      ON DELETE CASCADE,
  departamento_slug TEXT NOT NULL REFERENCES public.departamentos(slug)
                      ON DELETE CASCADE,
  confianca         TEXT NOT NULL CHECK (confianca IN ('alta', 'media')),
  aderencia_lab     TEXT CHECK (aderencia_lab IN ('alta', 'media', 'baixa')),
  analise           TEXT,
  avaliacao         JSONB,
  rank              INT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(startup_id, departamento_slug)
);

-- ============================================================
-- 5. EXECUCOES DO PIPELINE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pipeline_executions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type         TEXT NOT NULL CHECK (type IN ('scraper', 'classifier', 'ranker', 'destaques')),
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  summary      JSONB,
  triggered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. DESTAQUES LAB (8-15 por execucao do pipeline)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.destaques_lab (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL UNIQUE REFERENCES public.startups(id)
               ON DELETE CASCADE,
  rank       INT NOT NULL,
  analise    TEXT,
  batch_id   UUID REFERENCES public.pipeline_executions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- 7. FUNCAO AUXILIAR PARA RLS (evita recursao infinita)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- 8. RLS — POLITICAS DE ACESSO
-- ============================================================
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departamentos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startups             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startup_departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destaques_lab        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_executions  ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Usuario ve proprio perfil"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admin gerencia perfis"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_admin());

-- departamentos: qualquer autenticado pode ler
CREATE POLICY "Autenticados leem departamentos"
  ON public.departamentos FOR SELECT
  TO authenticated
  USING (true);

-- startups: autenticados leem, admin insere/atualiza/deleta
CREATE POLICY "Autenticados leem startups"
  ON public.startups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin insere startups"
  ON public.startups FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin atualiza startups"
  ON public.startups FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admin deleta startups"
  ON public.startups FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- startup_departamentos: autenticados leem, admin gerencia
CREATE POLICY "Autenticados leem classificacoes"
  ON public.startup_departamentos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin gerencia classificacoes"
  ON public.startup_departamentos FOR ALL
  TO authenticated
  USING (public.is_admin());

-- destaques_lab: autenticados leem
CREATE POLICY "Autenticados leem destaques"
  ON public.destaques_lab FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin gerencia destaques"
  ON public.destaques_lab FOR ALL
  TO authenticated
  USING (public.is_admin());

-- pipeline_executions: apenas admin
CREATE POLICY "Admin ve execucoes"
  ON public.pipeline_executions FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admin gerencia execucoes"
  ON public.pipeline_executions FOR ALL
  TO authenticated
  USING (public.is_admin());


-- ============================================================
-- 9. TRIGGERS AUTOMATICOS
-- ============================================================

-- Criar perfil automaticamente ao cadastrar
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.startups;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.startups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.startup_departamentos;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.startup_departamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ============================================================
-- 9. SEED — 12 DEPARTAMENTOS
-- ============================================================
INSERT INTO public.departamentos (slug, nome, descricao) VALUES
('atendimento',        'Atendimento',        'Frente geral de atendimento do laboratório — recepção de pacientes, agendamento de exames, triagem, liberação de laudos, contato com médicos solicitantes, call center, SAC laboratorial.'),
('comercial',          'Comercial',          'Relacionamento com parceiros — convênios com planos de saúde, contratos com hospitais e clínicas, prospecção de novos clientes B2B, gestão de carteira de médicos parceiros, CRM, representantes comerciais.'),
('qualidade',          'Qualidade',          'Controle de qualidade de processos e auditoria — ISO 9001, ISO 15189, BPF, acreditação laboratorial (PALC, DICQ), auditorias internas e externas, não conformidades, ações corretivas, indicadores de qualidade, CQI/CQE.'),
('transporte',         'Transporte',         'Logística laboratorial — coleta e transporte de amostras biológicas, frota de veículos, rotas de coleta, logística reversa de materiais, cadeia fria, rastreamento de amostras, entregas de kits e insumos, motoboys, motoristas, tracking em tempo real.'),
('biologia-molecular', 'Biologia Molecular', 'Patologia molecular — extração de DNA/RNA, PCR em tempo real, sequenciamento NGS, análise de mutações genéticas, biomarcadores moleculares, medicina personalizada, oncologia molecular, farmacogenética, diagnóstico molecular de doenças infecciosas.'),
('faturamento',        'Faturamento',        'Gestão de faturamento de plano de saúde — TISS/ANS, TUSS, guias de procedimentos, autorizações, glosas, conciliação de repasses, fechamento de lote, integração com operadoras, faturamento SUS, contas médicas, análise de glosas hospitalares.'),
('rh',                 'RH',                 'Recursos humanos e departamento pessoal — recrutamento e seleção de profissionais de saúde, folha de pagamento, controle de ponto, férias, benefícios, medicina ocupacional, treinamento de biossegurança, gestão de escala e plantão, compliance trabalhista.'),
('area-tecnica',       'Área Técnica',       'Fluxo laboratorial — automação de processos laboratoriais, equipamentos de diagnóstico, analisadores bioquímicos, hematologia, imunologia, microbiologia clínica, citologia, histopatologia, gestão de amostras (pré-analítico, analítico, pós-analítico), LIS, controle de temperatura.'),
('estoque',            'Estoque',            'Gestão de estoque — almoxarifado de reagentes e insumos laboratoriais, controle de validade, rastreabilidade de lotes, inventário de materiais, curva ABC, ponto de ressuprimento, integração com fornecedores, controle de kits de coleta, EPIs, gestão de consumo por setor.'),
('financeiro',         'Financeiro',         'Gestão de contas a pagar e receber — tesouraria, fluxo de caixa, conciliação bancária, pagamento a fornecedores, controle de inadimplência, negociação de prazos, DRE, orçamento, gestão de custos operacionais laboratoriais, contabilidade.'),
('ti',                 'TI',                 'Tecnologia da informação e AI — LIS/HIS, integração de sistemas laboratoriais, infraestrutura de servidores, cloud computing, cibersegurança de dados de pacientes (LGPD), inteligência artificial para diagnóstico, automação RPA, APIs de interoperabilidade (HL7/FHIR), PACS, backup e disaster recovery.'),
('equipe-medica',      'Equipe Médica',      'Análise histopatológica — patologistas e médicos patologistas, análise de lâminas, diagnóstico anatomopatológico, imuno-histoquímica, citologia oncótica, biópsias, laudos anatomopatológicos, correlação clínico-patológica, segunda opinião diagnóstica, telepatologia, digitalização de lâminas (whole slide imaging).')
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao;
