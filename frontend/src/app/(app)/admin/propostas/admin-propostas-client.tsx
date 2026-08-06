"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, User, Building2, Calendar, AlertTriangle } from "lucide-react";
import { PROPOSTA_STATUS_LABELS, PROPOSTA_STATUS_COLORS, PROPOSTA_STATUS_FILTER_COLORS, PROPOSTA_TIPO_LABELS } from "@/lib/types";
import type { PropostaAdminRow } from "@/lib/queries";
import type { PropostaStatus } from "@/lib/types";

interface Props {
  propostas: PropostaAdminRow[];
}

const ALL_STATUSES: PropostaStatus[] = [
  "pendente",
  "em_tratativas",
  "em_poc",
  "aprovada",
  "rejeitada",
  "cancelada",
  "finalizado",
];

export function AdminPropostasClient({ propostas }: Props) {
  const [statusFiltro, setStatusFiltro] = useState<PropostaStatus | "">("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [pendingStatus, setPendingStatus] = useState<Record<string, PropostaStatus>>({});
  const [confirming, setConfirming] = useState<Record<string, boolean>>({});
  const [statusDropdown, setStatusDropdown] = useState<Record<string, boolean>>({});
  const router = useRouter();

  const filtradas = useMemo(() => {
    if (!statusFiltro) return propostas;
    return propostas.filter((p) => p.status === statusFiltro);
  }, [propostas, statusFiltro]);

  const selectStatus = (id: string, status: PropostaStatus) => {
    setPendingStatus((prev) => ({ ...prev, [id]: status }));
    setConfirming((prev) => ({ ...prev, [id]: false }));
    setStatusDropdown((prev) => ({ ...prev, [id]: false }));
  };

  const confirmAction = (id: string) => {
    setConfirming((prev) => ({ ...prev, [id]: true }));
  };

  const cancelAction = (id: string) => {
    setConfirming((prev) => ({ ...prev, [id]: false }));
    setPendingStatus((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleAction = async (id: string) => {
    const status = pendingStatus[id];
    const n = notas[id]?.trim();
    if (!status || !n) return;

    setLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/propostas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notas: n }),
      });

      if (res.ok) {
        setExpanded(null);
        setNotas((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setPendingStatus((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setConfirming((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao processar.");
        router.refresh();
      }
    } finally {
      setLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div>
      {/* Filter */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-medium text-slate-400">Status:</span>
        <button
          onClick={() => setStatusFiltro("")}
          className={"rounded-full border px-3 py-1 text-[11px] font-semibold transition-all " + (
            statusFiltro === ""
              ? "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-400"
              : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
          )}
        >
          Todas ({propostas.length})
        </button>
        {ALL_STATUSES.map((s) => {
          const count = propostas.filter((p) => p.status === s).length;
          const activeColors = PROPOSTA_STATUS_FILTER_COLORS[s];
          return (
            <button
              key={s}
              onClick={() => setStatusFiltro(statusFiltro === s ? "" : s)}
              className={"rounded-full border px-3 py-1 text-[11px] font-semibold transition-all " + (
                statusFiltro === s
                  ? activeColors
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
              )}
            >
              {PROPOSTA_STATUS_LABELS[s]} ({count})
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtradas.map((p) => {
          const isExpanded = expanded === p.id;
          const selStatus = pendingStatus[p.id];
          const isConfirming = confirming[p.id];
          const hasNote = (notas[p.id] ?? "").trim().length > 0;
          const isDropdownOpen = statusDropdown[p.id];
          const currentStatusColor = PROPOSTA_STATUS_COLORS[p.status as PropostaStatus] ?? "";

          return (
            <div
              key={p.id}
              className="rounded-2xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800"
            >
              {/* Row header */}
              <button
                onClick={() => {
                  if (isExpanded) {
                    setExpanded(null);
                  } else {
                    setExpanded(p.id);
                    if (p.admin_notas && !(p.id in notas)) {
                      setNotas((prev) => ({ ...prev, [p.id]: p.admin_notas ?? "" }));
                    }
                  }
                }}
                className="flex w-full items-center gap-4 px-5 py-4 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 truncate dark:text-white">
                      {p.startup_nome}
                    </h3>
                    <span className={"shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold " + currentStatusColor}>
                      {PROPOSTA_STATUS_LABELS[p.status as PropostaStatus]}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300">
                      <User size={13} className="text-blue-400 shrink-0" />
                      {p.usuario_nome}
                      {p.usuario_departamento && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                          {p.usuario_departamento}
                        </span>
                      )}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                      <Building2 size={11} />
                      {PROPOSTA_TIPO_LABELS[p.tipo_integracao as keyof typeof PROPOSTA_TIPO_LABELS] || p.tipo_integracao}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                      <Calendar size={11} />
                      {new Date(p.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>

                <ChevronDown
                  size={18}
                  className={"shrink-0 text-gray-400 transition-transform " + (isExpanded ? "rotate-180" : "")}
                />
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-700 space-y-4">
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                        Solicitante
                      </p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <User size={13} className="text-blue-400" />
                        {p.usuario_nome}
                        {p.usuario_departamento && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                            {p.usuario_departamento}
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                        Departamento destino
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {p.departamento_nome || p.departamento_slug || "Geral (LAB)"}
                      </p>
                    </div>
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

                  {/* Admin notes if already decided */}
                  {p.admin_notas && !(p.id in notas) && (
                    <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-700/50">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                        Decisao do Admin
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {p.admin_notas}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  {p.status !== "finalizado" && (
                    <div className="space-y-3">
                      {/* Status dropdown */}
                      <div className="relative">
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                          Novo status
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setStatusDropdown((prev) => ({
                              ...prev,
                              [p.id]: !prev[p.id],
                            }))
                          }
                          className={"flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 " + (
                            selStatus ? "text-gray-700" : "text-gray-400"
                          )}
                        >
                          {selStatus ? PROPOSTA_STATUS_LABELS[selStatus] : "Selecionar novo status..."}
                          <ChevronDown size={14} />
                        </button>

                        {isDropdownOpen && (
                          <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-lg border border-gray-100 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                            {ALL_STATUSES.filter((s) => s !== p.status).map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => selectStatus(p.id, s)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700"
                              >
                                {s === selStatus && <Check size={14} className="text-blue-500" />}
                                <span className={s === selStatus ? "text-blue-600 dark:text-blue-400" : ""}>
                                  {PROPOSTA_STATUS_LABELS[s]}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      <textarea
                        value={notas[p.id] ?? ""}
                        onChange={(e) => {
                          setNotas((prev) => ({ ...prev, [p.id]: e.target.value }));
                          setConfirming((prev) => ({ ...prev, [p.id]: false }));
                        }}
                        rows={2}
                        placeholder="Motivo da alteracao (obrigatorio)..."
                        className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                      />

                      {/* Action buttons */}
                      {isConfirming ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
                            <AlertTriangle size={14} className="shrink-0" />
                            Confirma alterar status para <strong>{PROPOSTA_STATUS_LABELS[selStatus!]}</strong>?
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAction(p.id)}
                              disabled={loading[p.id]}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-60"
                            >
                              {loading[p.id] ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                              ) : (
                                <Check size={16} />
                              )}
                              Sim, Confirmar
                            </button>
                            <button
                              onClick={() => cancelAction(p.id)}
                              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => confirmAction(p.id)}
                          disabled={!selStatus || !hasNote}
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-40"
                        >
                          <Check size={16} />
                          Atualizar Status
                        </button>
                      )}
                    </div>
                  )}

                  {/* Finalizado - readonly */}
                  {p.status === "finalizado" && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        Esta proposta foi finalizada e uma parceria foi criada. Nao e possivel alterar o status.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtradas.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 dark:border-gray-700">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Nenhuma proposta encontrada.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
