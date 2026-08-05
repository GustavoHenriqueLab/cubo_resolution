import { getPropostasUsuario } from "@/lib/queries";
import { PropostasUsuarioClient } from "./propostas-usuario-client";

export default async function PropostasPage() {
  const propostas = await getPropostasUsuario();

  return (
    <PropostasUsuarioClient propostas={propostas} />
  );
}
