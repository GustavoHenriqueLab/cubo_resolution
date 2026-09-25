import { NextRequest, NextResponse } from "next/server";
import { submitProposta } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      startupId,
      departamentoSlug,
      tipoIntegracao,
      justificativa,
      beneficios,
      gestorId,
    } = body;

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

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = (profile as { role?: string } | null)?.role ?? "viewer";
    const gestor = gestorId ? String(gestorId) : null;

    if (gestor) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: gestores } = await (supabase as any).rpc("listar_gestores");
      const ids = new Set(
        ((gestores ?? []) as { id: string }[]).map((g) => g.id),
      );
      if (!ids.has(gestor)) {
        return NextResponse.json({ error: "Gestor invalido." }, { status: 400 });
      }
    } else if (role === "viewer") {
      return NextResponse.json(
        { error: "Selecione o gestor que vai receber a proposta." },
        { status: 400 },
      );
    }

    const id = await submitProposta({
      startupId,
      departamentoSlug: departamentoSlug || null,
      tipoIntegracao,
      justificativa,
      beneficios,
      gestorId: gestor,
    });

    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao enviar proposta";
    if (message === "Nao autenticado") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
