"use client";

import { AlertTriangle } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-6 py-16 text-center lg:px-10">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50 dark:bg-red-500/10">
        <AlertTriangle size={36} className="text-red-500" />
      </div>
      <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100">
        Erro inesperado
      </h1>
      <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
        {error.message || "Ocorreu um erro ao carregar a pagina."}
      </p>
      <button
        onClick={reset}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-blue-glow transition-all hover:shadow-blue-glow-lg"
      >
        Tentar novamente
      </button>
    </div>
  );
}
