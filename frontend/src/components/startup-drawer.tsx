"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  X,
  Sparkles,
  Target,
  Stethoscope,
  Package,
  Plug,
  ShieldCheck,
  TrendingUp,
  Clock,
  AlertTriangle,
  FlaskConical,
  ExternalLink,
  History,
} from "lucide-react";
import { useStartupDrawer } from "@/components/startup-drawer-context";
import { useUser } from "@/components/user-provider";
import { ConfiancaBadge } from "@/components/confianca-badge";
import { StatusBadge } from "@/components/status-badge";
import { StatusSelector } from "@/components/status-selector";
import { FavoriteButton } from "@/components/favorite-button";
import { nomeParaSlug } from "@/lib/constants";
import { DEPARTAMENTOS } from "@/lib/constants";
import { ProposalForm } from "@/components/proposal-form";
import { STATUS_LABELS } from "@/lib/types";
import { fetchFavorites } from "@/components/favorites-store";
import type { AvaliacaoGemini, StartupStatus, StartupStatusLogEntry } from "@/lib/types";

const CRITERIOS: { key: keyof AvaliacaoGemini; label: string; icon: typeof Target }[] = [
  { key: "problema_atendido", label: "Problema atendido", icon: Target },
  { key: "aderencia_saude", label: "Aderencia a saude", icon: Stethoscope },
  { key: "maturidade", label: "Maturidade", icon: Package },
  { key: "integracao", label: "Integracao", icon: Plug },
  { key: "conformidade", label: "Conformidade", icon: ShieldCheck },
  { key: "impacto", label: "Impacto", icon: TrendingUp },
  { key: "prazo", label: "Prazo", icon: Clock },
  { key: "riscos", label: "Riscos", icon: AlertTriangle },
  { key: "piloto", label: "Projeto-piloto", icon: FlaskConical },
];

export function StartupDrawer() {
  const { startup, close } = useStartupDrawer();
  const { isAdmin } = useUser();
  const [status, setStatus] = useState<StartupStatus | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [statusLog, setStatusLog] = useState<StartupStatusLogEntry[]>([]);
  const [loadingLog, setLoadingLog] = useState(false);

  useEffect(() => {
    if (startup) {
      document.body.style.overflow = "hidden";
      setStatus(startup.status);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [startup]);

  useEffect(() => {
    if (startup) {
      fetchFavorites().then((favs) => {
        setFavorited(favs.includes(startup.id));
      });
    }
  }, [startup]);

  useEffect(() => {
    if (startup) {
      setLoadingLog(true);
      fetch("/api/startups/status-log?startupId=" + startup.id)
        .then((res) => res.json())
        .then((data: { log: StartupStatusLogEntry[] }) => {
          setStatusLog(data.log ?? []);
        })
        .catch(() => {})
        .finally(() => setLoadingLog(false));
    }
  }, [startup, status]);

  if (!startup) return null;

  const temAnalise = startup.analise || startup.avaliacao;

  const handleStatusChange = async (newStatus: StartupStatus, notas: string) => {
    const res = await fetch("/api/startups/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startupId: startup.id, status: newStatus, notas }),
    });

    if (res.ok) {
      setStatus(newStatus);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={close}
      />

      {/* Panel */}
      <div className="animate-slide-in-right fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-xl flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-700">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-bold text-gray-900 dark:text-gray-100">
                {startup.nome}
              </h2>
              <FavoriteButton
                startupId={startup.id}
                initialFavorited={favorited}
                onToggle={setFavorited}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {status && <StatusBadge status={status} />}
              <ConfiancaBadge confianca={startup.confianca} />
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
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Admin status selector */}
          {isAdmin && status && (
            <div className="mb-5 rounded-xl border border-dashed border-blue-200 bg-blue-50/50 p-3 dark:border-blue-500/20 dark:bg-blue-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Status da startup
                </span>
                <StatusSelector
                  currentStatus={status}
                  onStatusChange={handleStatusChange}
                />
              </div>
            </div>
          )}

          {/* Status History */}
          <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="mb-2 flex items-center gap-1.5">
              <History size={14} className="text-gray-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Historico de status
              </span>
            </div>
            {loadingLog ? (
              <p className="text-xs text-gray-400">Carregando...</p>
            ) : statusLog.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {statusLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-2 rounded-lg bg-white px-2.5 py-2 dark:bg-gray-800"
                  >
                    <div className="mt-0.5 flex items-center gap-1.5 shrink-0">
                      <span className="inline-block rounded px-1.5 py-px text-[10px] font-semibold bg-slate-100 text-slate-500 dark:bg-gray-700 dark:text-gray-400">
                        {STATUS_LABELS[entry.status_anterior]}
                      </span>
                      <span className="text-[10px] text-gray-300">&rarr;</span>
                      <span className="inline-block rounded px-1.5 py-px text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
                        {STATUS_LABELS[entry.status_novo]}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      {entry.notas && (
                        <p className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-300">
                          {entry.notas}
                        </p>
                      )}
                      <p className="mt-0.5 text-[10px] text-gray-400">
                        {new Date(entry.created_at).toLocaleString("pt-BR")}
                        {entry.admin_nome && <> &middot; {entry.admin_nome}</>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Nenhuma alteracao de status registrada.</p>
            )}
          </div>

          {/* Department chips */}
          <div className="mb-5 flex flex-wrap gap-1.5">
            {startup.departamentos.map((d) => (
              <Link
                key={d}
                href={`/departamentos/${nomeParaSlug(d)}`}
                prefetch={false}
                onClick={close}
                className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
              >
                {d}
              </Link>
            ))}
          </div>

          {/* Proposta de Integracao */}
          <div className="mb-6">
            <ProposalForm
              startupId={startup.id}
              startupNome={startup.nome}
              departamentosDisponiveis={Object.entries(DEPARTAMENTOS).map(([slug, nome]) => ({ slug, nome }))}
            />
          </div>

          {/* Description */}
          <p className="mb-6 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {startup.descricao.replace(/\s*\.{2,}Ler mais\s*$/g, "").trim()}
          </p>

          {/* Meta grid */}
          <div className="mb-6 grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="text-xs font-medium text-slate-400 dark:text-gray-500">Segmento</div>
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{startup.segmento || "—"}</div>

            <div className="text-xs font-medium text-slate-400 dark:text-gray-500">Fundadores</div>
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{startup.fundadores || "—"}</div>

            <div className="text-xs font-medium text-slate-400 dark:text-gray-500">Modelos de negocio</div>
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {startup.modelos_negocio.join(", ") || "—"}
            </div>

            <div className="text-xs font-medium text-slate-400 dark:text-gray-500">Tecnologias</div>
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {startup.tecnologias.join(", ") || "—"}
            </div>

            <div className="text-xs font-medium text-slate-400 dark:text-gray-500">Site</div>
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {startup.site ? (
                <a
                  href={startup.site}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400"
                >
                  {startup.site}
                  <ExternalLink size={10} />
                </a>
              ) : (
                "—"
              )}
            </div>
          </div>

          {/* Gemini Analysis */}
          {temAnalise && (
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/50 to-white p-5 dark:border-blue-500/20 dark:from-blue-500/5 dark:to-gray-800">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles size={16} className="text-blue-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Analise do Gemini
                </span>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-blue-100 bg-white/60 px-3 py-2 dark:border-blue-500/20 dark:bg-blue-500/5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-500">Rank</div>
                  <div className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                    Relevancia para a LAB. 1 = mais relevante.
                  </div>
                </div>
                <div className="rounded-xl border border-blue-100 bg-white/60 px-3 py-2 dark:border-blue-500/20 dark:bg-blue-500/5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-500">Confianca</div>
                  <div className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                    Precisao do encaixe no departamento.
                  </div>
                </div>
              </div>

              {/* Analysis text */}
              {startup.analise && (
                <p className="mb-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  {startup.analise}
                </p>
              )}

              {/* Evaluation grid */}
              {startup.avaliacao && (
                <div className="grid grid-cols-1 gap-2.5">
                  {CRITERIOS.map(({ key, label, icon: Icon }) => {
                    const valor = startup.avaliacao?.[key];
                    if (!valor) return null;
                    return (
                      <div
                        key={key}
                        className="flex items-start gap-2.5 rounded-xl bg-white/70 p-3 dark:bg-gray-800/40"
                      >
                        <Icon size={14} className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500" />
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            {label}
                          </span>
                          <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                            {valor}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* No analysis placeholder */}
          {!temAnalise && (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-5 text-center dark:border-gray-700 dark:bg-gray-800/50">
              <Sparkles size={20} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Analise do Gemini nao disponivel para esta startup.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
