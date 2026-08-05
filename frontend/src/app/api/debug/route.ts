import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    const { data: sessionData } = await supabase.auth.getSession();
    return NextResponse.json({
      authenticated: false,
      hasSession: !!sessionData.session,
      user: null,
      hint: "Nao autenticado - faca login primeiro",
    });
  }

  const { data: startups, error: errStartups } = await supabase
    .from("startups")
    .select("nome")
    .limit(5);

  const { data: deptos, error: errDeptos } = await supabase
    .from("departamentos")
    .select("slug, nome")
    .limit(5);

  const { count } = await supabase
    .from("startups")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({
    authenticated: true,
    user: { id: authData.user.id, email: authData.user.email },
    startups_sample: startups,
    startups_error: errStartups?.message ?? null,
    startups_count: count,
    deptos_sample: deptos,
    deptos_error: errDeptos?.message ?? null,
  });
}
