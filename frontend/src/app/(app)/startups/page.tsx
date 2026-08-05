import { getTodasStartups, getSegmentos, getTecnologias, getDepartamentos, getDestaqueLab } from "@/lib/queries";
import { StartupsClient } from "./startups-client";

export default async function StartupsPage() {
  const [todas, segmentosDisponiveis, tecnologiasDisponiveis, departamentos, destaques] =
    await Promise.all([
      getTodasStartups(),
      getSegmentos(),
      getTecnologias(),
      getDepartamentos(),
      getDestaqueLab(),
    ]);

  return (
    <StartupsClient
      todas={todas}
      segmentosDisponiveis={segmentosDisponiveis}
      tecnologiasDisponiveis={tecnologiasDisponiveis}
      departamentos={departamentos}
      destaques={destaques}
    />
  );
}
