"use client";

import { useState, useMemo } from "react";
import { Search, Globe } from "lucide-react";
import { AdminStartupRowActions } from "./actions";
import { AssignUsersCell } from "./assign-cell";
import { MultiCombobox } from "@/components/multi-combobox";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/types";
import type { AdminStartupRow } from "@/lib/queries";
import type { StartupStatus } from "@/lib/types";

interface Props {
  startups: AdminStartupRow[];
}

export function AdminStartupsClient({ startups }: Props) {
  const [data, setData] = useState(startups);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<StartupStatus[]>([]);

  const handleStatusChange = (startupId: string, newStatus: StartupStatus) => {
    setData((prev) =>
      prev.map((s) => (s.id === startupId ? { ...s, status: newStatus } : s))
    );
  };

  const filtradas = useMemo(() => {
    let resultado = data;

    if (busca.trim()) {
      const termo = busca.toLowerCase();
      resultado = resultado.filter((s) => s.nome.toLowerCase().includes(termo));
    }

    if (statusFiltro.length > 0) {
      resultado = resultado.filter((s) => statusFiltro.includes(s.status));
    }

    return resultado;
  }, [data, busca, statusFiltro]);

  return (
    <>
      {/* Search + Counter + Status */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative w-full max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar startup por nome..."
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder-slate-400 outline-none transition-all focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,.15)] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>
          <div className="w-40 shrink-0">
            <MultiCombobox
              options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
              values={statusFiltro}
              onChange={(v) => setStatusFiltro(v as StartupStatus[])}
              placeholder="Status"
            />
          </div>
        </div>
        <div className="shrink-0 rounded-xl border border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {filtradas.length}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {" "}de {data.length} startup(s)
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50 text-left dark:border-gray-700 dark:bg-gray-800/50">
              <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Startup
              </th>
              <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-44">
                Status
              </th>
              <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hidden md:table-cell">
                Departamentos
              </th>
              <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pessoas
              </th>
              <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hidden xl:table-cell">
                Segmento
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtradas.map((s) => (
              <tr
                key={s.id}
                className="transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                      {s.nome}
                    </p>
                    {s.site && (
                      <a
                        href={s.site}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        <Globe size={10} />
                        {s.site.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <AdminStartupRowActions
                    startupId={s.id}
                    currentStatus={s.status}
                    onStatusChange={handleStatusChange}
                  />
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {s.departamentos.length > 0 ? (
                      s.departamentos.map((d) => (
                        <span
                          key={d}
                          className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                        >
                          {d}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 min-w-[180px]">
                  <AssignUsersCell
                    startupId={s.id}
                    atribuidos={s.atribuidos}
                    todosUsuarios={s.todos_usuarios}
                  />
                </td>
                <td className="px-4 py-3 hidden xl:table-cell">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {s.segmento || "—"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtradas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search size={32} className="mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-slate-400 dark:text-slate-500">
              {busca || statusFiltro.length > 0 ? "Nenhuma startup encontrada para este filtro." : "Nenhuma startup encontrada."}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
