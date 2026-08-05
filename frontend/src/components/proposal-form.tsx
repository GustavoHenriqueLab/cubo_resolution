"use client";

import { useState } from "react";
import { FileText, Plus, X, Loader2, Check } from "lucide-react";

interface Props {
  startupId: string;
  startupNome: string;
  departamentosDisponiveis: { slug: string; nome: string }[];
}

export function ProposalForm({ startupId, startupNome, departamentosDisponiveis }: Props) {
  const [open, setOpen] = useState(false);
  const [departamento, setDepartamento] = useState("");
  const [tipo, setTipo] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [beneficios, setBeneficios] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

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

  const handleSubmit = async () => {
    setError("");
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

    setLoading(true);
    try {
      const res = await fetch("/api/propostas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startupId,
          departamentoSlug: departamento || null,
          tipoIntegracao: tipo,
          justificativa,
          beneficios: filtrados,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao enviar proposta.");
        return;
      }

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
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-medium text-gray-400 transition-colors hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:hover:border-blue-400 dark:hover:text-blue-400"
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
            Proposta enviada!
          </p>
          <p className="text-xs text-green-600 dark:text-green-500">
            O admin sera notificado.
          </p>
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
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "poc", label: "POC" },
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

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
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
