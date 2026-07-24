import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getDepartamentoPorSlug, getStartupsPorDepartamento, getDepartamentos } from "@/lib/data";
import { ConfiancaBadge } from "@/components/confianca-badge";
import { StartupTable } from "@/components/startup-table";
import { DepartamentoSelector } from "@/components/departamento-selector";

export async function generateStaticParams() {
  const { DEPARTAMENTOS } = await import("@/lib/constants");
  return Object.keys(DEPARTAMENTOS).map((slug) => ({ slug }));
}

export default async function DepartamentoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const departamento = getDepartamentoPorSlug(slug);

  if (!departamento) {
    notFound();
  }

  const startups = getStartupsPorDepartamento(slug);
  const todosDepartamentos = getDepartamentos();

  return (
    <div className="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
      >
        <ChevronLeft size={16} />
        Departamentos
      </Link>

      {/* Hero + Selector */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">
            <span className="text-gradient-brand">{departamento.nome}</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            {departamento.descricao}
          </p>
        </div>

        <DepartamentoSelector
          departamentos={todosDepartamentos}
          slugAtual={slug}
        />
      </div>

      {/* Stats badges */}
      <div className="mb-10 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-4 py-2.5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <ConfiancaBadge confianca="alta" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {departamento.altaConfianca}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-4 py-2.5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <ConfiancaBadge confianca="media" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {departamento.mediaConfianca}
          </span>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          Total: {departamento.totalStartups} startups
        </div>
      </div>

      {/* Startups */}
      <StartupTable startups={startups} />
    </div>
  );
}
