"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/types";
import type { StartupStatus } from "@/lib/types";

interface Props {
  currentStatus: StartupStatus;
  onStatusChange: (status: StartupStatus) => void;
}

export function StatusSelector({ currentStatus, onStatusChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (status: StartupStatus) => {
    if (status !== currentStatus) {
      onStatusChange(status);
    }
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
      >
        Alterar status
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-xl border border-gray-100 bg-white py-1 shadow-xl animate-scale-in dark:border-gray-700 dark:bg-gray-800">
          {STATUS_ORDER.map((status) => (
            <button
              key={status}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(status);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                status === currentStatus
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              <span className="w-4 flex-shrink-0">
                {status === currentStatus && <Check size={14} />}
              </span>
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
