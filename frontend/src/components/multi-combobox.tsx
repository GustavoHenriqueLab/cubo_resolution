"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, X } from "lucide-react";

interface Props {
  options: { value: string; label: string }[];
  values: string[];
  placeholder?: string;
  onChange: (values: string[]) => void;
}

export function MultiCombobox({ options, values, placeholder = "Selecionar...", onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = options.filter((o) => values.includes(o.value));

  function toggle(v: string) {
    if (values.includes(v)) {
      onChange(values.filter((x) => x !== v));
    } else {
      onChange([...values, v]);
    }
  }

  function clearAll() {
    onChange([]);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full min-h-[42px] items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2.5 text-left text-sm outline-none transition-all dark:bg-gray-800 ${
          values.length > 0
            ? "border-blue-400 ring-1 ring-blue-500/30 dark:border-blue-400"
            : "border-slate-300 hover:border-slate-400 dark:border-gray-600 dark:hover:border-gray-500"
        } focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:focus:border-blue-400 dark:focus:ring-blue-400/20`}
      >
        <span className="flex flex-1 flex-wrap gap-1">
          {values.length === 0 && (
            <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>
          )}
          {selected.slice(0, 2).map((s) => (
            <span
              key={s.value}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
            >
              {s.label}
            </span>
          ))}
          {selected.length > 2 && (
            <span className="inline-flex items-center rounded-lg bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
              +{selected.length - 2}
            </span>
          )}
        </span>

        <div className="flex shrink-0 items-center gap-1">
          {values.length > 0 && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                clearAll();
              }}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-60 overflow-auto rounded-xl border border-gray-100 bg-white py-1 shadow-lg animate-scale-in dark:border-gray-700 dark:bg-gray-800">
          {options.map((opt) => {
            const isSelected = values.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                    : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                    isSelected
                      ? "border-blue-500 bg-blue-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {isSelected && <Check size={10} className="text-white" />}
                </span>
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
