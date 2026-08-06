"use client";

import { useState, useEffect } from "react";
import {
  X,
  Building2,
  Calendar,
  Tag,
  Handshake,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Play,
  Ban,
  Trophy,
  ArrowRight,
  User,
} from "lucide-react";
import { useParceriaDrawer } from "@/components/parceria-drawer-context";
import { PROPOSTA_TIPO_LABELS, PROPOSTA_STATUS_LABELS, PROPOSTA_STATUS_COLORS } from "@/lib/types";
import type { PropostaStatus, PropostaStatusLogEntry } from "@/lib/types";

const STATUS_ICONS: Record<PropostaStatus, typeof Clock> = {
  pendente: Clock,
  em_tratativas: MessageSquare,
  em_poc: Play,
  aprovada: CheckCircle2,
  rejeitada: XCircle,
  cancelada: Ban,
  finalizado: Trophy,
};

export function ParceriaDrawer() {
  const { parceria, close } = useParceriaDrawer();
  const [justificativa, setJustificativa] = useState<string | null>(null);
  const [log, setLog] = useState<PropostaStatusLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (parceria?.proposta_id) {
      setLoading(true);

      Promise.all([
        fetch("/api/propostas/status-log?propostaId=" + parceria.proposta_id)
          .then((r) => r.json())
          .then((d) => setLog(d.log ?? []))
          .catch(() => {}),
        fetch("/api/propostas/" + parceria.proposta_id)
          .then((r) => r.json())
          .then((d) => setJustificativa(d.justificativa ?? null))
          .catch(() => {}),
      ]).finally(() => setLoading(false));
    }
  }, [parceria]);

  useEffect(() => {
    if (parceria) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [parceria]);

  if (!parceria) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={close}
      />

      <div className="animate-slide-in-right fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-xl flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-700">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <Handshake size={18} />
              </div>
              <h2 className="font-display text-xl font-bold text-gray-900 dark:text-gray-100">
                {parceria.startup_nome || "—"}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 ml-10">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Building2 size={12} />
                {parceria.departamento_nome || parceria.departamento_slug || "Geral (LAB)"}
              </span>
              {parceria.proposta_tipo && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                  <Tag size={11} />
                  {PROPOSTA_TIPO_LABELS[parceria.proposta_tipo as keyof typeof PROPOSTA_TIPO_LABELS] || parceria.proposta_tipo}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                <Calendar size={11} />
                {new Date(parceria.created_at).toLocaleDateString("pt-BR")}
              </span>
            </div>
          </div>
          <button
            onClick={close}
            className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Partnership description */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Descricao da parceria
            </p>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 dark:border-emerald-500/20 dark:bg-emerald-500/5">
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                {parceria.descricao || "Parceria firmada com o LAB."}
              </p>
            </div>
          </div>

          {/* Original justification */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Justificativa original
            </p>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 size={14} className="animate-spin" />
                Carregando...
              </div>
            ) : justificativa ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {justificativa}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Nao disponivel.</p>
            )}
          </div>

          {/* Full status flow */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Percurso da proposta
            </p>

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                <Loader2 size={14} className="animate-spin" />
                Carregando...
              </div>
            ) : (
              <div className="space-y-2">
                {/* Initial: pendente */}
                <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-yellow-100 text-yellow-700 border-yellow-200">
                    <Clock size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Proposta enviada
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Aguardando analise do admin.
                    </p>
                  </div>
                </div>

                {/* Each transition */}
                {log.map((entry) => {
                  const DeIcon = STATUS_ICONS[entry.status_anterior];
                  const ParaIcon = STATUS_ICONS[entry.status_novo];
                  const deBg = PROPOSTA_STATUS_COLORS[entry.status_anterior] ?? "border-gray-200 bg-gray-50 text-gray-600";

                  const paraBg = PROPOSTA_STATUS_COLORS[entry.status_novo] ?? "border-gray-200 bg-gray-50 text-gray-600";
                  return (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
                    >
                      <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                        <span className={"inline-flex items-center justify-center rounded-full w-6 h-6 border " + deBg}>
                          <DeIcon size={11} />
                        </span>
                        <ArrowRight size={12} className="text-gray-300" />
                        <span className={"inline-flex items-center justify-center rounded-full w-6 h-6 border " + paraBg}>
                          <ParaIcon size={11} />
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {PROPOSTA_STATUS_LABELS[entry.status_anterior]}
                          {" "}&rarr;{" "}
                          {PROPOSTA_STATUS_LABELS[entry.status_novo]}
                        </p>
                        {entry.notas && (
                          <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                            {entry.notas}
                          </p>
                        )}
                        <p className="mt-1.5 flex items-center gap-1 text-[10px] text-gray-400">
                          {new Date(entry.created_at).toLocaleString("pt-BR")}
                          {entry.admin_nome && (
                            <>
                              <span>&middot;</span>
                              <User size={10} />
                              {entry.admin_nome}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
