"use client";

import { useRef, useState } from "react";
import { handleRoleChange } from "./role-actions";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "viewer", label: "Viewer" },
] as const;

const ROLE_COLORS: Record<string, string> = {
  admin:
    "border-blue-200 bg-blue-100 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400",
  manager:
    "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400",
  viewer:
    "border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400",
};

export function RoleSelector({
  userId,
  currentRole,
  currentDepartamento,
}: {
  userId: string;
  currentRole: string;
  currentDepartamento: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [role, setRole] = useState(currentRole);
  const [erro, setErro] = useState("");

  const handleChange = (novo: string) => {
    setErro("");

    if (novo === "manager" && !currentDepartamento) {
      setErro("Defina o departamento antes de tornar gestor.");
      setRole(currentRole);
      return;
    }

    setRole(novo);
    formRef.current?.requestSubmit();
  };

  return (
    <div className="inline-flex flex-col gap-1">
      <form ref={formRef} action={handleRoleChange} className="inline-block">
        <input type="hidden" name="userId" value={userId} />
        <select
          name="role"
          value={role}
          onChange={(e) => handleChange(e.target.value)}
          className={
            "cursor-pointer rounded-full border py-0.5 pl-2.5 text-[11px] font-semibold transition-colors " +
            (ROLE_COLORS[role] ?? ROLE_COLORS.viewer)
          }
          style={{ paddingRight: "1.75rem" }}
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </form>

      {erro && (
        <span className="max-w-[190px] text-[10px] leading-tight text-red-600 dark:text-red-400">
          {erro}
        </span>
      )}
    </div>
  );
}
