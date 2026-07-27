# FlowLab — Startups por Departamento

Plataforma que extrai, classifica via IA e visualiza startups do ecossistema [Cubo Itau](https://cubo.itau/), organizadas por departamento do laboratorio LAB Medicina Diagnostica.

## Proposta

O projeto resolve o problema de descoberta de startups relevantes para um laboratorio de medicina diagnostica. O pipeline automatizado:

1. **Extrai** todas as startups do portal Cubo Itau via Selenium
2. **Classifica** cada startup nos 12 departamentos do laboratorio usando Google Gemini
3. **Exibe** os resultados em um dashboard interativo com filtros avancados, busca global e analises individuais por startup

O Gemini avalia cada startup em 9 criterios (aderencia a saude, maturidade, conformidade, prazo, riscos, etc.) e atribui nivel de confianca (alta/media) por departamento, alem de ranquear as mais relevantes para uma area de P&D (Destaques LAB).

---

## Stack

| Camada | Tecnologia |
|---|---|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript 5, Tailwind CSS 3 |
| **Backend** | Python 3.10+, Selenium 4, Google Gemini API |
| **Dados** | JSON estatico (~516 startups, ~455 KB classificacoes) |
| **Build** | SSG (Static Site Generation) para paginas de departamento |

---

## Rodando o Projeto (Quick Start)

```bash
# 1. Backend — instalar dependencias
cd backend
pip install -r requirements.txt

# 2. Configurar credenciais
cp .env.example .env
# Preencha CUBO_EMAIL, CUBO_PASSWORD, GEMINI_API_KEY no .env

# 3. Extrair startups (Selenium — ~10 min)
python scripts/run_scraper.py

# 4. Classificar (Gemini — ~3 min)
python scripts/run_classifier.py

# 5. Ranquear + analisar destaques (~3 min)
python scripts/rankear_deptos.py
python scripts/analisar_destaques.py

# 6. Frontend — instalar dependencias
cd ../frontend
npm install

# 7. Copiar JSONs + build
cd ..
.\update.ps1

# 8. Subir servidor
cd frontend
npm start
# Acesse http://localhost:3000
```

**Proximos meses**: repetir passos 3 → 5 → 7 → 8. O scraper so executa se passaram 30 dias da ultima extracao.

---

## Estrutura do Projeto

```
cubo_resolution/
│
├── update.ps1                            # Script de atualizacao automatizada
│
├── backend/                              # Pipeline de dados (Python)
│   ├── .env                              # Credenciais (nao versionado)
│   ├── .env.example                      # Template de variaveis
│   ├── pyproject.toml                    # Dependencias e build
│   ├── requirements.txt                  # Dependencias pip
│   │
│   ├── data/
│   │   ├── raw/                          # Saida do scraper
│   │   │   ├── startups_cubo.json        # Dados brutos das startups
│   │   │   ├── startups_cubo_parcial.json# Checkpoint incremental
│   │   │   └── paginas_rastreadas.json   # Tracking de paginas ja visitadas
│   │   └── processed/                    # Saida do classificador
│   │       └── departamentos_startups.json  # Classificacoes + analises Gemini
│   │
│   ├── scripts/
│   │   ├── run_scraper.py                # Extrai startups do Cubo (Selenium)
│   │   ├── run_classifier.py             # Classifica por departamento (Gemini)
│   │   ├── rankear_deptos.py             # Ranqueia startups dentro de cada depto
│   │   ├── revisar_deptos_faltantes.py   # Revisao de startups nao classificadas
│   │   └── analisar_destaques.py         # Analise aprofundada dos destaques LAB
│   │
│   ├── src/cubo/
│   │   ├── config.py                     # Carrega .env (dataclass imutavel)
│   │   ├── models.py                     # Dataclasses: Startup, ScrapingReport
│   │   ├── scraper.py                    # Selenium WebDriver + logica de extracao
│   │   └── gemini.py                     # Google Gemini client + prompts
│   │
│   └── tests/
│
├── frontend/                             # Dashboard (Next.js 15)
│   ├── package.json                      # Dependencias e scripts
│   ├── next.config.ts                    # Configuracao Next.js
│   ├── tsconfig.json                     # TypeScript strict + path alias (@/*)
│   ├── tailwind.config.ts                # Dark mode, animacoes customizadas
│   ├── postcss.config.mjs
│   │
│   ├── public/                           # Assets estaticos
│   │   ├── favicon.ico
│   │   ├── logo-hor.svg
│   │   └── logo-mark.png
│   │
│   └── src/
│       ├── app/                          # App Router
│       │   ├── layout.tsx                # Root layout (sidebar + drawer provider)
│       │   ├── page.tsx                  # Server: pre-computa novidades + deptos
│       │   ├── home-client.tsx           # Client: UI interativa da home
│       │   ├── loading.tsx               # Skeleton fallback
│       │   ├── not-found.tsx             # 404
│       │   ├── error.tsx                 # Error boundary
│       │   ├── departamentos/
│       │   │   ├── departamento-client.tsx # Client: filtros toggle alta/media/baixa
│       │   │   └── [slug]/
│       │   │       └── page.tsx          # SSG: detalhe do departamento
│       │   └── startups/
│       │       ├── page.tsx              # Server: pre-computa dados para busca
│       │       └── startups-client.tsx   # Client: filtros + paginacao
│       │
│       ├── components/
│       │   ├── sidebar.tsx               # Navegacao lateral + dark mode
│       │   ├── departamento-card.tsx     # Card de departamento (glassmorphism)
│       │   ├── departamento-selector.tsx # Dropdown para trocar de departamento
│       │   ├── startup-table.tsx         # Tabela de startups (alta/media confianca)
│       │   ├── startup-card.tsx          # Card de startup com drawer (React.memo)
│       │   ├── startup-drawer.tsx        # Painel lateral com detalhes + analise Gemini
│       │   ├── startup-drawer-context.tsx# Context API para controle do drawer
│       │   ├── confianca-badge.tsx       # Badge alta/media/baixa
│       │   ├── search-input.tsx          # Campo de busca com icone
│       │   ├── filter-bar.tsx            # Barra de filtros (4 dropdowns)
│       │   ├── multi-combobox.tsx        # Dropdown multi-select
│       │   └── combobox.tsx              # Dropdown single-select
│       │
│       ├── lib/
│       │   ├── types.ts                  # Interfaces TypeScript
│       │   ├── constants.ts              # 12 departamentos, slugs, descricoes
│       │   └── data.ts                   # Acesso aos JSONs + indices O(1)
│       │
│       └── data/                         # JSONs estaticos (gerados pelo backend)
│           ├── startups_cubo.json        # Dados brutos + data_adicionado
│           └── departamentos_startups.json# Classificacoes Gemini
│
└── README.md
```

---

## Os 12 Departamentos

| Departamento | Slug | Foco |
|---|---|---|
| Atendimento | `atendimento` | Recepcao, triagem, call center, SAC |
| Comercial | `comercial` | Convenios, CRM, prospeccao B2B |
| Qualidade | `qualidade` | ISO, acreditacao, auditorias, CQI |
| Transporte | `transporte` | Logistica de amostras, cadeia fria, tracking |
| Biologia Molecular | `biologia-molecular` | PCR, NGS, biomarcadores, oncologia molecular |
| Faturamento | `faturamento` | TISS/ANS, glosas, conciliacao |
| RH | `rh` | Recrutamento, folha, medicina ocupacional |
| Area Tecnica | `area-tecnica` | Automacao, equipamentos, LIS, hematologia |
| Estoque | `estoque` | Almoxarifado, controle de validade, inventario |
| Financeiro | `financeiro` | Tesouraria, fluxo de caixa, DRE |
| TI | `ti` | LIS/HIS, cloud, LGPD, HL7/FHIR, AI |
| Equipe Medica | `equipe-medica` | Patologia, imuno-histoquimica, telepatologia |

---

## Paginas do Frontend

| Rota | Render | Descricao |
|---|---|---|
| `/` | Server + Client | **Novas startups** em destaque + grid de 12 departamentos com busca a direita |
| `/departamentos/[slug]` | SSG + Client | Lista unica ranqueada com filtros toggle (Alta/Media/Baixa) + dropdown para trocar de departamento |
| `/startups` | Server + Client | Busca global com filtros (nome, segmento, tecnologia, departamento, confianca) + Destaques LAB + paginacao (50/pag) |

### Pagina Home (`/`)

```
┌────────────────────────────────────────────┐
│  Novas Startups                            │  ← hero
│  Classificadas por depto via IA            │
├────────────────────────────────────────────┤
│  ✦ Novidades  3 startup(s) este mes       │  ← destaque principal
│  ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Alma     │ │ Beelog   │ │ flipzen  │   │  ← so a data mais recente
│  └──────────┘ └──────────┘ └──────────┘   │
├────────────────────────────────────────────┤
│  Departamentos          [Filtrar...     ]  │  ← titulo + search a direita
│  12 departamentos do laboratorio           │
├────────────────────────────────────────────┤
│  Grid de departamentos (glassmorphism)     │
└────────────────────────────────────────────┘
```

A secao **Novidades** mostra apenas startups com a `data_adicionado` mais recente do JSON (tipicamente as do mes corrente). Se nao houver nenhuma, exibe um empty state.

---

## Fluxo de Dados

```
┌─────────────────┐     ┌───────────────────┐     ┌────────────────────┐
│  1. SCRAPER      │     │  2. CLASSIFICADOR  │     │  3. FRONTEND        │
│  Selenium        │────▶│  Gemini AI         │────▶│  Next.js 15         │
│                  │     │                    │     │                     │
│  Le total do     │     │  Classifica ~516   │     │  Novidades: data    │
│  header Cubo     │     │  startups em 12    │     │  mais recente       │
│                  │     │  departamentos     │     │                     │
│  Loop dinamico   │     │                    │     │  SSG (12 deptos)    │
│  ate total=516   │     │  Avalia 9 criterios│     │                     │
│                  │     │  Ranqueia destaques│     │  CSR (busca global  │
│  Verificacao     │     │                    │     │  com filtros)       │
│  nome a nome     │     │  Output:           │     │                     │
│                  │     │  departamentos_    │     │  Indices O(1)       │
│  Carimba data    │     │  startups.json     │     │  + useDeferredValue │
│  nas novas       │     │                    │     │  + React.memo       │
│                  │     │                    │     │                     │
│  Output:         │     │                    │     │                     │
│  startups_cubo.  │     │                    │     │                     │
│  json + data     │     │                    │     │                     │
└─────────────────┘     └───────────────────┘     └────────────────────┘
```

---

## Backend — Guia de Uso

### Pre-requisitos

- **Python 3.10+**
- **Google Chrome** instalado
- **Credenciais do Cubo Itau** (email e senha de `app.cubo.itau`)
- **Chave de API Google Gemini** ([Google AI Studio](https://aistudio.google.com/))

### 1. Instalar dependencias

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configurar `.env`

```bash
cp .env.example .env
```

Preencha as variaveis:

| Variavel | Descricao | Padrao |
|---|---|---|
| `CUBO_EMAIL` | Email de login no Cubo Itau | — |
| `CUBO_PASSWORD` | Senha do Cubo Itau | — |
| `GEMINI_API_KEY` | Chave da API Gemini | — |
| `GEMINI_MODEL` | Modelo Gemini | `gemini-3.5-flash-lite` |
| `STARTUP_BATCH_SIZE` | Startups por lote na API Gemini | `5` |
| `GEMINI_MAX_RETRIES` | Tentativas em caso de erro | `3` |
| `GEMINI_DELAY_BETWEEN_BATCHES_SECONDS` | Delay entre lotes | `2` |
| `HEADLESS` | Modo headless do Chrome | `false` |
| `SELENIUM_TIMEOUT` | Timeout do Selenium (s) | `15` |
| `REQUEST_DELAY` | Delay entre requisicoes (s) | `1.5` |

### 3. Executar o pipeline

**Passo 1 — Extrair startups:**

```bash
python scripts/run_scraper.py
```

### Como funciona o Scraper

O scraper usa Selenium WebDriver para navegar no portal Cubo Itau e extrair o perfil completo de cada startup. O algoritmo foi projetado para ser **resiliente a falhas** e **totalmente resumivel**.

#### Algoritmo de extracao

```
1. Acessa a pagina 1 de busca e le "startups(516)" do header → total_cubo = 516
2. Loop dinamico (while pagina <= 100):

     ├─ total_alcancado >= total_cubo? → BREAK (ja coletou tudo)
     ├─ Carrega a pagina de busca
     ├─ 0 cards na pagina? → BREAK (fim da paginacao)
     │
     └─ Para cada card na pagina:
          ├─ nome ja esta em nomes_salvos (Set O(1))?
          │    └─ SIM → PULA o card (sem clique, sem custo)
          │
          ├─ Card NAO tem rotulo "Segmento" visivel?
          │    ├─ Tenta clicar no perfil mesmo assim
          │    ├─ Se perfil carregar → extrai dados completos
          │    └─ Se falhar → salva dados basicos do card (apenas nome)
          │
          └─ Card TEM "Segmento"?
               └─ CLICA no card → navega ate o perfil → extrai HTML completo
                  (fundadores, site, tecnologias, modelos de negocio, descricao)
                  → volta para a pagina de busca

3. Ao final:
   ├─ Counter verifica duplicatas → remove se houver
   ├─ Compara len(json) com total_cubo
   │    ├─ Igual: "Total confere: 516 startups = Cubo (516)"
   │    └─ Diferente: "DISCREPANCIA: JSON tem X, Cubo reporta 516 (diferenca: +/-Y)"
   └─ Salva startups_cubo.json
```

**Ponto-chave**: O scraper le o numero total de startups do header do proprio Cubo (`startups(516)`) e **para automaticamente** quando atinge esse total. Nao existe mais limite fixo de 52 paginas — o loop e dinamico e valida o resultado contra a fonte oficial.

#### Restricao de periodicidade (30 dias)

O scraper so pode ser executado a cada **30 dias**. Antes de iniciar, verifica a `data_adicionado` mais recente no JSON de startups:

- **< 30 dias** da ultima extracao → execucao bloqueada com log
- **>= 30 dias** → execucao liberada
- **Primeira execucao** (arquivo inexistente) → liberada
- **Erro de leitura** → liberada com warning (seguro)

Isso evita rodar o Selenium desnecessariamente e respeita a premissa de que o pipeline roda 1x por mes.

#### Carimbo data_adicionado

Cada startup recebe um campo `data_adicionado` com a data em que foi extraida pela primeira vez:

- **Startups ja existentes** no JSON mantem sua `data_adicionado` original (preservada do resume)
- **Startups novas** (nao encontradas em `nomes_salvos`) recebem `date.today()`

Isso permite que o frontend identifique quais startups foram adicionadas no mes corrente (secao **Novidades**).

#### Checkpoints (resume incremental)

O scraper mantem 2 arquivos de checkpoint em `data/raw/`:

| Arquivo | Conteudo | Funcao |
|---|---|---|
| `startups_cubo_parcial.json` | Lista completa de todas as startups ja extraidas | Salvo a cada 10 novas startups. No resume, vira o `nomes_salvos` |
| `paginas_rastreadas.json` | `{numero_pagina: [lista_de_nomes]}` | Tracking de debugging, nao afeta o fluxo de skip |

**Fluxo de resume:**

```
1. Carrega startups_cubo_parcial.json → monta Set nomes_salvos (O(1))
2. Le total_cubo do header da pagina 1
3. Loop dinamico ate total_alcancado >= total_cubo:
     ├─ Carrega a pagina de busca
     ├─ Para cada card: nome in nomes_salvos? → se SIM, pula
     └─ Se nome e novo → clica no perfil, extrai, carimba data
4. A cada 10 novas startups, salva _parcial.json
5. Ao final: verifica duplicatas + compara com total_cubo + salva final
```

**Cenarios de interrupcao:**

- **Caiu no meio**: Na proxima execucao, `nomes_salvos` ja contem todas as startups salvas ate o momento. O loop recomeca na pagina 1, pula nomes conhecidos, so processa o novo.
- **Timeout no perfil**: Dados basicos do card sao salvos como fallback e o scraper segue adiante.
- **Sessao perdida**: Dados parciais ja estao salvos em disco. Proxima execucao retoma normalmente.

**Passo 2 — Classificar com Gemini:**

```bash
python scripts/run_classifier.py
```

Envia as startups em lotes para o Gemini, que retorna a classificacao por departamento com analise detalhada e 9 criterios de avaliacao. Salva em `data/processed/departamentos_startups.json`. Suporta resume incremental — so processa startups pendentes.

**Scripts auxiliares:**

```bash
python scripts/rankear_deptos.py          # Reordena startups dentro de cada depto
python scripts/revisar_deptos_faltantes.py # Identifica startups nao classificadas
python scripts/analisar_destaques.py       # Analise aprofundada dos destaques LAB
```

### 4. Atualizar o frontend

**Opcao A — Script automatizado (recomendado):**

```powershell
.\update.ps1               # apenas copiar JSONs + build
.\update.ps1 -Scraper      # scraper + copiar + build
.\update.ps1 -Classificar  # classificador + copiar + build
.\update.ps1 -Tudo         # scraper + classificador + copiar + build
```

**Opcao B — Manual:**

```bash
copy backend\data\raw\startups_cubo.json frontend\src\data\startups_cubo.json
copy backend\data\processed\departamentos_startups.json frontend\src\data\departamentos_startups.json
cd frontend
npm run build
```

---

## Frontend — Guia de Uso

### Pre-requisitos

- **Node.js 18+**

### 1. Instalar dependencias

```bash
cd frontend
npm install
```

### 2. Desenvolvimento

```bash
npm run dev
```

Acesse `http://localhost:3000`.

### 3. Build de producao

```bash
npm run build
npm start
```

### Arquitetura

O frontend usa o padrao **Server Components** do Next.js App Router. Os dados (JSONs) sao lidos exclusivamente no servidor — nunca vao para o bundle JS do cliente. Componentes `"use client"` recebem dados via props serializadas.

- **`page.tsx` (Home)** — Server Component que chama `getTodasStartups()` e `getDepartamentos()`. Passa dados como props para `home-client.tsx`
- **`home-client.tsx`** — Client Component com estado de busca e renderizacao da UI
- **`departamentos/[slug]/page.tsx`** — SSG que renderiza `departamento-client.tsx` com startups pre-ranqueadas
- **`departamento-client.tsx`** — Client Component com filtros toggle (Alta/Media/Baixa) + lista unica em ordem de rank
- **`startups/page.tsx`** — Server Component que pre-computa todos os dados para busca global
- **`startups-client.tsx`** — Client Component com 5 filtros, debounce, useDeferredValue e paginacao (50/pag)

### Logica de Novidades

A secao de novidades na home **nao** usa um periodo fixo de 30 dias. Em vez disso, encontra a `data_adicionado` mais recente entre todas as startups e mostra apenas as que tem exatamente essa data:

```typescript
const dataMaisRecente = max(todas.map(s => s.data_adicionado));
const novidades = todas.filter(s => s.data_adicionado === dataMaisRecente);
```

Isso garante que apenas as startups do **mes corrente** aparecam como destaque. No mes seguinte, quando o scraper rodar novamente, as startups novas terao a data do dia e as antigas automaticamente saem da secao de novidades.

### Otimizacoes de performance

- **Server Components** — JSONs (~790 KB) nunca vao para o bundle JS do cliente. Dados sao lidos no servidor e serializados como HTML
- **Prefetch automatico** — `router.prefetch()` em todos os links de navegacao (sidebar, cards, selector de departamento). RSC payloads ja estao em cache antes do clique
- **Indices pre-computados** — `Map<nome, deptos[]>` e `Map<nome, Map<slug, confianca>>` para lookups O(1)
- **Campos pre-carregados** — `startup.departamentos` e `startup.confiancaPorDepartamento` populados na carga inicial
- **`useMemo`** — Filtros usam memoizacao em vez de `useState` + `useEffect`
- **Debounce 300ms** — Campo de busca nao dispara filtro a cada tecla
- **`useDeferredValue`** — UI permanece responsiva durante filtragem pesada
- **`React.memo`** — Cards de startup nao re-renderizam quando filtros mudam
- **`next/image`** — Imagens do sidebar usam componente otimizado com `priority` para LCP
- **SSG** — 12 paginas de departamento pre-renderizadas estaticamente
- **Loop dinamico no scraper** — Para ao atingir `total_cubo` em vez de iterar 52 paginas fixas

---

## Classificacao (Alta / Media / Baixa)

| Nivel | Significado | Origem |
|---|---|---|
| **Alta** | Startup claramente focada no departamento. Solucao com forte aderencia. | Gemini |
| **Media** | Aplicacao relevante mas nao e o foco principal da startup. | Gemini |
| **Baixa** | Startup sem dados suficientes (sem descricao, segmento, site, fundadores, nem tecnologias). Nao passa pelo Gemini. | Automatico |

**Rank** vs **Confianca**:

- **Rank** (1..N) = relevancia da startup para a LAB como um todo. 1 = mais relevante. Atribuido pelo Gemini via `rankear_deptos.py`. Cada departamento tem seus proprios ranks sequenciais, sem duplicatas.
- **Confianca** (alta/media/baixa) = precisao do encaixe da startup no departamento especifico.

No drawer de detalhes, dois cards lado a lado explicam cada conceito. Nos cards, tooltips (hover) mostram a definicao.

---

## Modelo de Dados

### StartupRaw (JSON bruto do scraper)

```typescript
{
  id: number;
  nome: string;
  descricao: string;
  segmento: string;
  fundadores: string;
  site: string;
  url_perfil: string;
  modelos_negocio: string[];
  tecnologias: string[];
  data_adicionado?: string;     // ISO YYYY-MM-DD, carimbado pelo scraper
}
```

### StartupClassificada (JSON processado pelo Gemini)

```typescript
{
  nome: string;
  confianca: "alta" | "media";
  aderencia_lab?: "alta" | "media" | "baixa";
  analise?: string;
  avaliacao?: {
    problema_atendido?: string;
    aderencia_saude?: string;
    maturidade?: string;
    integracao?: string;
    conformidade?: string;
    impacto?: string;
    prazo?: string;
    riscos?: string;
    piloto?: string;
  };
  rank?: number;
}
```

### StartupEnriquecida (merge usado no frontend)

Junta `StartupRaw` + `StartupClassificada` + campos pre-computados:

```typescript
{
  // ...todos os campos acima...
  departamentos: string[];                              // pre-computado O(1)
  confiancaPorDepartamento: Record<string, "alta"|"media">; // pre-computado O(1)
  data_adicionado?: string;                             // propagado do raw
}
```

---

## Funcionalidades

- **Novidades na Home** — Secao de destaque com startups adicionadas no mes corrente (filtra pela `data_adicionado` mais recente)
- **Dashboard de departamentos** — Visao geral dos 12 departamentos com contagem de startups e distribuicao alta/media confianca
- **Busca global** — Filtro por nome, segmento, tecnologias, departamentos e nivel de confianca
- **Destaques LAB** — Toggle para exibir apenas startups ranqueadas pelo Gemini como mais relevantes para P&D
- **Drawer de detalhes** — Painel lateral com descricao, metadados, departamentos e analise completa do Gemini com 9 criterios
- **Dark mode** — Toggle claro/escuro persistido em `localStorage`
- **Sidebar colapsavel** — Navegacao lateral com suporte a mobile (hamburguer + overlay)
- **Resiliencia total** — Scraper e classificador suportam resume incremental
- **Validacao automatica** — Scraper le o total do Cubo, compara com o JSON final e detecta duplicatas
- **Pipeline automatizado** — `update.ps1` com 4 modos de execucao para atualizar o frontend
- **Indices O(1)** — Lookups de departamento e confianca pre-computados para filtros instantaneos
- **Debounce + useDeferredValue** — Busca e filtros nao travam a UI

---

## Limitacoes Conhecidas

- **Ranks entre lotes** — Departamentos com mais de 30 startups sao divididos em lotes para o Gemini. O rankeamento e otimo dentro de cada lote, mas startups do lote 1 sempre aparecem antes das do lote 2 (mesmo que uma do lote 2 fosse mais relevante que as ultimas do lote 1).
- **Startups "apenas nome"** — Cards capturados como `(apenas nome)` tem dados incompletos e ficam como Baixa. O scraper tenta clicar no perfil, mas se falhar, salva o basico.
- **Duplicatas por nome** — O scraper detecta duplicatas exatas por nome. Variacoes (ex: "Flipzen" vs "flipzen.com") podem passar e precisam de limpeza manual.

---

## Possiveis Melhorias

### Backend
- **Deteccao de duplicatas semanticas** — Usar fuzzy matching (Levenshtein) para detectar "Flipzen" vs "flipzen.com" como a mesma startup
- **Rankeamento global** — Rankear todas as startups de uma vez (em vez de lotes por departamento) para eliminar o problema de ordenacao entre lotes
- **Pipeline agendado** — Agendar o scraper + classificador via cron job ou GitHub Actions para rodar automaticamente todo mes
- **Exportar JSONs direto** — O script `update.ps1` poderia rodar como parte do `npm run build` para nao precisar de passo manual
- **Migrar para API** — Substituir JSONs estaticos por uma API REST (FastAPI/Flask) servindo os dados do backend, eliminando a necessidade de rebuild do frontend
- **Headless por padrao** — Rodar o Chrome em modo headless em producao/CI para nao abrir janela

### Frontend
- **Virtual scrolling** — Para departamentos com 60+ startups, renderizar apenas os cards visiveis na tela
- **PWA / Offline** — Tornar o dashboard um Progressive Web App com service worker para acesso offline
- **Graficos** — Adicionar Chart.js para visualizacao de distribuicao por segmento, tecnologias, etc.
- **Exportar dados** — Botao para exportar a lista filtrada como CSV/Excel
- **Favoritos** — Permitir marcar startups como favoritas e persistir no localStorage
- **Comparacao lado a lado** — Selecionar 2+ startups e comparar analises do Gemini
- **Busca por similaridade** — Buscar startups similares a uma selecionada (por tecnologias, segmento, etc.)

### DevOps
- **Docker** — Containerizar backend e frontend para deploy consistente
- **CI/CD** — Pipeline no GitHub Actions para rodar scraper → classificador → build → deploy
- **Monitoramento** — Log de erros do scraper/classificador com alertas (Slack/Email)
- **Testes E2E** — Playwright/Cypress para testar fluxos criticos do frontend
