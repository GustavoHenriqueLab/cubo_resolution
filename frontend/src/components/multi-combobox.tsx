"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, X } from "lucide-react";

interface Props {
  options: { value: string; label: string }[];
  values: string[];
  placeholder?: string;
  onChange: (values: string[]) => void;
}

export function MultiCombobox({ options, values, placeholder = "Selecionar...", onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const calcPosition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = 260;
    const openAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    setDropdownStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      top: openAbove ? rect.top - 8 : rect.bottom + 4,
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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        ref.current && !ref.current.contains(target) &&
        portalRef.current && !portalRef.current.contains(target)
      ) {
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

  const dropdown = open && (
    <div
      ref={portalRef}
      style={dropdownStyle}
      className="max-h-60 overflow-auto rounded-xl border border-gray-100 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-800"
    >
      {options.map((opt) => {
        const isSelected = values.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggle(opt.value);
            }}
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
  );

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
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

      {mounted ? createPortal(dropdown, document.body) : null}
    </div>
  );
}
