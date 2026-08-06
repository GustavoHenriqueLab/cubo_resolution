"use client";

import { Building2, Calendar, Tag, Handshake } from "lucide-react";
import { PROPOSTA_TIPO_LABELS } from "@/lib/types";
import { useParceriaDrawer } from "@/components/parceria-drawer-context";
import type { Parceria } from "@/lib/types";

interface Props {
  parcerias: Parceria[];
}

export function ParceriasClient({ parcerias }: Props) {
  const { open } = useParceriaDrawer();

  if (parcerias.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white/50 py-16 dark:border-gray-700 dark:bg-gray-800/50">
        <Handshake size={48} className="mb-4 text-gray-300 dark:text-gray-600" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Nenhuma parceria registrada ainda.
        </p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          As parcerias sao criadas quando propostas sao finalizadas.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {parcerias.map((p) => (
        <div
          key={p.id}
          onClick={() => open(p)}
          className="hover-lift group flex cursor-pointer flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="mb-3 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <Handshake size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-base font-semibold text-gray-900 truncate dark:text-white">
                {p.startup_nome || "—"}
              </h3>
              <p className="mt-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {p.departamento_nome || p.departamento_slug || "Geral (LAB)"}
              </p>
            </div>
          </div>

          <p className="mb-4 flex-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {p.descricao || "Parceria firmada com o LAB."}
          </p>

          <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 text-xs text-gray-400 dark:border-gray-700 dark:text-gray-500">
            {p.proposta_tipo && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <Tag size={10} />
                {PROPOSTA_TIPO_LABELS[p.proposta_tipo as keyof typeof PROPOSTA_TIPO_LABELS] || p.proposta_tipo}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Calendar size={11} />
              {new Date(p.created_at).toLocaleDateString("pt-BR")}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
