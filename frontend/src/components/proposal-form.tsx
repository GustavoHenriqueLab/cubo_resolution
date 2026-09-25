"use client";

import { useEffect, useRef, useState } from "react";
import {
  FileText,
  Plus,
  X,
  Loader2,
  Check,
  ShieldCheck,
  UserCog,
  AlertCircle,
  Paperclip,
} from "lucide-react";
import { useUser } from "@/components/user-provider";
import {
  ACCEPT_ANEXO,
  MAX_ANEXOS,
  enviarAnexosProposta,
  formatarTamanho,
  validarAnexos,
} from "@/lib/anexos";

interface Props {
  startupId: string;
  startupNome: string;
  departamentosDisponiveis: { slug: string; nome: string }[];
}

interface Gestor {
  id: string;
  nome: string;
}

export function ProposalForm({ startupId, startupNome, departamentosDisponiveis }: Props) {
  const { profile } = useUser();
  const role = profile?.role ?? "viewer";
  const podeEscolherDestino = role === "manager" || role === "admin";

  const [open, setOpen] = useState(false);
  const [departamento, setDepartamento] = useState("");
  const [tipo, setTipo] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [beneficios, setBeneficios] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [enviadoPara, setEnviadoPara] = useState("");

  const [gestores, setGestores] = useState<Gestor[]>([]);
  const [gestoresCarregados, setGestoresCarregados] = useState(false);
  const [gestorId, setGestorId] = useState("");
  const [destino, setDestino] = useState<"admin" | "gestor">("admin");

  const [arquivos, setArquivos] = useState<File[]>([]);
  const [avisoAnexos, setAvisoAnexos] = useState("");
  const arquivoInputRef = useRef<HTMLInputElement>(null);

  const handleArquivos = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const lista = Array.from(files);
    const vagas = MAX_ANEXOS - arquivos.length;

    if (vagas <= 0) {
      setError(`Limite de ${MAX_ANEXOS} anexos por proposta.`);
      return;
    }
    if (lista.length > vagas) {
      setError(`Voce pode adicionar mais ${vagas} anexo(s).`);
      if (arquivoInputRef.current) arquivoInputRef.current.value = "";
      return;
    }

    const invalido = validarAnexos(lista, vagas);
    if (invalido) {
      setError(invalido);
      if (arquivoInputRef.current) arquivoInputRef.current.value = "";
      return;
    }

    setArquivos([...arquivos, ...lista]);
    setError("");
    if (arquivoInputRef.current) arquivoInputRef.current.value = "";
  };

  const removerArquivo = (indice: number) => {
    setArquivos(arquivos.filter((_, i) => i !== indice));
  };

  useEffect(() => {
    if (!open || gestoresCarregados) return;
    setGestoresCarregados(true);
    fetch("/api/gestores")
      .then((r) => r.json())
      .then((d: { gestores?: Gestor[] }) => setGestores(d.gestores ?? []))
      .catch(() => setGestores([]));
  }, [open, gestoresCarregados]);

  const addBeneficio = () => setBeneficios([...beneficios, ""]);
  const removeBeneficio = (i: number) => {
    if (beneficios.length <= 1) return;
    setBeneficios(beneficios.filter((_, idx) => idx !== i));
  };
  const updateBeneficio = (i: number, val: string) => {
    const updated = [...beneficios];
    updated[i] = val;
    setBeneficios(updated);
  };

  const precisaGestor = !podeEscolherDestino || destino === "gestor";

  const handleSubmit = async () => {
    setError("");
    setAvisoAnexos("");
    if (justificativa.length < 50) {
      setError("Justificativa precisa ter no minimo 50 caracteres.");
      return;
    }
    const filtrados = beneficios.filter((b) => b.trim());
    if (filtrados.length === 0) {
      setError("Adicione pelo menos um beneficio.");
      return;
    }
    if (!tipo) {
      setError("Selecione o tipo de integracao.");
      return;
    }
    if (precisaGestor && !gestorId) {
      setError("Selecione o gestor que vai receber a proposta.");
      return;
    }

    setLoading(true);
    try {
      const gestorSelecionado = precisaGestor ? gestorId : null;
      const res = await fetch("/api/propostas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startupId,
          departamentoSlug: departamento || null,
          tipoIntegracao: tipo,
          justificativa,
          beneficios: filtrados,
          gestorId: gestorSelecionado,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao enviar proposta.");
        return;
      }

      if (arquivos.length > 0 && data.id) {
        const { erros } = await enviarAnexosProposta(data.id as string, arquivos);
        if (erros.length > 0) {
          setAvisoAnexos(
            `Proposta enviada, mas alguns anexos falharam: ${erros.join(" ")}`,
          );
        }
      }
      setArquivos([]);

      const nomeGestor = gestores.find((g) => g.id === gestorSelecionado)?.nome;
      setEnviadoPara(nomeGestor ? `o gestor ${nomeGestor}` : "o Admin");
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setDone(false);
      }, 2000);
    } catch {
      setError("Erro ao enviar proposta.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
      >
        <FileText size={16} />
        Propor Integracao para {startupNome}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 dark:border-blue-500/30 dark:bg-blue-500/5">
      {done ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400">
            <Check size={20} />
          </div>
          <p className="text-sm font-semibold text-green-700 dark:text-green-400">
            Proposta enviada para {enviadoPara}!
          </p>
          <p className="text-xs text-green-600 dark:text-green-500">
            Acompanhe o andamento em &quot;Propostas&quot;.
          </p>
          {avisoAnexos && (
            <p className="mt-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              {avisoAnexos}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Nova Proposta — {startupNome}
            </h4>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X size={16} />
            </button>
          </div>

          {/* Destino */}
          {podeEscolherDestino ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Destino da proposta
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDestino("admin")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                    destino === "admin"
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-400"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  <ShieldCheck size={14} />
                  Direto para o Admin
                </button>
                <button
                  type="button"
                  onClick={() => setDestino("gestor")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                    destino === "gestor"
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-400"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  <UserCog size={14} />
                  Para um gestor
                </button>
              </div>
              {destino === "admin" && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-blue-600 dark:text-blue-400">
                  Esta proposta vai <strong>direto para o admin</strong>, sem passar por gestor.
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Enviar para o gestor
              </label>
              <select
                value={gestorId}
                onChange={(e) => setGestorId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="">Selecione o gestor...</option>
                {gestores.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nome}
                  </option>
                ))}
              </select>
              {gestoresCarregados && gestores.length === 0 && (
                <p className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                  <AlertCircle size={12} />
                  Nenhum gestor cadastrado ainda. Contate o administrador.
                </p>
              )}
            </div>
          )}

          {/* Gestor quando o autor e gestor/admin e escolheu "Para um gestor" */}
          {podeEscolherDestino && destino === "gestor" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Gestor de destino
              </label>
              <select
                value={gestorId}
                onChange={(e) => setGestorId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="">Selecione o gestor...</option>
                {gestores.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Departamento */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Departamento (opcional)
            </label>
            <select
              value={departamento}
              onChange={(e) => setDepartamento(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="">Geral (LAB)</option>
              {departamentosDisponiveis.map((d) => (
                <option key={d.slug} value={d.slug}>{d.nome}</option>
              ))}
            </select>
          </div>

          {/* Tipo */}
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

          {/* Beneficios */}
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
                    placeholder="Ex: Reducao de custos operacionais..."
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

          {/* Justificativa */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Justificativa (min. 50 caracteres)
            </label>
            <textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              rows={3}
              placeholder="Explique por que essa integracao e relevante para a LAB..."
              className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            />
            <p className="mt-0.5 text-right text-[10px] text-gray-400">
              {justificativa.length}/50
            </p>
          </div>

          {/* Anexos */}
          <div className="rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-4 dark:border-blue-500/30 dark:bg-blue-500/5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                <Paperclip size={16} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Documentos de apoio{" "}
                  <span className="font-normal text-gray-400 dark:text-gray-500">
                    (opcional)
                  </span>
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                  Anexe ate {MAX_ANEXOS} arquivos (PDF, imagens, Word/Excel, ZIP) de ate
                  10 MB cada — o gestor e o admin poderao baixar.
                </p>

                {arquivos.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {arquivos.map((f, i) => (
                      <div
                        key={`${f.name}-${i}`}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                      >
                        <Paperclip size={13} className="shrink-0 text-blue-500" />
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-700 dark:text-gray-300">
                          {f.name}
                        </span>
                        <span className="shrink-0 text-[10px] text-gray-400">
                          {formatarTamanho(f.size)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removerArquivo(i)}
                          className="shrink-0 rounded p-1 text-gray-400 hover:text-red-500"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => arquivoInputRef.current?.click()}
                  disabled={arquivos.length >= MAX_ANEXOS}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3.5 py-2 text-xs font-semibold text-blue-600 shadow-sm transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-500/30 dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-blue-500/10"
                >
                  <Plus size={14} />
                  {arquivos.length === 0
                    ? "Adicionar documentos"
                    : `Adicionar mais (${MAX_ANEXOS - arquivos.length} restante(s))`}
                </button>
                <input
                  ref={arquivoInputRef}
                  type="file"
                  multiple
                  hidden
                  accept={ACCEPT_ANEXO}
                  onChange={(e) => handleArquivos(e.target.files)}
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || (gestoresCarregados && precisaGestor && gestores.length === 0)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-60"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "Enviando..." : "Enviar Proposta"}
          </button>
        </div>
      )}
    </div>
  );
}
