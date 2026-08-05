import { redirect } from "next/navigation";
import Link from "next/link";
import {
  FileSearch,
  BrainCircuit,
  Trophy,
  Sparkles,
  Users,
  Package,
  LogOut,
  Clock,
  CheckCircle2,
  XCircle,
  CircleDot,
  Loader2,
  FileText,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPipelineExecutions, getCurrentProfile } from "@/lib/queries";
import { AdminPipelineCards } from "./admin-pipeline-cards";

export default async function AdminPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "admin") {
    redirect("/");
  }

  const executions = await getPipelineExecutions(20);

  const stats = await getStats();

  return (
    <div className="mx-auto w-full max-w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:max-w-[80rem]">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            <span className="text-gradient-brand">Admin</span>
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Gerenciamento de pipelines e usuarios.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/usuarios"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Users size={16} />
            Usuarios
          </Link>
          <Link
            href="/admin/startups"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Package size={16} />
            Startups
          </Link>
          <Link
            href="/admin/propostas"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <FileText size={16} />
            Propostas
          </Link>
          <form action="/api/auth/signout" method="post">
            <button className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
              <LogOut size={16} />
              Sair
            </button>
          </form>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FileSearch}
          label="Startups"
          value={stats.totalStartups}
          color="blue"
        />
        <StatCard
          icon={BrainCircuit}
          label="Classificados"
          value={stats.classified}
          color="green"
        />
        <StatCard
          icon={Trophy}
          label="Destaques LAB"
          value={stats.destaques}
          color="amber"
        />
        <StatCard
          icon={Users}
          label="Usuarios"
          value={stats.users}
          color="purple"
        />
      </div>

      <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Pipelines
        </h2>
        <AdminPipelineCards />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Historico de Execucoes
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 text-xs font-semibold uppercase text-slate-400 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Inicio</th>
                <th className="px-6 py-3">Termino</th>
                <th className="px-6 py-3">Disparado por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {executions.map((exec) => (
                  <tr key={exec.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-3 font-medium text-gray-700 dark:text-gray-300">
                      <span className="inline-flex items-center gap-1.5">
                        {getPipelineIcon(exec.type)}
                        {exec.type}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={exec.status} />
                    </td>
                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                      {exec.started_at ? new Date(exec.started_at).toLocaleString("pt-BR") : "—"}
                    </td>
                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                      {exec.completed_at ? new Date(exec.completed_at).toLocaleString("pt-BR") : "—"}
                    </td>
                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                      {exec.triggered_by ?? "—"}
                    </td>
                  </tr>
              ))}
              {executions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    Nenhuma execucao registrada.
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

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof FileSearch;
  label: string;
  value: number;
  color: "blue" | "green" | "amber" | "purple";
}) {
  const colors = {
    blue: "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400",
    green:
      "border-green-200 bg-green-50 text-green-600 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400",
    amber:
      "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400",
    purple:
      "border-purple-200 bg-purple-50 text-purple-600 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-400",
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-2.5 ${colors[color]}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          <p className="text-xs text-slate-400 dark:text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: typeof CheckCircle2; label: string; className: string }> = {
    pending: {
      icon: Clock,
      label: "Pendente",
      className:
        "border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400",
    },
    running: {
      icon: Loader2,
      label: "Executando",
      className:
        "border-blue-200 bg-blue-100 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400",
    },
    completed: {
      icon: CheckCircle2,
      label: "Concluido",
      className:
        "border-green-200 bg-green-100 text-green-600 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400",
    },
    failed: {
      icon: XCircle,
      label: "Falhou",
      className:
        "border-red-200 bg-red-100 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400",
    },
  };

  const c = config[status] ?? config.pending;
  const Icon = c.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${c.className}`}
    >
      <Icon size={12} className={status === "running" ? "animate-spin" : ""} />
      {c.label}
    </span>
  );
}

function getPipelineIcon(type: string) {
  const icons: Record<string, typeof FileSearch> = {
    scraper: FileSearch,
    classifier: BrainCircuit,
    ranker: Trophy,
    destaques: Sparkles,
  };
  const Icon = icons[type] ?? CircleDot;
  return <Icon size={14} className="text-slate-400" />;
}

async function getStats() {
  const supabase = await createClient();

  const [{ count: totalStartups }, { count: classified }, { count: destaques }, { count: users }] =
    await Promise.all([
      supabase.from("startups").select("*", { count: "exact", head: true }),
      supabase.from("startup_departamentos").select("startup_id", { count: "exact", head: true }),
      supabase.from("destaques_lab").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
    ]);

  return {
    totalStartups: totalStartups ?? 0,
    classified: classified ?? 0,
    destaques: destaques ?? 0,
    users: users ?? 0,
  };
}
