"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Save, X } from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, STATUS_ORDER } from "@/lib/types";
import type { StartupStatus } from "@/lib/types";

interface Props {
  startupId: string;
  currentStatus: StartupStatus;
  onStatusChange: (startupId: string, newStatus: StartupStatus) => void;
}

export function AdminStartupRowActions({ startupId, currentStatus, onStatusChange }: Props) {
  const [status, setStatus] = useState<StartupStatus>(currentStatus);
  const [open, setOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notas, setNotas] = useState("");
  const [pendingStatus, setPendingStatus] = useState<StartupStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target)) {
        setOpen(false);
        setNotesOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const calcPosition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = notesOpen ? 200 : 140;
    const openAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    setDropdownStyle({
      position: "fixed",
      left: rect.left,
      width: 200,
      top: openAbove ? rect.top - 4 : rect.bottom + 4,
      transform: openAbove ? "translateY(-100%)" : undefined,
      zIndex: 9999,
    });
  }, [notesOpen]);

  useEffect(() => {
    if (open || notesOpen) {
      calcPosition();
      window.addEventListener("scroll", calcPosition, true);
      window.addEventListener("resize", calcPosition);
    }
    return () => {
      window.removeEventListener("scroll", calcPosition, true);
      window.removeEventListener("resize", calcPosition);
    };
  }, [open, notesOpen, calcPosition]);

  const handleSelect = (newStatus: StartupStatus) => {
    if (newStatus === status) {
      setOpen(false);
      return;
    }
    setPendingStatus(newStatus);
    setNotas("");
    setOpen(false);
    setNotesOpen(true);
  };

  const handleSave = async () => {
    if (!pendingStatus) return;
    setSaving(true);

    const previous = status;
    setStatus(pendingStatus);
    onStatusChange(startupId, pendingStatus);

    try {
      const res = await fetch("/api/startups/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startupId,
          status: pendingStatus,
          notas: notas.trim(),
        }),
      });

      if (!res.ok) {
        setStatus(previous);
        onStatusChange(startupId, previous);
      }
    } catch {
      setStatus(previous);
      onStatusChange(startupId, previous);
    } finally {
      setSaving(false);
      setNotesOpen(false);
      setPendingStatus(null);
    }
  };

  const cancelNotes = () => {
    setNotesOpen(false);
    setPendingStatus(null);
    setNotas("");
  };

  const label = STATUS_LABELS[status] ?? status;
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.a_contatar;

  const dropdown = mounted && (open || notesOpen) && (
    <div
      style={dropdownStyle}
      className="rounded-xl border border-gray-100 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-800"
    >
      {open && (
        <div className="max-h-56 overflow-auto">
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSelect(s)}
              className={"flex w-full items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 " + (
                s === status
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400"
              )}
            >
              <span className="w-4 flex-shrink-0">
                {s === status && <Check size={12} />}
              </span>
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}

      {notesOpen && pendingStatus && (
        <div className="px-3 py-2">
          <p className="mb-1 text-[10px] font-semibold text-gray-400">
            Status: <span className="text-blue-600">{STATUS_LABELS[pendingStatus]}</span>
          </p>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Notas (opcional)..."
            rows={2}
            className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          />
          <div className="mt-1.5 flex gap-1.5">
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
  );

  return (
    <div ref={ref} className="relative inline-block">
      <button
        ref={btnRef}
        type="button"
        onClick={() => {
          if (notesOpen) {
            setNotesOpen(false);
          } else {
            setOpen(!open);
          }
        }}
        className={"inline-flex items-center justify-between gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide transition-all hover:opacity-80 w-[130px] " + colors}
      >
        {label}
        <ChevronDown size={10} className={"transition-transform " + (open ? "rotate-180" : "")} />
      </button>

      {dropdown}
    </div>
  );
}
