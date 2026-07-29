"use client";

import { useMemo, useState, useEffect, useDeferredValue } from "react";
import { StartupCard } from "@/components/startup-card";
import { SearchInput } from "@/components/search-input";
import { FilterBar } from "@/components/filter-bar";
import { SearchX, Sparkles, ChevronLeft, ChevronRight, Zap } from "lucide-react";
import type { StartupEnriquecida, DepartamentoInfo } from "@/lib/types";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

interface Props {
  todas: StartupEnriquecida[];
  segmentosDisponiveis: string[];
  tecnologiasDisponiveis: string[];
  departamentos: DepartamentoInfo[];
  destaques: string[];
}

export function StartupsClient({ todas, segmentosDisponiveis, tecnologiasDisponiveis, departamentos, destaques }: Props) {
  const estaquesSet = useMemo(() => new Set(destaques), [destaques]);
  const ITENS_POR_PAGINA = 50;

  const [busca, setBusca] = useState("");
  const [segmentosFiltro, setSegmentosFiltro] = useState<string[]>([]);
  const [tecnologiasFiltro, setTecnologiasFiltro] = useState<string[]>([]);
  const [departamentosFiltro, setDepartamentosFiltro] = useState<string[]>([]);
  const [confiancaFiltro, setConfiancaFiltro] = useState<"" | "alta" | "media" | "baixa">("");
  const [apenasDestaques, setApenasDestaques] = useState(false);
  const [pagina, setPagina] = useState(1);

  const buscaDebounced = useDebounce(busca, 300);
  const buscaDeferred = useDeferredValue(buscaDebounced);
  const segmentosDeferred = useDeferredValue(segmentosFiltro);
  const tecnologiasDeferred = useDeferredValue(tecnologiasFiltro);
  const departamentosDeferred = useDeferredValue(departamentosFiltro);
  const confiancaDeferred = useDeferredValue(confiancaFiltro);
  const destaquesDeferred = useDeferredValue(apenasDestaques);

  const filtradas = useMemo(() => {
    const resultado = todas.filter((s: StartupEnriquecida) => {
      if (destaquesDeferred && !estaquesSet.has(s.nome)) return false;
      if (buscaDeferred && !s.nome.toLowerCase().includes(buscaDeferred.toLowerCase())) return false;

      if (segmentosDeferred.length > 0 && !segmentosDeferred.includes(s.segmento)) return false;

      if (tecnologiasDeferred.length > 0 && !tecnologiasDeferred.some((t) => s.tecnologias.includes(t))) return false;

      if (departamentosDeferred.length > 0) {
        if (!departamentosDeferred.some((slug) => s.confiancaPorDepartamento[slug] !== undefined)) return false;
      }

      if (confiancaDeferred) {
        if (departamentosDeferred.length > 0) {
          if (!departamentosDeferred.some((slug) => s.confiancaPorDepartamento[slug] === confiancaDeferred)) return false;
        } else {
          if (
            !Object.values(s.confiancaPorDepartamento).some((c) => c === confiancaDeferred) &&
            s.confianca !== confiancaDeferred
          ) return false;
        }
      }

      return true;
    });

    if (destaquesDeferred) {
      return resultado.sort((a, b) => {
        if (a.rank != null && b.rank != null) return a.rank - b.rank;
        if (a.rank != null) return -1;
        if (b.rank != null) return 1;
        return 0;
      });
    }

    return resultado;
  }, [todas, buscaDeferred, segmentosDeferred, tecnologiasDeferred, departamentosDeferred, confiancaDeferred, destaquesDeferred, estaquesSet]);

  const totalPaginas = Math.max(Math.ceil(filtradas.length / ITENS_POR_PAGINA), 1);
  const paginaAtual = Math.min(pagina, totalPaginas);

  const exibidas = useMemo(
    () => filtradas.slice((paginaAtual - 1) * ITENS_POR_PAGINA, paginaAtual * ITENS_POR_PAGINA),
    [filtradas, paginaAtual]
  );

  useEffect(() => {
    setPagina(1);
  }, [buscaDebounced, segmentosFiltro, tecnologiasFiltro, departamentosFiltro, confiancaFiltro, apenasDestaques]);

  return (
    <div className="mx-auto w-full max-w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:max-w-[80rem]">
      {/* Hero */}
      <div className="mb-10">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
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
          className={`group inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
            apenasDestaques
              ? "border-blue-400 bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25 dark:border-blue-400/40 dark:from-blue-500 dark:to-indigo-500"
              : "border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 hover:border-amber-300 hover:from-amber-100 hover:to-orange-100 hover:shadow-md dark:border-amber-500/20 dark:from-amber-500/10 dark:to-orange-500/10 dark:text-amber-400 dark:hover:border-amber-500/30 dark:hover:from-amber-500/15 dark:hover:to-orange-500/15"
          }`}
        >
          <Zap size={16} className={apenasDestaques ? "text-white" : "text-amber-500 dark:text-amber-400"} />
          Destaques LAB
          <span className={`ml-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold transition-colors ${
            apenasDestaques
              ? "bg-white/20 text-white"
              : "bg-amber-200 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
          }`}>
            {estaquesSet.size}
          </span>
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
