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
    const { descricao } = body;

    if (typeof descricao !== "string") {
      return NextResponse.json({ error: "Descricao invalida" }, { status: 400 });
    }

    const { error } = await (supabase as any)
      .from("parcerias")
      .update({ descricao, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
