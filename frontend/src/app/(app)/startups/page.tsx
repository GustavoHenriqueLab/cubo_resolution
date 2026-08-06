import { getTodasStartups, getDepartamentos, getStartupFavorites } from "@/lib/queries";
import { StartupsClient } from "./startups-client";

export default async function StartupsPage() {
  const [todas, departamentos, favorites] = await Promise.all([
    getTodasStartups(),
    getDepartamentos(),
    getStartupFavorites(),
  ]);

  const segmentosDisponiveis = [...new Set(todas.map((s) => s.segmento).filter((s) => s && s !== "N/I"))].sort();
  const tecnologiasDisponiveis = [...new Set(todas.flatMap((s) => s.tecnologias))].sort();
  const destaques = todas.filter((s) => s.rank != null).map((s) => s.nome);

  return (
    <StartupsClient
      todas={todas}
      segmentosDisponiveis={segmentosDisponiveis}
      tecnologiasDisponiveis={tecnologiasDisponiveis}
      departamentos={departamentos}
      destaques={destaques}
      initialFavorites={Array.from(favorites)}
    />
  );
}
