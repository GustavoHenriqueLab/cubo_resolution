"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { DEPARTAMENTOS } from "@/lib/constants";
import { handleDepartmentChange } from "./department-actions";

const DEPTO_ENTRIES = Object.entries(DEPARTAMENTOS).sort(([, a], [, b]) =>
  a.localeCompare(b),
);

interface Props {
  userId: string;
  currentDepto: string | null;
}

export function DepartmentSelector({ userId, currentDepto }: Props) {
  const [selected, setSelected] = useState<string | null>(currentDepto);
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

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

  const handleSelect = (slug: string | null) => {
    setSelected(slug);
    setOpen(false);

    if (!formRef.current) return;
    const deptoInput = formRef.current.querySelector(
      'input[name="departamento"]',
    ) as HTMLInputElement;
    const uidInput = formRef.current.querySelector(
      'input[name="userId"]',
    ) as HTMLInputElement;
    if (deptoInput) deptoInput.value = slug ?? "";
    if (uidInput) uidInput.value = userId;
    formRef.current.requestSubmit();
  };

  const label = selected
    ? (DEPARTAMENTOS[selected] ?? selected)
    : "Nenhum";

  const dropdown = open && (
    <div
      ref={portalRef}
      style={dropdownStyle}
      className="max-h-72 overflow-auto rounded-xl border border-gray-100 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-800"
    >
      <button
        type="button"
        onClick={() => handleSelect(null)}
        className={`flex w-full items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
          selected === null
            ? "text-blue-600 dark:text-blue-400"
            : "text-gray-600 dark:text-gray-400"
        }`}
      >
        <span className="w-4 flex-shrink-0">
          {selected === null && <Check size={12} />}
        </span>
        Nenhum
      </button>
      {DEPTO_ENTRIES.map(([slug, nome]) => (
        <button
          key={slug}
          type="button"
          onClick={() => handleSelect(slug)}
          className={`flex w-full items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
            slug === selected
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-600 dark:text-gray-400"
          }`}
        >
          <span className="w-4 flex-shrink-0">
            {slug === selected && <Check size={12} />}
          </span>
          {nome}
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
        className="inline-flex items-center justify-between gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-gray-600 transition-all hover:border-blue-300 hover:text-blue-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-400 w-[130px]"
      >
        {label}
        <ChevronDown
          size={10}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <form
        ref={formRef}
        action={handleDepartmentChange}
        className="hidden"
      >
        <input type="hidden" name="departamento" defaultValue={currentDepto ?? ""} />
        <input type="hidden" name="userId" defaultValue={userId} />
      </form>

      {mounted ? createPortal(dropdown, document.body) : null}
    </div>
  );
}
