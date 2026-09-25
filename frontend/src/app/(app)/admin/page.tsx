import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Package,
  LogOut,
  Workflow,
  Handshake,
} from "lucide-react";
import { getPropostasAdmin, getCurrentProfile } from "@/lib/queries";
import { AdminPropostasClient } from "./admin-propostas-client";

export default async function AdminPage() {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "admin") {
    redirect("/");
  }

  const propostas = await getPropostasAdmin();

  return (
    <div className="mx-auto w-full max-w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:max-w-[80rem]">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            <span className="text-gradient-brand">Admin</span>
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Gerenciamento de propostas e usuarios.
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
            href="/admin/pipelines"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Workflow size={16} />
            Pipelines
          </Link>
          <Link
            href="/admin/parcerias"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Handshake size={16} />
            Parcerias
          </Link>
          <form action="/api/auth/signout" method="post">
            <button className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
              <LogOut size={16} />
              Sair
            </button>
          </form>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Propostas
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Propostas de integracao enviadas pelos usuarios.
        </p>
      </div>

      <AdminPropostasClient propostas={propostas} />
    </div>
  );
}
