import { getTodasStartups, getSegmentos, getTecnologias, getDepartamentos, getDestaqueLab } from "@/lib/data";
import { StartupsClient } from "./startups-client";

export default function StartupsPage() {
  const todas = getTodasStartups();
  const segmentosDisponiveis = getSegmentos();
  const tecnologiasDisponiveis = getTecnologias();
  const departamentos = getDepartamentos();
  const destaques = getDestaqueLab();

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
