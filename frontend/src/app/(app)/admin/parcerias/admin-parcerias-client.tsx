"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, X, Building2, Calendar, Tag } from "lucide-react";
import { PROPOSTA_TIPO_LABELS } from "@/lib/types";
import type { Parceria } from "@/lib/types";

interface Props {
  parcerias: Parceria[];
}

export function AdminParceriasClient({ parcerias }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [descricao, setDescricao] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const startEdit = (p: Parceria) => {
    setEditing(p.id);
    setDescricao(p.descricao);
  };

  const cancelEdit = () => {
    setEditing(null);
    setDescricao("");
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/parcerias/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descricao }),
      });

      if (res.ok) {
        setEditing(null);
        setDescricao("");
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao salvar.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {parcerias.map((p) => {
        const isEditing = editing === p.id;
        return (
          <div
            key={p.id}
            className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {p.startup_nome || "—"}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <Building2 size={11} />
                    {p.departamento_nome || p.departamento_slug || "Geral (LAB)"}
                  </span>
                  {p.proposta_tipo && (
                    <span className="inline-flex items-center gap-1">
                      <Tag size={11} />
                      {PROPOSTA_TIPO_LABELS[p.proposta_tipo as keyof typeof PROPOSTA_TIPO_LABELS] || p.proposta_tipo}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={11} />
                    {new Date(p.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>

                {/* Description */}
                {isEditing ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      rows={3}
                      placeholder="Descreva a parceria realizada..."
                      className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(p.id)}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-green-700 disabled:opacity-60"
                      >
                        <Check size={14} />
                        Salvar
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                      >
                        <X size={14} />
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {p.descricao || "Sem descricao."}
                  </p>
                )}
              </div>

              {!isEditing && (
                <button
                  onClick={() => startEdit(p)}
                  className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {parcerias.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 dark:border-gray-700">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Nenhuma parceria registrada. Finalize propostas para criar parcerias.
          </p>
        </div>
      )}
    </div>
  );
}
