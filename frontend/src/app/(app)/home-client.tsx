"use client";

import { useState, useMemo } from "react";
import { DepartamentoCard } from "@/components/departamento-card";
import { StartupCard } from "@/components/startup-card";
import { SearchInput } from "@/components/search-input";
import { Sparkles } from "lucide-react";
import type { DepartamentoInfo, StartupEnriquecida } from "@/lib/types";

interface Props {
  departamentos: DepartamentoInfo[];
  novidades: StartupEnriquecida[];
}

export function HomeClient({ departamentos, novidades }: Props) {
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    if (!busca) return departamentos;
    const termo = busca.toLowerCase();
    return departamentos.filter(
      (d) =>
        d.nome.toLowerCase().includes(termo) ||
        d.descricao.toLowerCase().includes(termo)
    );
  }, [departamentos, busca]);

  return (
    <div className="mx-auto w-full max-w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:max-w-[80rem]">
      {/* Hero — Novas Startups */}
      <div className="mb-10">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          <span className="text-gradient-brand">Novas Startups</span>
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          Startups adicionadas este mes no ecossistema Cubo Itau, classificadas por departamento via inteligencia artificial.
        </p>
      </div>

      {/* Novidades */}
      {novidades.length > 0 ? (
        <div className="mb-12">
          <div className="mb-5 flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400">
              <Sparkles size={14} />
              Novidades
            </div>
            <span className="text-sm font-medium text-slate-400 dark:text-slate-500">
              {novidades.length} startup(s) adicionada(s) este mes
            </span>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {novidades.slice(0, 6).map((s, i) => (
              <StartupCard key={s.id} startup={s} index={i} />
            ))}
          </div>
          {novidades.length > 6 && (
            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              +{novidades.length - 6} startup(s) adicionada(s) este mes.
            </p>
          )}
        </div>
      ) : (
        <div className="mb-12 flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white/50 py-12 text-center backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50">
          <Sparkles size={32} className="mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-medium text-gray-400 dark:text-gray-500">
            Nenhuma startup nova este mes.
          </p>
        </div>
      )}

      {/* Departamentos — titulo + search na mesma linha */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">
            <span className="text-gradient-brand">Departamentos</span>
          </h2>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            12 departamentos do laboratorio
          </p>
        </div>
        <div className="w-full sm:w-72">
          <SearchInput
            placeholder="Filtrar departamentos..."
            value={busca}
            onChange={setBusca}
          />
        </div>
      </div>

      {/* Grid de departamentos */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
        {filtrados.map((dep, i) => (
          <DepartamentoCard key={dep.slug} departamento={dep} index={i} />
        ))}
      </div>
    </div>
  );
}
