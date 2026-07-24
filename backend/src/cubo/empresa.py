"""Contexto da empresa LAB Medicina Diagnostica — dados publicos.

Estas informacoes sao publicas e foram extraidas do site institucional
e materiais de divulgacao do laboratorio. Servem como contexto para que
o Gemini possa avaliar a aderencia das startups ao perfil real da empresa.
"""

# ---------------------------------------------------------------------------
# Dados publicos da empresa
# ---------------------------------------------------------------------------

NOME = "LAB Medicina Diagnostica"

CONTEXTO_COMPLETO = (
    "A LAB Medicina Diagnostica e uma empresa privada de saude sediada em "
    "Brasilia, com quatro unidades e atuacao iniciada em 1974.\n\n"
    "Segmento: medicina diagnostica, laboratorios clinicos e servicos "
    "especializados de diagnostico.\n\n"
    "Principais especialidades: anatomia patologica, citopatologia, biologia "
    "molecular, imuno-histoquimica e analises clinicas.\n\n"
    "Principais clientes e parceiros: pacientes, medicos, clinicas, empresas, "
    "instituicoes publicas, operadoras e planos de saude.\n\n"
    "Proposta de valor: oferecer diagnosticos precisos combinando excelencia "
    "cientifica, tecnologia, prevencao, atendimento humanizado e relacionamento "
    "proximo com medicos e pacientes.\n\n"
    "Caracteristicas da operacao: quatro unidades, corpo clinico especializado, "
    "mais de 200 exames, relacionamento com numerosos convenios, portal digital "
    "de resultados e canais tecnicos para medicos.\n\n"
    "Frentes organizacionais relevantes: corpo clinico, operacoes laboratoriais, "
    "qualidade, atendimento, comercial e relacionamento medico, faturamento e "
    "convenios, tecnologia, gestao administrativa e parcerias corporativas.\n\n"
    "Objetivo da associacao com startups: identificar solucoes que possam "
    "aumentar precisao diagnostica, produtividade, integracao de dados, "
    "rastreabilidade, experiencia do paciente, eficiencia comercial, qualidade, "
    "seguranca da informacao e reducao de custos ou glosas."
)

CRITERIOS_AVALIACAO = (
    "Para cada associacao entre departamento e startup, avalie:\n"
    "- problema_atendido: qual dor especifica da LAB essa startup resolve\n"
    "- aderencia_saude: o quanto a solucao se encaixa no setor de diagnostico "
    "(vs solucao generica)\n"
    "- maturidade: estagio da solucao (MVP, produto maduro, em escala)\n"
    "- integracao: facilidade de integrar com LIS, ERPs e sistemas laboratoriais\n"
    "- conformidade: alinhamento com LGPD, ANVISA, ANS e regulamentacoes sanitarias\n"
    "- impacto: beneficio esperado para a LAB (reducao de custo, ganho de "
    "produtividade, prevencao de glosas, etc.)\n"
    "- prazo: tempo estimado de implantacao\n"
    "- riscos: principais riscos (tecnico, operacional, regulatorio)\n"
    "- piloto: viabilidade de realizar um projeto-piloto na LAB\n\n"
    "Mantenha cada avaliacao em 1-2 frases curtas e objetivas. "
    "Seja especifico sobre a LAB — nao fale de forma generica sobre 'laboratorios'."
)

# Aviso legal no prompt
AVISO_DADOS_PUBLICOS = (
    "IMPORTANTE: Todas as informacoes sobre a LAB Medicina Diagnostica "
    "fornecidas aqui sao dados PUBLICOS, extraidos do site institucional "
    "e materiais de divulgacao do laboratorio. Nao ha nenhuma informacao "
    "confidencial ou privilegiada neste contexto."
)
