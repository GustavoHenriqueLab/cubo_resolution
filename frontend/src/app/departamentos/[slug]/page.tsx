import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getDepartamentoPorSlug, getStartupsPorDepartamento, getDepartamentos } from "@/lib/data";
import { DepartamentoSelector } from "@/components/departamento-selector";
import { DepartamentoClient } from "../departamento-client";

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
    <div className="mx-auto w-full max-w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:max-w-[80rem]">
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

      {/* Stats + Startups */}
      <DepartamentoClient departamento={departamento} startups={startups} />
    </div>
  );
}
