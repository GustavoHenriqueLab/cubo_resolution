import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || (profile as { role: string }).role !== "admin") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, notas } = body;

    if (!status || !["pendente", "aprovada", "rejeitada"].includes(status)) {
      return NextResponse.json({ error: "Status invalido" }, { status: 400 });
    }

    if (!notas || notas.trim().length === 0) {
      return NextResponse.json({ error: "Motivo/notas e obrigatorio." }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error, data } = await (supabase as any)
      .from("propostas")
      .update({
        status,
        admin_notas: notas,
        admin_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*");

    if (error) {
      console.error("[propostas] Update error:", error);
      return NextResponse.json({ error: error.message || "Erro ao atualizar" }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Proposta nao encontrada ou acesso negado (RLS)." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[propostas] Unexpected error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
