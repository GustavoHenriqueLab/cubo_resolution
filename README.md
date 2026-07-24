# Cubo Itau — Startup Data Extractor

Extrai dados das startups do ecossistema [Cubo Itau](https://cubo.itau/) e os exibe em um frontend Next.js com classificacao por departamento via IA.

## Arquitetura

```
cubo_resolution/
├── README.md
├── .gitignore
│
├── backend/                          # Extracao e classificacao (Python)
│   ├── .env
│   ├── .env.example
│   ├── pyproject.toml
│   ├── requirements.txt
│   ├── data/
│   │   ├── raw/                      (startups_cubo.json, _parcial.json, paginas_rastreadas.json)
│   │   └── processed/               (departamentos_startups.json)
│   ├── scripts/
│   │   ├── run_scraper.py            # Selenium — extrai startups do Cubo
│   │   └── run_classifier.py         # Gemini — classifica por departamento
│   ├── src/cubo/
│   │   ├── __init__.py
│   │   ├── config.py                 # Carrega .env
│   │   ├── models.py                 # Dataclasses
│   │   ├── scraper.py                # Selenium WebDriver
│   │   └── gemini.py                 # Google Gemini client
│   └── tests/
│       └── __init__.py
│
└── frontend/                         # Visualizacao (Next.js 15 + TypeScript)
    ├── .env.example
    ├── package.json
    ├── next.config.ts
    ├── tsconfig.json
    ├── public/
    └── src/
        ├── app/
        │   ├── layout.tsx            # Root layout
        │   ├── page.tsx              # Home: grid de departamentos
        │   ├── loading.tsx
        │   ├── not-found.tsx
        │   ├── error.tsx
        │   ├── departamentos/
        │   │   └── [slug]/
        │   │       └── page.tsx      # Detalhe do departamento + startups
        │   └── startups/
        │       └── page.tsx          # Busca global com filtros
        ├── components/
        │   ├── departamento-card.tsx
        │   ├── startup-table.tsx
        │   ├── startup-card.tsx
        │   ├── confianca-badge.tsx
        │   ├── search-input.tsx
        │   └── filter-bar.tsx
        ├── lib/
        │   ├── types.ts              # Tipos TypeScript
        │   ├── constants.ts          # Departamentos, slugs, descricoes
        │   └── data.ts               # Carregamento e queries do JSON
        └── data/
            ├── startups_cubo.json
            └── departamentos_startups.json
```

## Backend — Setup

### Pre-requisitos

- **Python 3.10+**
- **Google Chrome** instalado
- **Credenciais do Cubo Itau** (e-mail e senha de `app.cubo.itau`)

### 1. Instalar dependencias

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configurar `.env`

Copie o template e preencha:

```
CUBO_EMAIL=seu@email.com
CUBO_PASSWORD=sua-senha
GEMINI_API_KEY=sua-chave-gemini
```

| Variavel | Descricao | Onde encontrar |
|---|---|---|
| `CUBO_EMAIL` | E-mail de login no Cubo | — |
| `CUBO_PASSWORD` | Senha do Cubo | — |
| `GEMINI_API_KEY` | Chave da API Google Gemini | Google AI Studio |
| `HEADLESS` | `true` para rodar sem interface | Opcional (padrao: `false`) |

### 3. Executar

**Scraper** (extrai startups do Cubo Itau):

```bash
python scripts/run_scraper.py
```

**Classificador** (associa startups aos departamentos via Gemini):

```bash
python scripts/run_classifier.py
```

### 4. Atualizar dados do frontend

Apos rodar o scraper e o classificador, copie os JSONs gerados para o frontend:

```bash
copy backend\data\raw\startups_cubo.json frontend\src\data\startups_cubo.json
copy backend\data\processed\departamentos_startups.json frontend\src\data\departamentos_startups.json
```

## Frontend — Setup

### Pre-requisitos

- **Node.js 18+**

### 1. Instalar dependencias

```bash
cd frontend
npm install
```

### 2. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse `http://localhost:3000`.

### 3. Build de producao

```bash
npm run build
npm start
```

## Paginas do Frontend

| Rota | Descricao |
|---|---|
| `/` | Grid de 12 departamentos com contagem de startups |
| `/departamentos/[slug]` | Startups do departamento, separadas por confianca (alta/media) |
| `/startups` | Busca global com filtros por nome, segmento, tecnologia e departamento |

## Fluxo de dados

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ 1. Scraper   │────▶│ 2. Classificador │────▶│ 3. Frontend     │
│ Selenium     │     │ Gemini AI        │     │ Next.js         │
│ startups_    │     │ departamentos_   │     │ Server          │
│ cubo.json    │     │ startups.json    │     │ Components      │
└──────────────┘     └──────────────────┘     └─────────────────┘
```
