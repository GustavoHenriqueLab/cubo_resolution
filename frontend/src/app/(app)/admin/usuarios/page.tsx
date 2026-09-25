import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield, User, UserCog } from "lucide-react";
import { getProfiles, getCurrentProfile } from "@/lib/queries";
import { DepartmentSelector } from "@/components/department-selector";
import { RoleSelector } from "@/components/role-selector";

const ROLE_ICONS: Record<string, React.ReactNode> = {
  admin: <Shield size={14} className="text-blue-500" />,
  manager: <UserCog size={14} className="text-amber-500" />,
  viewer: <User size={14} className="text-gray-400" />,
};

export default async function AdminUsuariosPage() {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "admin") {
    redirect("/");
  }

  const profiles = await getProfiles();

  return (
    <div className="mx-auto w-full max-w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:max-w-[80rem]">
      <Link
        href="/admin"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
      >
        <ArrowLeft size={16} />
        Admin
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          <span className="text-gradient-brand">Usuarios</span>
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Gerencie os usuarios e permissoes do FlowLab.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 text-xs font-semibold uppercase text-slate-400 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3">Nome</th>
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Departamento</th>
                <th className="px-6 py-3">Criado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {profiles.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-3 font-medium text-gray-700 dark:text-gray-300">
                    <div className="flex items-center gap-2">
                      {ROLE_ICONS[p.role] ?? ROLE_ICONS.viewer}
                      {p.nome ?? "—"}
                    </div>
                  </td>
                  <td className="px-6 py-3 font-mono text-xs text-gray-400 dark:text-gray-500">
                    {p.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-3">
                    <RoleSelector
                      key={`${p.id}-${p.role}`}
                      userId={p.id}
                      currentRole={p.role}
                      currentDepartamento={p.departamento_slug ?? null}
                    />
                  </td>
                  <td className="px-6 py-3">
                    <DepartmentSelector
                      userId={p.id}
                      currentDepto={p.departamento_slug ?? null}
                      bloquearNenhum={p.role === "manager"}
                    />
                  </td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                    {new Date(p.created_at).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
              {profiles.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    Nenhum usuario cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
