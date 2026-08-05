"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Plus, X, Check, Users, Search } from "lucide-react";

interface UserInfo {
  id: string;
  nome: string;
}

interface Props {
  startupId: string;
  atribuidos: UserInfo[];
  todosUsuarios: UserInfo[];
}

export function AssignUsersCell({ startupId, atribuidos, todosUsuarios }: Props) {
  const [assigned, setAssigned] = useState<Set<string>>(
    new Set(atribuidos.map((u) => u.id))
  );
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setBusca("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open) setBusca("");
  }, [open]);

  const toggleUser = async (userId: string) => {
    setAssigned((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });

    try {
      await fetch("/api/startups/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startupId, userId }),
      });
    } catch {
      setAssigned(new Set(atribuidos.map((u) => u.id)));
    }
  };

  const assignedNames = useMemo(
    () =>
      todosUsuarios
        .filter((u) => assigned.has(u.id))
        .map((u) => u.nome),
    [todosUsuarios, assigned]
  );

  const filteredUsers = useMemo(() => {
    const termo = busca.toLowerCase();
    return todosUsuarios.filter(
      (u) => u.nome.toLowerCase().includes(termo)
    );
  }, [todosUsuarios, busca]);

  return (
    <div ref={ref} className="relative">
      <div className="flex flex-wrap items-center gap-1">
        {assignedNames.length > 0 ? (
          assignedNames.slice(0, 2).map((nome) => (
            <span
              key={nome}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
            >
              {nome}
            </span>
          ))
        ) : (
          <span className="text-[11px] text-slate-400 dark:text-slate-500">—</span>
        )}
        {assignedNames.length > 2 && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            +{assignedNames.length - 2}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(!open);
          }}
          className="inline-flex items-center justify-center rounded-full border border-dashed border-gray-300 p-0.5 text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-600 dark:border-gray-600 dark:hover:border-gray-400 dark:hover:text-gray-300"
          title="Atribuir pessoa"
        >
          <Plus size={12} />
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-xl border border-gray-100 bg-white py-1 shadow-xl animate-scale-in dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 dark:border-gray-700">
            <Users size={12} className="text-slate-400 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
              Atribuir pessoa
            </span>
          </div>

          {/* Search input */}
          <div className="border-b border-gray-100 px-2 py-1.5 dark:border-gray-700">
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar pessoa..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1 pl-7 pr-2 text-[11px] text-gray-700 placeholder-slate-400 outline-none focus:border-blue-400 focus:bg-white dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:border-blue-500 dark:focus:bg-gray-700"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="max-h-40 overflow-y-auto">
            {filteredUsers.map((u) => {
              const isAssigned = assigned.has(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleUser(u.id);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    isAssigned
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  <span className="flex h-4 w-4 items-center justify-center">
                    {isAssigned ? <Check size={12} /> : <span className="h-3 w-3 rounded-sm border border-gray-300 dark:border-gray-500" />}
                  </span>
                  {u.nome}
                </button>
              );
            })}
            {filteredUsers.length === 0 && (
              <p className="px-3 py-2 text-[11px] text-slate-400 dark:text-slate-500">
                {busca ? "Nenhuma pessoa encontrada." : "Nenhum usuario cadastrado."}
              </p>
            )}
          </div>

          {assignedNames.length > 0 && (
            <>
              <div className="border-t border-gray-100 dark:border-gray-700" />
              <div className="px-3 py-2">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Atribuidos ({assignedNames.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {assignedNames.map((nome) => (
                    <span
                      key={nome}
                      className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                    >
                      {nome}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const user = todosUsuarios.find((u) => u.nome === nome);
                          if (user) toggleUser(user.id);
                        }}
                        className="text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
