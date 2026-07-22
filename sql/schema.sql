-- =============================================================================
-- Cubo Itaú — Schema do banco de dados (PostgreSQL / Supabase)
-- =============================================================================
-- Execute este script no SQL Editor do Supabase antes da primeira execução:
--    Supabase Dashboard → SQL Editor → New Query → colar e Run.

begin;

-- ---------------------------------------------------------------------------
-- Tabelas principais
-- ---------------------------------------------------------------------------

create table if not exists startups (
    id          bigint generated always as identity primary key,
    nome        text   not null,
    descricao   text,
    segmento    text,
    fundadores  text,
    site        text,
    url_perfil  text   not null unique
);

create table if not exists modelos_negocio (
    id   bigint generated always as identity primary key,
    nome text not null unique
);

create table if not exists tecnologias (
    id   bigint generated always as identity primary key,
    nome text not null unique
);

-- ---------------------------------------------------------------------------
-- Tabelas associativas (N:N)
-- ---------------------------------------------------------------------------

create table if not exists startup_modelos_negocio (
    startup_id       bigint not null references startups(id) on delete cascade,
    modelo_negocio_id bigint not null references modelos_negocio(id) on delete cascade,
    primary key (startup_id, modelo_negocio_id)
);

create table if not exists startup_tecnologias (
    startup_id    bigint not null references startups(id) on delete cascade,
    tecnologia_id bigint not null references tecnologias(id) on delete cascade,
    primary key (startup_id, tecnologia_id)
);

-- ---------------------------------------------------------------------------
-- Índices para consultas comuns
-- ---------------------------------------------------------------------------

create index if not exists idx_startups_segmento
    on startups(segmento);

create index if not exists idx_startup_modelos_startup
    on startup_modelos_negocio(startup_id);

create index if not exists idx_startup_modelos_modelo
    on startup_modelos_negocio(modelo_negocio_id);

create index if not exists idx_startup_tecnologias_startup
    on startup_tecnologias(startup_id);

create index if not exists idx_startup_tecnologias_tecnologia
    on startup_tecnologias(tecnologia_id);

commit;
