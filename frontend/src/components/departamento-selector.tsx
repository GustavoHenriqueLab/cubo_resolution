"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import type { DepartamentoInfo } from "@/lib/types";

interface Props {
  departamentos: DepartamentoInfo[];
  slugAtual: string;
}

export function DepartamentoSelector({ departamentos, slugAtual }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const atual = departamentos.find((d) => d.slug === slugAtual);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selecionar = (slug: string) => {
    setOpen(false);
    if (slug !== slugAtual) {
      router.push(`/departamentos/${slug}`);
    }
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-sm font-medium text-gray-700 transition-colors hover:border-slate-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-500"
      >
        <span className="truncate">
          {atual
            ? `${atual.nome} (${atual.totalStartups} startups)`
            : "Selecionar departamento"}
        </span>
        <ChevronDown
          size={16}
          className={
            "shrink-0 text-gray-400 transition-transform " +
            (open ? "rotate-180" : "")
          }
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="animate-scale-in absolute right-0 top-full z-50 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-gray-100 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-800">
          {departamentos.map((dep) => {
            const ativo = dep.slug === slugAtual;
            return (
              <button
                key={dep.slug}
                type="button"
                onClick={() => selecionar(dep.slug)}
                className={
                  "flex w-full items-center gap-2 px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 " +
                  (ativo
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-400")
                }
              >
                <span className="w-4 flex-shrink-0">
                  {ativo && <Check size={14} />}
                </span>
                <span className="truncate">
                  {dep.nome} ({dep.totalStartups} startups)
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
