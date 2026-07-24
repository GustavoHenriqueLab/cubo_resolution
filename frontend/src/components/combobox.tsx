"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, X } from "lucide-react";

interface Props {
  options: { value: string; label: string }[];
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

export function Combobox({ options, value, placeholder = "Selecionar...", onChange }: Props) {
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

  const selected = options.find((o) => o.value === value);
  const isActive = value !== "";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2.5 text-left text-sm outline-none transition-all dark:bg-gray-800 ${
          isActive
            ? "border-blue-400 text-gray-700 ring-1 ring-blue-500/30 dark:border-blue-400 dark:text-gray-200"
            : "border-slate-300 text-gray-500 hover:border-slate-400 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500"
        } focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:focus:border-blue-400 dark:focus:ring-blue-400/20`}
      >
        <span className={`truncate ${!isActive ? "" : "text-gray-700 dark:text-gray-300"}`}>
          {isActive ? selected?.label : placeholder}
        </span>

        <div className="flex items-center gap-1">
          {isActive && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown
            size={16}
            className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-60 overflow-auto rounded-xl border border-gray-100 bg-white py-1 shadow-lg animate-scale-in dark:border-gray-700 dark:bg-gray-800">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value === value ? "" : opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                    : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                <Check size={14} className={`shrink-0 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
