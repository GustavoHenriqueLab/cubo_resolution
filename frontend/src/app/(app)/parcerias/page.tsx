import { getParcerias } from "@/lib/queries";
import { ParceriasClient } from "./parcerias-client";

export default async function ParceriasPage() {
  const parcerias = await getParcerias();

  return (
    <div className="mx-auto w-full max-w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:max-w-[80rem]">
      <div className="mb-10">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          <span className="text-gradient-brand">Parcerias</span>
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Startups parceiras do LAB com projetos realizados.
        </p>
      </div>

      <ParceriasClient parcerias={parcerias} />
    </div>
  );
}
