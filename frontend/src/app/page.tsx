"use client";

import { useState, useMemo } from "react";
import { getDepartamentos } from "@/lib/data";
import { DepartamentoCard } from "@/components/departamento-card";
import { SearchInput } from "@/components/search-input";

export default function HomePage() {
  const departamentos = useMemo(() => getDepartamentos(), []);
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
    <div className="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      {/* Hero */}
      <div className="mb-10">
        <h1 className="font-display text-3xl font-bold">
          <span className="text-gradient-brand">Departamentos Laboratorio Lab</span>
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          Startups do ecossistema Cubo Itau classificadas por departamento via inteligencia artificial.
        </p>
      </div>

      {/* Search */}
      <div className="mb-8 max-w-md">
        <SearchInput
          placeholder="Filtrar departamentos..."
          value={busca}
          onChange={setBusca}
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
        {filtrados.map((dep, i) => (
          <DepartamentoCard key={dep.slug} departamento={dep} index={i} />
        ))}
      </div>
    </div>
  );
}
