import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { spawnPipeline } from "@/lib/pipeline-executor";

export async function POST(request: NextRequest) {
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

  const { error } = await supabase.from("pipeline_executions").insert({
    type: "classifier",
    status: "pending",
    triggered_by: user.id,
  } as any);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  spawnPipeline("classifier");

  return NextResponse.json({ success: true });
}
