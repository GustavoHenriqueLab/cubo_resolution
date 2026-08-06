import { NextResponse } from "next/server";
import { updateStartupStatus } from "@/lib/queries";
import type { StartupStatus } from "@/lib/types";

const VALID_STATUSES: StartupStatus[] = [
  "a_contatar",
  "em_contato",
  "parceiro",
];

export async function POST(request: Request) {
  try {
    const { startupId, status, notas } = (await request.json()) as {
      startupId?: string;
      status?: string;
      notas?: string;
    };

    if (!startupId || !status) {
      return NextResponse.json(
        { error: "startupId e status sao obrigatorios" },
        { status: 400 },
      );
    }

    if (!VALID_STATUSES.includes(status as StartupStatus)) {
      return NextResponse.json(
        { error: "Status invalido" },
        { status: 400 },
      );
    }

    const ok = await updateStartupStatus(
      startupId,
      status as StartupStatus,
      notas?.trim() || "",
    );

    if (!ok) {
      return NextResponse.json(
        { error: "Sem permissao ou startup nao encontrada" },
        { status: 403 },
      );
    }

    return NextResponse.json({ success: true, status });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar status" }, { status: 500 });
  }
}
