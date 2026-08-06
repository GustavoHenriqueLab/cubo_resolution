"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Save, X } from "lucide-react";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/types";
import type { StartupStatus } from "@/lib/types";

interface Props {
  currentStatus: StartupStatus;
  onStatusChange: (status: StartupStatus, notas: string) => void;
}

export function StatusSelector({ currentStatus, onStatusChange }: Props) {
  const [open, setOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<StartupStatus | null>(null);
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setNotesOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (status: StartupStatus) => {
    if (status !== currentStatus) {
      setPendingStatus(status);
      setNotas("");
      setOpen(false);
      setNotesOpen(true);
    } else {
      setOpen(false);
    }
  };

  const handleSave = async () => {
    if (!pendingStatus) return;
    setSaving(true);
    await onStatusChange(pendingStatus, notas.trim());
    setSaving(false);
    setNotesOpen(false);
    setPendingStatus(null);
  };

  const cancelNotes = () => {
    setNotesOpen(false);
    setPendingStatus(null);
    setNotas("");
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
          setNotesOpen(false);
        }}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
      >
        Alterar status
        <ChevronDown size={12} className={"transition-transform " + (open ? "rotate-180" : "")} />
      </button>

      {/* Dropdown: status list OR notes form */}
      {(open || notesOpen) && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-gray-100 bg-white py-1 shadow-xl animate-scale-in dark:border-gray-700 dark:bg-gray-800">
          {open && (
            <div className="max-h-64 overflow-auto">
              {STATUS_ORDER.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(status);
                  }}
                  className={"flex w-full items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 " + (
                    status === currentStatus
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-600 dark:text-gray-400"
                  )}
                >
                  <span className="w-4 flex-shrink-0">
                    {status === currentStatus && <Check size={14} />}
                  </span>
                  {STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          )}

          {notesOpen && pendingStatus && (
            <div className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
              <p className="mb-1.5 text-[10px] font-semibold text-gray-400">
                Novo status: <span className="text-blue-600">{STATUS_LABELS[pendingStatus]}</span>
              </p>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Notas sobre esta mudanca (opcional)..."
                rows={2}
                className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              />
              <div className="mt-2 flex gap-1.5">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <Save size={12} />
                  )}
                  Salvar
                </button>
                <button
                  onClick={cancelNotes}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
