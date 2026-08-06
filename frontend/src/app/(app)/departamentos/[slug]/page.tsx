import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getDepartamentoPorSlug, getStartupsPorDepartamento, getDepartamentos } from "@/lib/queries";
import { DepartamentoSelector } from "@/components/departamento-selector";
import { DepartamentoClient } from "../departamento-client";

export default async function DepartamentoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [departamento, startups, todosDepartamentos] = await Promise.all([
    getDepartamentoPorSlug(slug),
    getStartupsPorDepartamento(slug),
    getDepartamentos(),
  ]);

  if (!departamento) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:max-w-[80rem]">
      <Link
        href="/"
        prefetch={false}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
      >
        <ChevronLeft size={16} />
        Departamentos
      </Link>

      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            <span className="text-gradient-brand">{departamento.nome}</span>
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {departamento.descricao}
          </p>
        </div>

        <div className="w-full sm:w-64 shrink-0">
          <DepartamentoSelector
            departamentos={todosDepartamentos}
            slugAtual={slug}
          />
        </div>
      </div>

      <DepartamentoClient departamento={departamento} startups={startups} />
    </div>
  );
}
