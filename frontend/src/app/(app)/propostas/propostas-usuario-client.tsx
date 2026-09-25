"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  ChevronDown,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Pencil,
  Loader2,
  ShieldCheck,
  UserCog,
  User,
  Plus,
  X,
  Inbox,
  Hourglass,
} from "lucide-react";
import {
  PROPOSTA_TIPO_LABELS,
  statusExibicaoProposta,
} from "@/lib/types";
import { DEPARTAMENTOS } from "@/lib/constants";
import { PropostaTimeline, PROPOSAL_STATUS_ICONS } from "@/components/proposta-timeline";
import type { PropostaAdminRow } from "@/lib/queries";
import type { PropostaStatus, PropostaTipo } from "@/lib/types";

const DEPTO_OPTIONS = Object.entries(DEPARTAMENTOS).map(([slug, nome]) => ({ slug, nome }));

interface Props {
  propostas: PropostaAdminRow[];
  gestorPropostas: PropostaAdminRow[];
  isManager: boolean;
}

function BadgeStatus({ proposta }: { proposta: PropostaAdminRow }) {
  const exib = statusExibicaoProposta(
    proposta.status as PropostaStatus,
    proposta.gestor_status,
  );
  const Icon =
    exib.key === "aguardando_admin"
      ? Hourglass
      : exib.etapaGestor
        ? proposta.gestor_status === "pendente"
          ? Clock
          : XCircle
        : PROPOSAL_STATUS_ICONS[proposta.status as PropostaStatus] ?? Clock;

  return (
    <span
      className={
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold " +
        exib.colors
      }
    >
      <Icon size={12} />
      {exib.label}
    </span>
  );
}

function DetalhesProposta({ proposta }: { proposta: PropostaAdminRow }) {
  return (
    <div className="space-y-4 border-t border-gray-100 px-5 py-4 dark:border-gray-700">
      <div className="flex flex-wrap gap-6">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Departamento
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {proposta.departamento_nome || proposta.departamento_slug || "Geral (LAB)"}
          </p>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Encaminhada para
          </p>
          <p className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
            {proposta.gestor_id ? (
              <>
                <UserCog size={13} className="text-amber-500" />
                {proposta.gestor_nome ?? "Gestor"}
              </>
            ) : (
              <>
                <ShieldCheck size={13} className="text-blue-500" />
                Admin (direta)
              </>
            )}
          </p>
        </div>
      </div>

      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Justificativa
        </p>
        <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
          {proposta.justificativa}
        </p>
      </div>

      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Beneficios esperados
        </p>
        <ul className="space-y-1">
          {proposta.beneficios.map((b, i) => (
            <li key={i} className="flex items-start gap-1.5 text-sm text-gray-700 dark:text-gray-300">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-400" />
              {b}
            </li>
          ))}
        </ul>
      </div>

      {proposta.gestor_notas && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 dark:bg-amber-500/10">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Parecer do gestor
          </p>
          <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
            {proposta.gestor_notas}
          </p>
        </div>
      )}

      <PropostaTimeline propostaId={proposta.id} status={proposta.status as PropostaStatus} />
    </div>
  );
}

function PropostaCard({
  proposta,
  mostrarAutor = false,
}: {
  proposta: PropostaAdminRow;
  mostrarAutor?: boolean;
}) {
  return (
    <details className="group rounded-2xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800">
      <summary className="flex cursor-pointer items-center gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
              {proposta.startup_nome}
            </h3>
            <BadgeStatus proposta={proposta} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
            {mostrarAutor && (
              <span className="inline-flex items-center gap-1">
                <User size={11} />
                {proposta.usuario_nome}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Building2 size={11} />
              {PROPOSTA_TIPO_LABELS[proposta.tipo_integracao as PropostaTipo] || proposta.tipo_integracao}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar size={11} />
              {new Date(proposta.created_at).toLocaleDateString("pt-BR")}
            </span>
          </div>
        </div>
        <ChevronDown
          size={18}
          className="shrink-0 text-gray-400 transition-transform group-open:rotate-180"
        />
      </summary>

      <DetalhesProposta proposta={proposta} />
    </details>
  );
}

function PropostaRecebidaCard({ proposta }: { proposta: PropostaAdminRow }) {
  const router = useRouter();
  const [modo, setModo] = useState<"ver" | "editar" | "recusar">("ver");
  const [tipo, setTipo] = useState(proposta.tipo_integracao);
  const [departamento, setDepartamento] = useState(proposta.departamento_slug ?? "");
  const [justificativa, setJustificativa] = useState(proposta.justificativa);
  const [beneficios, setBeneficios] = useState<string[]>(
    proposta.beneficios.length > 0 ? proposta.beneficios : [""],
  );
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const updateBeneficio = (i: number, val: string) => {
    const updated = [...beneficios];
    updated[i] = val;
    setBeneficios(updated);
  };
  const addBeneficio = () => setBeneficios([...beneficios, ""]);
  const removeBeneficio = (i: number) => {
    if (beneficios.length <= 1) return;
    setBeneficios(beneficios.filter((_, idx) => idx !== i));
  };

  const enviar = async (acao: "editar" | "aprovar" | "recusar") => {
    setErro("");

    if (acao === "editar") {
      if (!tipo) {
        setErro("Selecione o tipo de integracao.");
        return;
      }
      if (justificativa.trim().length < 50) {
        setErro("Justificativa precisa ter no minimo 50 caracteres.");
        return;
      }
      if (beneficios.filter((b) => b.trim()).length === 0) {
        setErro("Adicione pelo menos um beneficio.");
        return;
      }
    }
    if (acao === "recusar" && notas.trim().length < 10) {
      setErro("Informe o motivo da recusa (min. 10 caracteres).");
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = { acao };
      if (acao === "editar") {
        body.tipoIntegracao = tipo;
        body.departamentoSlug = departamento || null;
        body.justificativa = justificativa;
        body.beneficios = beneficios.filter((b) => b.trim());
      }
      if (acao === "recusar") {
        body.notas = notas.trim();
      }

      const res = await fetch(`/api/propostas/${proposta.id}/gestor`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;

      if (!res.ok) {
        setErro(data?.error || "Erro ao processar.");
        return;
      }

      router.refresh();
      setModo("ver");
      setNotas("");
    } catch {
      setErro("Erro ao processar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <details className="group rounded-2xl border border-amber-200 bg-white dark:border-amber-500/30 dark:bg-gray-800">
      <summary className="flex cursor-pointer items-center gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
              {proposta.startup_nome}
            </h3>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
              <Clock size={12} />
              Aguardando voce
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
            <span className="inline-flex items-center gap-1">
              <User size={11} />
              {proposta.usuario_nome}
              {proposta.usuario_departamento && ` · ${proposta.usuario_departamento}`}
            </span>
            <span className="inline-flex items-center gap-1">
              <Building2 size={11} />
              {PROPOSTA_TIPO_LABELS[proposta.tipo_integracao as PropostaTipo] || proposta.tipo_integracao}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar size={11} />
              {new Date(proposta.created_at).toLocaleDateString("pt-BR")}
            </span>
          </div>
        </div>
        <ChevronDown
          size={18}
          className="shrink-0 text-gray-400 transition-transform group-open:rotate-180"
        />
      </summary>

      <div className="space-y-4 border-t border-gray-100 px-5 py-4 dark:border-gray-700">
        {modo === "ver" && (
          <>
            <DetalhesPropostaFields
              tipo={proposta.tipo_integracao}
              departamentoNome={proposta.departamento_nome || proposta.departamento_slug || "Geral (LAB)"}
              justificativa={proposta.justificativa}
              beneficios={proposta.beneficios}
            />

            {erro && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
                {erro}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setModo("editar")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Pencil size={14} />
                Editar
              </button>
              <button
                type="button"
                onClick={() => setModo("recusar")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <XCircle size={14} />
                Recusar
              </button>
              <button
                type="button"
                onClick={() => enviar("aprovar")}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Aprovar e enviar ao Admin
              </button>
            </div>
          </>
        )}

        {modo === "editar" && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Tipo de Integracao
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "parceria", label: "Parceria" },
                  { value: "contratacao", label: "Contratacao" },
                  { value: "outro", label: "Outro" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTipo(tipo === opt.value ? "" : opt.value)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                      tipo === opt.value
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-400"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Departamento
              </label>
              <select
                value={departamento}
                onChange={(e) => setDepartamento(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="">Geral (LAB)</option>
                {DEPTO_OPTIONS.map((d) => (
                  <option key={d.slug} value={d.slug}>{d.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Beneficios esperados
              </label>
              <div className="space-y-1.5">
                {beneficios.map((b, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="shrink-0 text-xs text-gray-400">•</span>
                    <input
                      value={b}
                      onChange={(e) => updateBeneficio(i, e.target.value)}
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeBeneficio(i)}
                      className="shrink-0 rounded p-1 text-gray-400 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addBeneficio}
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                <Plus size={12} />
                Adicionar beneficio
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Justificativa (min. 50 caracteres)
              </label>
              <textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                rows={4}
                className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              />
              <p className="mt-0.5 text-right text-[10px] text-gray-400">
                {justificativa.length}/50
              </p>
            </div>

            {erro && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
                {erro}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => enviar("editar")}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Salvar alteracoes
              </button>
              <button
                type="button"
                onClick={() => {
                  setModo("ver");
                  setErro("");
                }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
            </div>
          </>
        )}

        {modo === "recusar" && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Motivo da recusa (visivel para o autor)
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={3}
                placeholder="Explique por que a proposta esta sendo recusada..."
                className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-red-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>

            {erro && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
                {erro}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => enviar("recusar")}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Confirmar recusa
              </button>
              <button
                type="button"
                onClick={() => {
                  setModo("ver");
                  setErro("");
                  setNotas("");
                }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </details>
  );
}

function DetalhesPropostaFields({
  tipo,
  departamentoNome,
  justificativa,
  beneficios,
}: {
  tipo: string;
  departamentoNome: string;
  justificativa: string;
  beneficios: string[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-6">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Departamento
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{departamentoNome}</p>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Tipo
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {PROPOSTA_TIPO_LABELS[tipo as PropostaTipo] || tipo}
          </p>
        </div>
      </div>
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Justificativa
        </p>
        <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
          {justificativa}
        </p>
      </div>
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Beneficios esperados
        </p>
        <ul className="space-y-1">
          {beneficios.map((b, i) => (
            <li key={i} className="flex items-start gap-1.5 text-sm text-gray-700 dark:text-gray-300">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-400" />
              {b}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ListaVazia({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white/50 py-16 dark:border-gray-700 dark:bg-gray-800/50">
      <FileText size={48} className="mb-4 text-gray-300 dark:text-gray-600" />
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{titulo}</p>
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{descricao}</p>
    </div>
  );
}

export function PropostasUsuarioClient({ propostas, gestorPropostas, isManager }: Props) {
  const [aba, setAba] = useState<"minhas" | "recebidas" | "respondidas">("minhas");

  const recebidas = gestorPropostas.filter((p) => p.gestor_status === "pendente");
  const respondidas = gestorPropostas.filter(
    (p) => p.gestor_status === "aprovada" || p.gestor_status === "rejeitada",
  );

  const abas = [
    { id: "minhas" as const, label: "Minhas", count: propostas.length },
    { id: "recebidas" as const, label: "Recebidas", count: recebidas.length },
    { id: "respondidas" as const, label: "Respondidas", count: respondidas.length },
  ];

  const mostrarMinhas = !isManager || aba === "minhas";

  return (
    <div className="mx-auto w-full max-w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:max-w-[80rem]">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          <span className="text-gradient-brand">Minhas Propostas</span>
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {isManager
            ? "Acompanhe as propostas que voce enviou, as que recebeu e as que respondeu como gestor."
            : "Acompanhe o status das suas propostas de integracao."}
        </p>
      </div>

      {isManager && (
        <div className="mb-5 flex flex-wrap items-center gap-1.5">
          {abas.map((a) => (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={
                "rounded-full border px-3 py-1 text-[11px] font-semibold transition-all " +
                (aba === a.id
                  ? "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-400"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400")
              }
            >
              {a.label} ({a.count})
            </button>
          ))}
        </div>
      )}

      {mostrarMinhas &&
        (propostas.length === 0 ? (
          <ListaVazia
            titulo="Voce ainda nao enviou nenhuma proposta."
            descricao='Abra uma startup e clique em "Propor Integracao".'
          />
        ) : (
          <div className="space-y-3">
            {propostas.map((p) => (
              <PropostaCard key={p.id} proposta={p} />
            ))}
          </div>
        ))}

      {isManager && aba === "recebidas" &&
        (recebidas.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white/50 py-16 dark:border-gray-700 dark:bg-gray-800/50">
            <Inbox size={48} className="mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Nenhuma proposta aguardando sua analise.
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Quando alguem enviar uma proposta para voce, ela aparece aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recebidas.map((p) => (
              <PropostaRecebidaCard key={p.id} proposta={p} />
            ))}
          </div>
        ))}

      {isManager && aba === "respondidas" &&
        (respondidas.length === 0 ? (
          <ListaVazia
            titulo="Voce ainda nao respondeu nenhuma proposta."
            descricao="As propostas que voce aprovar ou recusar aparecem aqui para acompanhamento."
          />
        ) : (
          <div className="space-y-3">
            {respondidas.map((p) => (
              <PropostaCard key={p.id} proposta={p} mostrarAutor />
            ))}
          </div>
        ))}
    </div>
  );
}
