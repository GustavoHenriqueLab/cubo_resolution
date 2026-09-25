import { getCurrentProfile, getPropostasUsuario, getPropostasGestor } from "@/lib/queries";
import { PropostasUsuarioClient } from "./propostas-usuario-client";

export default async function PropostasPage() {
  const profile = await getCurrentProfile();
  const isManager = profile?.role === "manager";

  const [propostas, gestorPropostas] = await Promise.all([
    getPropostasUsuario(),
    isManager ? getPropostasGestor() : Promise.resolve([]),
  ]);

  return (
    <PropostasUsuarioClient
      propostas={propostas}
      gestorPropostas={gestorPropostas}
      isManager={isManager}
    />
  );
}
