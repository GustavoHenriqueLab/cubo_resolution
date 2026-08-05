import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { startupId, userId } = (await request.json()) as {
      startupId?: string;
      userId?: string;
    };

    if (!startupId || !userId) {
      return NextResponse.json({ error: "startupId e userId sao obrigatorios" }, { status: 400 });
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

    if (!profile || (profile as { role: string }).role !== "admin") {
      return NextResponse.json({ error: "Apenas admin" }, { status: 403 });
    }

    const { data: existing } = await supabase
      .from("startup_users")
      .select("id")
      .eq("startup_id", startupId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("startup_users")
        .delete()
        .eq("id", (existing as { id: string }).id);
      return NextResponse.json({ assigned: false });
    } else {
      await supabase.from("startup_users").insert({
        startup_id: startupId,
        user_id: userId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      return NextResponse.json({ assigned: true });
    }
  } catch {
    return NextResponse.json({ error: "Erro ao processar atribuicao" }, { status: 500 });
  }
}
