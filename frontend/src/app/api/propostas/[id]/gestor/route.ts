import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TIPOS = ["poc", "parceria", "contratacao", "outro"];

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function registrarLog(
  supabase: SupabaseServerClient,
  propostaId: string,
  autorId: string,
  statusAnterior: string,
  statusNovo: string,
  notas: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("proposta_status_log").insert({
    proposta_id: propostaId,
    admin_id: autorId,
    status_anterior: statusAnterior,
    status_novo: statusNovo,
    notas,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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

    if ((profile as { role?: string } | null)?.role !== "manager") {
      return NextResponse.json({ error: "Apenas gestor" }, { status: 403 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: current } = await (supabase as any)
      .from("propostas")
      .select("status, gestor_id, gestor_status")
      .eq("id", id)
      .maybeSingle();

    if (!current) {
      return NextResponse.json({ error: "Proposta nao encontrada." }, { status: 404 });
    }

    const proposta = current as {
      status: string;
      gestor_id: string | null;
      gestor_status: string;
    };

    if (proposta.gestor_id !== user.id) {
      return NextResponse.json(
        { error: "Voce nao e o gestor desta proposta." },
        { status: 403 },
      );
    }

    if (proposta.gestor_status !== "pendente") {
      return NextResponse.json(
        { error: "Esta proposta ja foi analisada." },
        { status: 409 },
      );
    }

    const body = await request.json();
    const acao = body.acao as string;
    const agora = new Date().toISOString();

    if (acao === "editar") {
      const { tipoIntegracao, departamentoSlug, beneficios, justificativa } = body;

      if (!tipoIntegracao || !TIPOS.includes(tipoIntegracao)) {
        return NextResponse.json({ error: "Tipo de integracao invalido." }, { status: 400 });
      }
      if (!justificativa || justificativa.trim().length < 50) {
        return NextResponse.json(
          { error: "Justificativa precisa ter no minimo 50 caracteres." },
          { status: 400 },
        );
      }
      if (!beneficios || !Array.isArray(beneficios) || beneficios.length === 0) {
        return NextResponse.json(
          { error: "Adicione pelo menos um beneficio." },
          { status: 400 },
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error, data } = await (supabase as any)
        .from("propostas")
        .update({
          tipo_integracao: tipoIntegracao,
          departamento_slug: departamentoSlug || null,
          beneficios,
          justificativa,
          updated_at: agora,
        })
        .eq("id", id)
        .select("id");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (!data || data.length === 0) {
        return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
      }

      await registrarLog(
        supabase,
        id,
        user.id,
        proposta.status,
        proposta.status,
        "Proposta ajustada pelo gestor.",
      );

      return NextResponse.json({ success: true });
    }

    if (acao === "aprovar") {
      const notas = ((body.notas as string | undefined) ?? "").trim();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error, data } = await (supabase as any)
        .from("propostas")
        .update({
          gestor_status: "aprovada",
          gestor_notas: notas || null,
          updated_at: agora,
        })
        .eq("id", id)
        .select("id");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (!data || data.length === 0) {
        return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
      }

      await registrarLog(
        supabase,
        id,
        user.id,
        proposta.status,
        proposta.status,
        "Aprovada pelo gestor e encaminhada ao admin." + (notas ? ` ${notas}` : ""),
      );

      return NextResponse.json({ success: true });
    }

    if (acao === "recusar") {
      const notas = ((body.notas as string | undefined) ?? "").trim();

      if (notas.length < 10) {
        return NextResponse.json(
          { error: "Informe o motivo da recusa (min. 10 caracteres)." },
          { status: 400 },
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error, data } = await (supabase as any)
        .from("propostas")
        .update({
          gestor_status: "rejeitada",
          gestor_notas: notas,
          status: "rejeitada",
          updated_at: agora,
        })
        .eq("id", id)
        .select("id");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (!data || data.length === 0) {
        return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
      }

      await registrarLog(supabase, id, user.id, proposta.status, "rejeitada", notas);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao processar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
