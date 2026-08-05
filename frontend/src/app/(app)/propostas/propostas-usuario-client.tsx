"use client";

import { FileText, ChevronDown, Building2, Calendar, Clock, CheckCircle2, XCircle } from "lucide-react";
import { PROPOSTA_STATUS_LABELS, PROPOSTA_TIPO_LABELS } from "@/lib/types";
import type { PropostaAdminRow } from "@/lib/queries";
import type { PropostaStatus, PropostaTipo } from "@/lib/types";

interface Props {
  propostas: PropostaAdminRow[];
}

export function PropostasUsuarioClient({ propostas }: Props) {
  return (
    <div className="mx-auto w-full max-w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:max-w-[80rem]">
      <div className="mb-10">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          <span className="text-gradient-brand">Minhas Propostas</span>
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Acompanhe o status das suas propostas de integracao.
        </p>
      </div>

      {propostas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white/50 py-16 dark:border-gray-700 dark:bg-gray-800/50">
          <FileText size={48} className="mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Voce ainda nao enviou nenhuma proposta.
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Abra uma startup e clique em &quot;Propor Integracao&quot;.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {propostas.map((p) => {
            const statusConfig = {
              pendente: {
                icon: Clock,
                color: "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-400",
              },
              aprovada: {
                icon: CheckCircle2,
                color: "border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400",
              },
              rejeitada: {
                icon: XCircle,
                color: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400",
              },
            }[p.status as PropostaStatus] ?? {
              icon: Clock,
              color: "border-gray-200 bg-gray-50 text-gray-600",
            };

            const StatusIcon = statusConfig.icon;

            return (
              <details
                key={p.id}
                className="group rounded-2xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800"
              >
                <summary className="flex cursor-pointer items-center gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900 truncate dark:text-white">
                        {p.startup_nome}
                      </h3>
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusConfig.color}`}>
                        <StatusIcon size={12} />
                        {PROPOSTA_STATUS_LABELS[p.status as PropostaStatus]}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Building2 size={11} />
                        {PROPOSTA_TIPO_LABELS[p.tipo_integracao as PropostaTipo] || p.tipo_integracao}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={11} />
                        {new Date(p.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                  <ChevronDown
                    size={18}
                    className="shrink-0 text-gray-400 transition-transform group-open:rotate-180"
                  />
                </summary>

                <div className="border-t border-gray-100 px-5 py-4 space-y-4 dark:border-gray-700">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                      Departamento
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {p.departamento_nome || p.departamento_slug || "Geral (LAB)"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                      Justificativa
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {p.justificativa}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                      Beneficios esperados
                    </p>
                    <ul className="space-y-1">
                      {p.beneficios.map((b, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-400" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {p.admin_notas && (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-700/50">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                        Resposta do Admin
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {p.admin_notas}
                      </p>
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
