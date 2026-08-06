"use client";

import { useState, useEffect } from "react";
import { Clock, CheckCircle2, XCircle, MessageSquare, Play, Ban, Trophy, User } from "lucide-react";
import { PROPOSTA_STATUS_LABELS } from "@/lib/types";
import type { PropostaStatus, PropostaStatusLogEntry } from "@/lib/types";

export const ALL_PROPOSAL_STATUSES: PropostaStatus[] = [
  "pendente",
  "em_tratativas",
  "em_poc",
  "aprovada",
  "rejeitada",
  "cancelada",
  "finalizado",
];

export const PROPOSAL_STATUS_ICONS: Record<PropostaStatus, typeof Clock> = {
  pendente: Clock,
  em_tratativas: MessageSquare,
  em_poc: Play,
  aprovada: CheckCircle2,
  rejeitada: XCircle,
  cancelada: Ban,
  finalizado: Trophy,
};

interface PropostaTimelineProps {
  propostaId: string;
  status: PropostaStatus;
}

export function PropostaTimeline({ propostaId, status }: PropostaTimelineProps) {
  const [log, setLog] = useState<PropostaStatusLogEntry[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(status);

  useEffect(() => {
    fetch("/api/propostas/status-log?propostaId=" + propostaId)
      .then((r) => r.json())
      .then((d: { log: PropostaStatusLogEntry[] }) => setLog(d.log ?? []))
      .catch(() => {});
  }, [propostaId]);

  const visitedStatuses = new Set<PropostaStatus>(["pendente"]);
  for (const entry of log) {
    visitedStatuses.add(entry.status_novo);
  }

  const getNote = (s: PropostaStatus) => {
    if (s === "pendente") return null;
    const entry = log.find((e) => e.status_novo === s);
    return entry?.notas || null;
  };

  const getAdminNome = (s: PropostaStatus) => {
    if (s === "pendente") return null;
    const entry = log.find((e) => e.status_novo === s);
    return entry?.admin_nome || null;
  };

  const getCreatedAt = (s: PropostaStatus) => {
    if (s === "pendente") return null;
    const entry = log.find((e) => e.status_novo === s);
    return entry?.created_at || null;
  };

  const selectedNote = selectedStatus ? getNote(selectedStatus as PropostaStatus) : null;
  const selectedAdmin = selectedStatus ? getAdminNome(selectedStatus as PropostaStatus) : null;
  const selectedDate = selectedStatus ? getCreatedAt(selectedStatus as PropostaStatus) : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
        Progresso
      </p>
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
        {ALL_PROPOSAL_STATUSES.map((s, i) => {
          const StepIcon = PROPOSAL_STATUS_ICONS[s];
          const isVisited = visitedStatuses.has(s);
          const isCurrent = status === s;
          const note = getNote(s);

          return (
            <div key={s} className="flex items-center gap-1">
              {i > 0 && (
                <span className={"w-4 h-px " + (isVisited ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600")} />
              )}
              <button
                type="button"
                title={PROPOSTA_STATUS_LABELS[s] + (note ? " - Clique para ver detalhes" : "")}
                disabled={!isVisited || !note}
                onClick={() => setSelectedStatus(selectedStatus === s ? null : s)}
                className={"inline-flex items-center justify-center rounded-full w-7 h-7 transition-all " + (
                  isCurrent
                    ? "bg-emerald-600 text-white ring-2 ring-offset-1 ring-emerald-400 shadow-md shadow-emerald-500/30 dark:ring-emerald-500/50 dark:shadow-emerald-500/20"
                    : isVisited
                    ? "bg-blue-500 text-white " + (note ? "cursor-pointer hover:bg-blue-600" : "cursor-default")
                    : "bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
                )}
              >
                <StepIcon size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {selectedStatus && selectedNote && (
        <div className={
          selectedStatus === status
            ? "mt-2 rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2 dark:border-emerald-500/20 dark:bg-emerald-500/5"
            : "mt-2 rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-2 dark:border-blue-500/20 dark:bg-blue-500/5"
        }>
          <div className="flex items-center gap-1.5 mb-1">
            <span className={"text-[10px] font-semibold " + (
              selectedStatus === status
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-blue-600 dark:text-blue-400"
            )}>
              {PROPOSTA_STATUS_LABELS[selectedStatus as PropostaStatus]}
            </span>
            {selectedDate && (
              <span className="text-[10px] text-gray-400">
                &middot; {new Date(selectedDate).toLocaleString("pt-BR")}
              </span>
            )}
            {selectedAdmin && (
              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                &middot; <User size={10} /> {selectedAdmin}
              </span>
            )}
          </div>
          <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">
            {selectedNote}
          </p>
        </div>
      )}

      {!selectedStatus && (
        <p className="mt-2 text-[10px] font-medium text-gray-500 dark:text-gray-400">
          {status === "pendente" && "Aguardando analise do admin."}
          {status === "em_tratativas" && "Em negociacao com a startup."}
          {status === "em_poc" && "Executando prova de conceito."}
          {status === "aprovada" && "Proposta aprovada!"}
          {status === "rejeitada" && "Proposta rejeitada."}
          {status === "cancelada" && "Proposta cancelada."}
          {status === "finalizado" && "Parceria concluida com sucesso!"}
        </p>
      )}
    </div>
  );
}
