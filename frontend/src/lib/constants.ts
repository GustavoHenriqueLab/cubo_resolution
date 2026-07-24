export const DEPARTAMENTOS: Record<string, string> = {
  "atendimento": "Atendimento",
  "comercial": "Comercial",
  "qualidade": "Qualidade",
  "transporte": "Transporte",
  "biologia-molecular": "Biologia Molecular",
  "faturamento": "Faturamento",
  "rh": "RH",
  "area-tecnica": "Área Técnica",
  "estoque": "Estoque",
  "financeiro": "Financeiro",
  "ti": "TI",
  "equipe-medica": "Equipe Médica",
};

export const DEPARTAMENTOS_DESCRICOES: Record<string, string> = {
  "atendimento":
    "Frente geral de atendimento do laboratório — recepção de pacientes, agendamento de exames, triagem, liberação de laudos, contato com médicos solicitantes, call center, SAC laboratorial.",
  "comercial":
    "Relacionamento com parceiros — convênios com planos de saúde, contratos com hospitais e clínicas, prospecção de novos clientes B2B, gestão de carteira de médicos parceiros, CRM, representantes comerciais.",
  "qualidade":
    "Controle de qualidade de processos e auditoria — ISO 9001, ISO 15189, BPF, acreditação laboratorial (PALC, DICQ), auditorias internas e externas, não conformidades, ações corretivas, indicadores de qualidade, CQI/CQE.",
  "transporte":
    "Logística laboratorial — coleta e transporte de amostras biológicas, frota de veículos, rotas de coleta, logística reversa de materiais, cadeia fria, rastreamento de amostras, entregas de kits e insumos, motoboys, motoristas, tracking em tempo real.",
  "biologia-molecular":
    "Patologia molecular — extração de DNA/RNA, PCR em tempo real, sequenciamento NGS, análise de mutações genéticas, biomarcadores moleculares, medicina personalizada, oncologia molecular, farmacogenética, diagnóstico molecular de doenças infecciosas.",
  "faturamento":
    "Responsável pela gestão de faturamento de plano de saúde — TISS/ANS, TUSS, guias de procedimentos, autorizações, glosas, conciliação de repasses, fechamento de lote, integração com operadoras, faturamento SUS, contas médicas, análise de glosas hospitalares.",
  "rh":
    "Setor de recursos humanos e departamento pessoal — recrutamento e seleção de profissionais de saúde, folha de pagamento, controle de ponto, férias, benefícios, medicina ocupacional, treinamento de biossegurança, gestão de escala e plantão, compliance trabalhista.",
  "area-tecnica":
    "Fluxo laboratorial — automação de processos laboratoriais, equipamentos de diagnóstico, analisadores bioquímicos, hematologia, imunologia, microbiologia clínica, citologia, histopatologia, gestão de amostras (pré-analítico, analítico, pós-analítico), LIS, controle de temperatura.",
  "estoque":
    "Gestão de estoque — almoxarifado de reagentes e insumos laboratoriais, controle de validade, rastreabilidade de lotes, inventário de materiais, curva ABC, ponto de ressuprimento, integração com fornecedores, controle de kits de coleta, EPIs, gestão de consumo por setor.",
  "financeiro":
    "Gestão de contas a pagar e receber — tesouraria, fluxo de caixa, conciliação bancária, pagamento a fornecedores, controle de inadimplência, negociação de prazos, DRE, orçamento, gestão de custos operacionais laboratoriais, contabilidade.",
  "ti":
    "Tecnologia da informação e AI — LIS/HIS, integração de sistemas laboratoriais, infraestrutura de servidores, cloud computing, cibersegurança de dados de pacientes (LGPD), inteligência artificial para diagnóstico, automação RPA, APIs de interoperabilidade (HL7/FHIR), PACS, backup e disaster recovery.",
  "equipe-medica":
    "Análise histopatológica — patologistas e médicos patologistas, análise de lâminas, diagnóstico anatomopatológico, imuno-histoquímica, citologia oncótica, biópsias, laudos anatomopatológicos, correlação clínico-patológica, segunda opinião diagnóstica, telepatologia, digitalização de lâminas (whole slide imaging).",
};

export function slugParaNome(slug: string): string {
  return DEPARTAMENTOS[slug] ?? slug;
}

export function nomeParaSlug(nome: string): string {
  const entry = Object.entries(DEPARTAMENTOS).find(
    ([, displayName]) => displayName === nome
  );
  return entry?.[0] ?? nome.toLowerCase().replace(/\s+/g, "-");
}
