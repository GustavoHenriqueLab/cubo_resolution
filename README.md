# Cubo Itaú — Startup Data Extractor

Extrai dados das startups do ecossistema [Cubo Itaú](https://cubo.itau/)
e os persiste em um banco PostgreSQL via [Supabase](https://supabase.com).

## Arquitetura

```
cubo_resolution/
├── main.py                 # Ponto de entrada — orquestra o pipeline
├── config.py               # Carrega variáveis do .env
├── .env                    # Credenciais (não versionar)
├── .env.example            # Template documentado
├── requirements.txt        # Dependências Python
├── cubo/
│   ├── __init__.py
│   ├── models.py           # Dataclasses: Startup, ScrapingReport
│   ├── db.py               # Camada Supabase — CRUD e upsert
│   └── scraper.py          # Selenium — login, coleta de links, extração
└── sql/
    └── schema.sql          # DDL do banco (executar no SQL Editor)
```

## Pré-requisitos

- **Python 3.10+**
- **Google Chrome** instalado
- **Projeto no [Supabase](https://supabase.com)** com as tabelas criadas
- **Credenciais do Cubo Itaú** (e-mail e senha de `app.cubo.itau`)

## Setup

### 1. Clone e instale as dependências

```bash
pip install -r requirements.txt
```

### 2. Configure o arquivo `.env`

Copie o template e preencha com seus dados:

```
SUPABASE_URL=https://<seu-projeto>.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
CUBO_EMAIL=seu@email.com
CUBO_PASSWORD=sua-senha
```

| Variável | Descrição | Onde encontrar |
|---|---|---|
| `SUPABASE_URL` | URL do projeto Supabase | Dashboard → Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Chave anônima (pública) | Dashboard → Settings → API → anon/public |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave admin (ignora RLS) | Dashboard → Settings → API → service_role |
| `CUBO_EMAIL` | E-mail de login no Cubo | — |
| `CUBO_PASSWORD` | Senha do Cubo | — |
| `HEADLESS` | `true` para rodar sem interface | Opcional (padrão: `false`) |

### 3. Crie as tabelas no Supabase

Abra o **SQL Editor** no Supabase Dashboard e execute o conteúdo de
[`sql/schema.sql`](sql/schema.sql).

### 4. Execute

```bash
python main.py
```

## Fluxo de execução

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ 1. Config   │────▶│ 2. Login (opc.)  │────▶│ 3. Vitrine      │
│ .env → cfg  │     │ app.cubo.itau    │     │ /startups-      │
│             │     │ email + senha    │     │ portfolio       │
└─────────────┘     └──────────────────┘     └────────┬────────┘
                                                      │
                                              Scroll + Load More
                                                      │
                                                      ▼
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ 6. Relatório│◀────│ 5. Supabase      │◀────│ 4. Perfis       │
│ stdout      │     │ upsert + N:N     │     │ 1 por 1 com     │
│             │     │                  │     │ delay de 1.5s   │
└─────────────┘     └──────────────────┘     └─────────────────┘
```

## Modelo de dados

```
startups ──┬── startup_tecnologias ──┬── tecnologias
           │                         │
           └── startup_modelos_neg ──┴── modelos_negocio
```

### Consultas de exemplo

**Startups por tecnologia:**

```sql
SELECT t.nome AS tecnologia, s.nome AS startup
FROM startups s
JOIN startup_tecnologias st ON st.startup_id = s.id
JOIN tecnologias t ON t.id = st.tecnologia_id
WHERE t.nome = 'Inteligência Artificial'
ORDER BY s.nome;
```

**Startups por modelo de negócio:**

```sql
SELECT mn.nome AS modelo, s.nome AS startup
FROM startups s
JOIN startup_modelos_negocio sm ON sm.startup_id = s.id
JOIN modelos_negocio mn ON mn.id = sm.modelo_negocio_id
ORDER BY mn.nome, s.nome;
```

**Segmentos mais frequentes:**

```sql
SELECT segmento, COUNT(*) AS total
FROM startups
WHERE segmento IS NOT NULL
GROUP BY segmento
ORDER BY total DESC;
```

## Seletores

Os seletores CSS/XPath estão definidos como constantes em
[`cubo/scraper.py`](cubo/scraper.py). Se a estrutura do site mudar,
ajuste-os ali.

Os seletores da página de perfil usam XPath com busca por rótulo
(`_texto_apos_rotulo`, `_tags_apos_rotulo`), que é tolerante a
mudanças de classes CSS, mas pode precisar de tradução conforme o
idioma da página.

## Troubleshooting

| Problema | Causa provável | Solução |
|---|---|---|
| `Nenhum link de startup encontrado` | Seletores desatualizados | Inspecione o HTML e atualize os seletores em `scraper.py` |
| `Timeout ao carregar` | Conexão lenta ou bloqueio | Aumente `SELENIUM_TIMEOUT` no `.env` |
| Campos vazios na extração | Rótulos em inglês (`Founders` vs `Fundadores`) | O código já testa ambas as versões |
| `Login pode ter falhado` | Credenciais incorretas ou CAPTCHA | Verifique e-mail/senha; pode ser necessário login manual |
