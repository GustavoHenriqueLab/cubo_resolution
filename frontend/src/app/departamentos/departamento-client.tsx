"use client";

import { useState, useMemo } from "react";
import { StartupCard } from "@/components/startup-card";
import { ConfiancaBadge } from "@/components/confianca-badge";
import type { StartupEnriquecida, DepartamentoInfo } from "@/lib/types";

interface Props {
  departamento: DepartamentoInfo;
  startups: StartupEnriquecida[];
}

export function DepartamentoClient({ departamento, startups }: Props) {
  const [filtro, setFiltro] = useState<"alta" | "media" | "baixa" | null>(null);

  const baixaCount = startups.filter((s) => s.confianca === "baixa").length;

  const exibidas = useMemo(() => {
    if (!filtro) return startups;
    return startups.filter((s) => s.confianca === filtro);
  }, [startups, filtro]);

  return (
    <>
      {/* Stats badges — toggle */}
      <div className="mb-10 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setFiltro(filtro === "alta" ? null : "alta")}
          className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold shadow-sm transition-all ${
            filtro === "alta"
              ? "border-blue-400 bg-blue-50 text-blue-700 shadow-blue-glow dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-300"
              : "border-gray-100 bg-white text-gray-700 hover:border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-600"
          }`}
        >
          <ConfiancaBadge confianca="alta" />
          <span>{departamento.altaConfianca}</span>
        </button>

        <button
          onClick={() => setFiltro(filtro === "media" ? null : "media")}
          className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold shadow-sm transition-all ${
            filtro === "media"
              ? "border-amber-400 bg-amber-50 text-amber-700 shadow-blue-glow dark:border-amber-400 dark:bg-amber-500/10 dark:text-amber-300"
              : "border-gray-100 bg-white text-gray-700 hover:border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-600"
          }`}
        >
          <ConfiancaBadge confianca="media" />
          <span>{departamento.mediaConfianca}</span>
        </button>

        <button
          onClick={() => setFiltro(filtro === "baixa" ? null : "baixa")}
          className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold shadow-sm transition-all ${
            filtro === "baixa"
              ? "border-gray-400 bg-gray-50 text-gray-700 shadow-blue-glow dark:border-gray-400 dark:bg-gray-500/10 dark:text-gray-300"
              : "border-gray-100 bg-white text-gray-700 hover:border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-600"
          }`}
        >
          <ConfiancaBadge confianca="baixa" />
          <span>{baixaCount}</span>
        </button>

        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          Total: {exibidas.length} de {departamento.totalStartups} startups
        </div>
      </div>

      {/* Grid unica — rank corrido */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {exibidas.map((s, i) => (
          <StartupCard key={s.nome} startup={s} index={i} />
        ))}
      </div>
    </>
  );
}
