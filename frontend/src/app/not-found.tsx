import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-6 py-16 text-center lg:px-10">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gray-100 dark:bg-gray-800">
        <FileQuestion size={36} className="text-gray-400 dark:text-gray-500" />
      </div>
      <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100">
        Pagina nao encontrada
      </h1>
      <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
        O recurso que voce procura nao existe ou foi removido.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-blue-glow transition-all hover:shadow-blue-glow-lg"
      >
        Voltar ao inicio
      </Link>
    </div>
  );
}
