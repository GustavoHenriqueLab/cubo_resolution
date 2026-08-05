"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Check, X, ChevronDown, User, Building2, Calendar, AlertTriangle, RotateCcw } from "lucide-react";
import { PROPOSTA_STATUS_LABELS, PROPOSTA_TIPO_LABELS } from "@/lib/types";
import type { PropostaAdminRow } from "@/lib/queries";
import type { PropostaStatus } from "@/lib/types";

interface Props {
  propostas: PropostaAdminRow[];
}

export function AdminPropostasClient({ propostas }: Props) {
  const [statusFiltro, setStatusFiltro] = useState<PropostaStatus | "">("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [confirming, setConfirming] = useState<Record<string, PropostaStatus>>({});
  const router = useRouter();

  const filtradas = useMemo(() => {
    if (!statusFiltro) return propostas;
    return propostas.filter((p) => p.status === statusFiltro);
  }, [propostas, statusFiltro]);

  const confirmAction = (id: string, action: PropostaStatus) => {
    if (confirming[id] === action) {
      handleAction(id, action);
      setConfirming((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } else {
      setConfirming((prev) => ({ ...prev, [id]: action }));
    }
  };

  const handleAction = async (id: string, status: PropostaStatus) => {
    const n = notas[id]?.trim();
    if (!n) return;

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
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao processar. Verifique se a migracao SQL foi executada.");
        router.refresh();
      }
    } finally {
      setLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const cancelConfirm = (id: string) => {
    setConfirming((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return (
    <div>
      {/* Filter */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-medium text-slate-400">Status:</span>
        <button
          onClick={() => setStatusFiltro("")}
          className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-all ${
            statusFiltro === ""
              ? "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-400"
              : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          Todas ({propostas.length})
        </button>
        {(["pendente", "aprovada", "rejeitada"] as PropostaStatus[]).map((s) => {
          const count = propostas.filter((p) => p.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFiltro(statusFiltro === s ? "" : s)}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-all ${
                statusFiltro === s
                  ? "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-400"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
              }`}
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
          const isPending = p.status === "pendente";
          const conf = confirming[p.id];
          const hasNote = (notas[p.id] ?? "").trim().length > 0;

          const confActionLabel: Record<string, string> = {
            pendente: "reversao para pendente",
            aprovada: isPending ? "aprovacao" : "alteracao para aprovada",
            rejeitada: isPending ? "rejeicao" : "alteracao para rejeitada",
          };
          const confBtnText: Record<string, string> = {
            pendente: "Sim, Reverter",
            aprovada: "Sim, Aprovar",
            rejeitada: "Sim, Rejeitar",
          };
          const confBtnClass: Record<string, string> = {
            pendente: "bg-slate-600 hover:bg-slate-700",
            aprovada: "bg-green-600 hover:bg-green-700",
            rejeitada: "bg-red-600 hover:bg-red-700",
          };
          const confIcon = (action: string) => {
            if (action === "pendente") return <RotateCcw size={16} />;
            if (action === "aprovada") return <Check size={16} />;
            return <X size={16} />;
          };

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
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                      p.status === "pendente"
                        ? "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-400"
                        : p.status === "aprovada"
                        ? "border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400"
                        : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400"
                    }`}>
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
                  className={`shrink-0 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
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
                  {p.admin_notas && (
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
                  <div className="space-y-3">
                    <textarea
                      value={notas[p.id] ?? ""}
                      onChange={(e) => {
                        setNotas((prev) => ({ ...prev, [p.id]: e.target.value }));
                        cancelConfirm(p.id);
                      }}
                      rows={2}
                      placeholder={isPending ? "Motivo da decisao (obrigatorio)..." : "Motivo da alteracao (obrigatorio)..."}
                      className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                    />

                    {conf ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
                          <AlertTriangle size={14} className="shrink-0" />
                          Confirma <strong>{confActionLabel[conf]}</strong> desta proposta?
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(p.id, conf)}
                            disabled={loading[p.id]}
                            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold text-white transition-all disabled:opacity-60 ${confBtnClass[conf]}`}
                          >
                            {loading[p.id] ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            ) : (
                              confIcon(conf)
                            )}
                            {confBtnText[conf]}
                          </button>
                          <button
                            onClick={() => cancelConfirm(p.id)}
                            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        {isPending && (
                          <>
                            <button
                              onClick={() => confirmAction(p.id, "aprovada")}
                              disabled={!hasNote}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2 text-sm font-semibold text-white transition-all hover:bg-green-700 disabled:opacity-40"
                            >
                              <Check size={16} />
                              Aprovar
                            </button>
                            <button
                              onClick={() => confirmAction(p.id, "rejeitada")}
                              disabled={!hasNote}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-40"
                            >
                              <X size={16} />
                              Rejeitar
                            </button>
                          </>
                        )}
                        {p.status === "aprovada" && (
                          <>
                            <button
                              onClick={() => confirmAction(p.id, "rejeitada")}
                              disabled={!hasNote}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-40"
                            >
                              <X size={16} />
                              Rejeitar
                            </button>
                            <button
                              onClick={() => confirmAction(p.id, "pendente")}
                              disabled={!hasNote}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-600 py-2 text-sm font-semibold text-white transition-all hover:bg-slate-700 disabled:opacity-40"
                            >
                              <RotateCcw size={16} />
                              Reverter
                            </button>
                          </>
                        )}
                        {p.status === "rejeitada" && (
                          <>
                            <button
                              onClick={() => confirmAction(p.id, "aprovada")}
                              disabled={!hasNote}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2 text-sm font-semibold text-white transition-all hover:bg-green-700 disabled:opacity-40"
                            >
                              <Check size={16} />
                              Aprovar
                            </button>
                            <button
                              onClick={() => confirmAction(p.id, "pendente")}
                              disabled={!hasNote}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-600 py-2 text-sm font-semibold text-white transition-all hover:bg-slate-700 disabled:opacity-40"
                            >
                              <RotateCcw size={16} />
                              Reverter
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
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
