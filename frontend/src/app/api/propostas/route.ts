import { NextRequest, NextResponse } from "next/server";
import { submitProposta } from "@/lib/queries";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startupId, departamentoSlug, tipoIntegracao, justificativa, beneficios } = body;

    if (!startupId || !tipoIntegracao || !justificativa || justificativa.length < 50) {
      return NextResponse.json(
        { error: "Campos obrigatorios faltando. Justificativa precisa ter no minimo 50 caracteres." },
        { status: 400 },
      );
    }

    if (!beneficios || !Array.isArray(beneficios) || beneficios.length === 0) {
      return NextResponse.json(
        { error: "Adicione pelo menos um beneficio." },
        { status: 400 },
      );
    }

    const id = await submitProposta({
      startupId,
      departamentoSlug: departamentoSlug || null,
      tipoIntegracao,
      justificativa,
      beneficios,
    });

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    if (err.message === "Nao autenticado") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
