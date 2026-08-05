import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const profile = data as { role: string } | null;

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const { data: executions } = await supabase
    .from("pipeline_executions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json(executions ?? []);
}
