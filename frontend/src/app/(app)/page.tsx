import { getDepartamentos, getTodasStartups } from "@/lib/queries";
import { HomeClient } from "./home-client";

export default async function HomePage() {
  const [departamentos, todas] = await Promise.all([
    getDepartamentos(),
    getTodasStartups(),
  ]);

  let dataMaisRecente = "";
  for (const s of todas) {
    if (s.data_adicionado && s.data_adicionado > dataMaisRecente) {
      dataMaisRecente = s.data_adicionado;
    }
  }

  const novidades = todas
    .filter((s) => s.data_adicionado === dataMaisRecente)
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return <HomeClient departamentos={departamentos} novidades={novidades} />;
}
