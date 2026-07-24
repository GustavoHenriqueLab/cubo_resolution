"use client";

import { useRouter } from "next/navigation";
import type { DepartamentoInfo } from "@/lib/types";

interface Props {
  departamentos: DepartamentoInfo[];
  slugAtual: string;
}

export function DepartamentoSelector({ departamentos, slugAtual }: Props) {
  const router = useRouter();

  return (
    <select
      value={slugAtual}
      onChange={(e) => router.push(`/departamentos/${e.target.value}`)}
      className="w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 outline-none transition-all hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/20 sm:w-72"
    >
      {departamentos.map((dep) => (
        <option key={dep.slug} value={dep.slug}>
          {dep.nome} ({dep.totalStartups} startups)
        </option>
      ))}
    </select>
  );
}
