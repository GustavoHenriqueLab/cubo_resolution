"use client";

import { useMemo, useState, useEffect } from "react";
import {
  getTodasStartups,
  getDepartamentosDaStartup,
  getConfiancaNoDepartamento,
  getSegmentos,
  getTecnologias,
  getDepartamentos,
  getDestaqueLab,
} from "@/lib/data";
import { nomeParaSlug } from "@/lib/constants";
import { StartupCard } from "@/components/startup-card";
import { SearchInput } from "@/components/search-input";
import { FilterBar } from "@/components/filter-bar";
import { SearchX, Star, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import type { StartupEnriquecida } from "@/lib/types";

export default function StartupsPage() {
  const todas = useMemo(() => getTodasStartups(), []);
  const segmentosDisponiveis = useMemo(() => getSegmentos(), []);
  const tecnologiasDisponiveis = useMemo(() => getTecnologias(), []);
  const departamentos = useMemo(() => getDepartamentos(), []);

  const estaquesSet = useMemo(() => new Set(getDestaqueLab()), []);
  const ITENS_POR_PAGINA = 50;

  const [busca, setBusca] = useState("");
  const [segmentosFiltro, setSegmentosFiltro] = useState<string[]>([]);
  const [tecnologiasFiltro, setTecnologiasFiltro] = useState<string[]>([]);
  const [departamentosFiltro, setDepartamentosFiltro] = useState<string[]>([]);
  const [confiancaFiltro, setConfiancaFiltro] = useState<"" | "alta" | "media">("");
  const [apenasDestaques, setApenasDestaques] = useState(false);
  const [pagina, setPagina] = useState(1);

  const [filtradas, setFiltradas] = useState<StartupEnriquecida[]>([]);

  useEffect(() => {
    const resultado = todas
      .filter((s: StartupEnriquecida) => {
        const deptosStartup = getDepartamentosDaStartup(s.nome);

        if (apenasDestaques && !estaquesSet.has(s.nome)) return false;
        if (busca && !s.nome.toLowerCase().includes(busca.toLowerCase())) return false;

        // Segmento: OR (startup so tem 1)
        if (segmentosFiltro.length > 0 && !segmentosFiltro.includes(s.segmento)) return false;

        // Tecnologias: AND (deve ter TODAS as selecionadas)
        if (tecnologiasFiltro.length > 0 && !tecnologiasFiltro.every((t) => s.tecnologias.includes(t))) return false;

        // Departamentos: AND (deve estar em TODOS os selecionados)
        if (departamentosFiltro.length > 0) {
          if (!departamentosFiltro.every((slug) => deptosStartup.some((d) => nomeParaSlug(d) === slug))) return false;
        }

        // Confianca
        if (confiancaFiltro) {
          if (departamentosFiltro.length > 0) {
            const matchConf = deptosStartup.some((d) => {
              const conf = getConfiancaNoDepartamento(s.nome, nomeParaSlug(d));
              return conf === confiancaFiltro;
            });
            if (!matchConf) return false;
          } else {
            const temConfianca = deptosStartup.some((d) => {
              const conf = getConfiancaNoDepartamento(s.nome, nomeParaSlug(d));
              return conf === confiancaFiltro;
            });
            if (!temConfianca) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (apenasDestaques && a.rank != null && b.rank != null) return a.rank - b.rank;
        if (apenasDestaques && a.rank != null) return -1;
        if (apenasDestaques && b.rank != null) return 1;
        return 0;
      });

    setFiltradas(resultado);
  }, [
    todas,
    busca,
    segmentosFiltro,
    tecnologiasFiltro,
    departamentosFiltro,
    confiancaFiltro,
    apenasDestaques,
    estaquesSet,
  ]);

  const totalPaginas = Math.ceil(filtradas.length / ITENS_POR_PAGINA);
  const paginaAtual = Math.min(pagina, Math.max(totalPaginas, 1));

  // Reseta pagina ao mudar filtros
  const filtros = `${busca}|${segmentosFiltro.join(",")}|${tecnologiasFiltro.join(",")}|${departamentosFiltro.join(",")}|${confiancaFiltro}|${apenasDestaques}`;
  useMemo(() => setPagina(1), [filtros]);

  const exibidas = useMemo(
    () => filtradas.slice((paginaAtual - 1) * ITENS_POR_PAGINA, paginaAtual * ITENS_POR_PAGINA),
    [filtradas, paginaAtual]
  );

  return (
    <div className="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      {/* Hero */}
      <div className="mb-10">
        <h1 className="font-display text-3xl font-bold">
          <span className="text-gradient-brand">Buscar Startups</span>
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Pesquise por nome, segmente ou filtre por tecnologia e departamento.
        </p>
      </div>

      {/* Search + Toggle */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full max-w-md">
          <SearchInput
            placeholder="Buscar por nome da startup..."
            value={busca}
            onChange={setBusca}
          />
        </div>
        <button
          onClick={() => setApenasDestaques(!apenasDestaques)}
          className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
            apenasDestaques
              ? "border-blue-300 bg-blue-50 text-blue-700 shadow-blue-glow dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400"
              : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600"
          }`}
        >
          <Star size={16} className={apenasDestaques ? "text-blue-500" : "text-gray-400"} />
          Destaques LAB
          {apenasDestaques && (
            <span className="rounded-full bg-blue-200 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-500/30 dark:text-blue-300">
              {estaquesSet.size}
            </span>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <FilterBar
          segmentos={segmentosDisponiveis}
          tecnologias={tecnologiasDisponiveis}
          departamentos={departamentos}
          segmentosAtivos={segmentosFiltro}
          tecnologiasAtivas={tecnologiasFiltro}
          departamentosAtivos={departamentosFiltro}
          confiancaAtiva={confiancaFiltro}
          onSegmentosChange={setSegmentosFiltro}
          onTecnologiasChange={setTecnologiasFiltro}
          onDepartamentosChange={setDepartamentosFiltro}
          onConfiancaChange={setConfiancaFiltro}
        />
      </div>

      {/* Destaques banner */}
      {apenasDestaques && filtradas.length > 0 && (
        <div className="mb-6 flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/50 px-4 py-2.5 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/5 dark:text-blue-400">
          <Sparkles size={16} className="shrink-0" />
          <span>
            {filtradas.length} startups selecionadas pelo Gemini como as mais relevantes para a LAB Medicina Diagnostica.
          </span>
        </div>
      )}

      {/* Count */}
      <p className="mb-6 text-sm font-medium text-slate-400 dark:text-gray-500">
        {filtradas.length} startup(s) encontrada(s)
      </p>

      {/* Results */}
      {exibidas.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {exibidas.map((s, i) => (
            <StartupCard key={s.nome} startup={s} index={i} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white/50 py-16 text-center backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50">
          <SearchX size={48} className="mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Nenhum resultado encontrado. Tente outros filtros.
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPaginas > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={paginaAtual === 1}
            className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <ChevronLeft size={16} />
            Anterior
          </button>

          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {paginaAtual} de {totalPaginas}
          </span>

          <button
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={paginaAtual === totalPaginas}
            className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            Proximo
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
