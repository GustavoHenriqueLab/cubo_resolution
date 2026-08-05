"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
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
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        ref.current && !ref.current.contains(target) &&
        portalRef.current && !portalRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const calcPosition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = 280;
    const openAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    setDropdownStyle({
      position: "fixed",
      left: rect.left,
      width: 160,
      top: openAbove ? rect.top - 4 : rect.bottom + 4,
      transform: openAbove ? "translateY(-100%)" : undefined,
      zIndex: 9999,
    });
  }, []);

  useEffect(() => {
    if (open) {
      calcPosition();
      window.addEventListener("scroll", calcPosition, true);
      window.addEventListener("resize", calcPosition);
    }
    return () => {
      window.removeEventListener("scroll", calcPosition, true);
      window.removeEventListener("resize", calcPosition);
    };
  }, [open, calcPosition]);

  const handleSelect = async (newStatus: StartupStatus) => {
    if (newStatus === status) {
      setOpen(false);
      return;
    }
    const previous = status;
    setStatus(newStatus);
    onStatusChange(startupId, newStatus);
    setOpen(false);

    try {
      const res = await fetch("/api/startups/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startupId, status: newStatus }),
      });

      if (!res.ok) {
        setStatus(previous);
        onStatusChange(startupId, previous);
      }
    } catch {
      setStatus(previous);
      onStatusChange(startupId, previous);
    }
  };

  const label = STATUS_LABELS[status] ?? status;
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.a_contatar;

  const dropdown = open && (
    <div
      ref={portalRef}
      style={dropdownStyle}
      className="max-h-72 overflow-auto rounded-xl border border-gray-100 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-800"
    >
      {STATUS_ORDER.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => handleSelect(s)}
          className={`flex w-full items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
            s === status
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-600 dark:text-gray-400"
          }`}
        >
          <span className="w-4 flex-shrink-0">
            {s === status && <Check size={12} />}
          </span>
          {STATUS_LABELS[s]}
        </button>
      ))}
    </div>
  );

  return (
    <div ref={ref} className="relative inline-block">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center justify-between gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide transition-all hover:opacity-80 w-[130px] ${colors}`}
      >
        {label}
        <ChevronDown size={10} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {mounted ? createPortal(dropdown, document.body) : null}
    </div>
  );
}
