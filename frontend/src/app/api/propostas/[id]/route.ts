import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const { id } = await params;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("propostas")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Proposta nao encontrada." }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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

    if (!status || !["pendente", "em_tratativas", "em_poc", "aprovada", "rejeitada", "cancelada", "finalizado"].includes(status)) {
      return NextResponse.json({ error: "Status invalido" }, { status: 400 });
    }

    if (!notas || notas.trim().length === 0) {
      return NextResponse.json({ error: "Motivo/notas e obrigatorio." }, { status: 400 });
    }

    const { data: current } = await (supabase as any)
      .from("propostas")
      .select("status")
      .eq("id", id)
      .maybeSingle();

    if (!current) {
      return NextResponse.json({ error: "Proposta nao encontrada." }, { status: 404 });
    }

    const statusAnterior = (current as { status: string }).status;

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

    await (supabase as any)
      .from("proposta_status_log")
      .insert({
        proposta_id: id,
        admin_id: user.id,
        status_anterior: statusAnterior,
        status_novo: status,
        notas: notas.trim(),
      });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[propostas] Unexpected error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
