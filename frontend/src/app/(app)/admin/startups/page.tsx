import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentProfile, getAdminStartups } from "@/lib/queries";
import { AdminStartupsClient } from "./admin-startups-client";

export default async function AdminStartupsPage() {
  const [profile, startups] = await Promise.all([
    getCurrentProfile(),
    getAdminStartups(),
  ]);

  if (!profile || profile.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="mx-auto w-full max-w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:max-w-[80rem]">
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/admin"
          className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-gray-100 hover:text-slate-600 dark:hover:bg-gray-800 dark:hover:text-slate-300"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            <span className="text-gradient-brand">Gerenciar Startups</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Altere o status e atribua usuarios do sistema as startups.
          </p>
        </div>
      </div>

      <AdminStartupsClient startups={startups} />
    </div>
  );
}
