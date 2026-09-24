import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createFlowlabClient } from "@/lib/supabase/flowlab";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

const ERRO_CREDENCIAIS =
  "Email ou senha incorretos. Verifique suas credenciais e tente novamente.";
const ERRO_EMAIL_NAO_CONFIRMADO =
  "Por favor, confirme seu email antes de fazer login.";
const ERRO_NAO_CONFIGURADO =
  "Login nao configurado. Contate o administrador.";
const ERRO_SESSAO = "Nao foi possivel iniciar a sessao. Tente novamente.";

function loginConfigurado() {
  return Boolean(
    process.env.FLOWLAB_SUPABASE_URL &&
      process.env.FLOWLAB_SUPABASE_ANON_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

async function encontrarUsuarioPorEmail(
  admin: SupabaseClient<Database>,
  email: string,
) {
  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;

    const usuarios = data?.users ?? [];
    const encontrado = usuarios.find(
      (u) => (u.email ?? "").toLowerCase() === email,
    );
    if (encontrado) return encontrado;
    if (usuarios.length < perPage) return null;
    page += 1;
  }
}

export async function POST(request: Request) {
  if (!loginConfigurado()) {
    return NextResponse.json({ error: ERRO_NAO_CONFIGURADO }, { status: 503 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisicao invalida." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Informe email e senha." },
      { status: 400 },
    );
  }

  try {
    // 1. Valida as credenciais no Supabase do FlowLab
    const flowlab = createFlowlabClient();
    const { data: loginFlowlab, error: erroLogin } =
      await flowlab.auth.signInWithPassword({
        email,
        password,
      });

    if (erroLogin) {
      const mensagem = erroLogin.message ?? "";
      if (mensagem.includes("Email not confirmed")) {
        return NextResponse.json(
          { error: ERRO_EMAIL_NAO_CONFIRMADO },
          { status: 401 },
        );
      }
      return NextResponse.json(
        { error: ERRO_CREDENCIAIS },
        { status: 401 },
      );
    }

    const nomeFlowlab =
      (loginFlowlab.user?.user_metadata?.name as string | undefined)?.trim() ||
      email;

    // 2. Garante a conta-espelho no Supabase do cubo (cria no primeiro login)
    const admin = createAdminClient();
    const usuarioCubo = await encontrarUsuarioPorEmail(admin, email);

    if (!usuarioCubo) {
      const { data: criado, error: erroCriacao } =
        await admin.auth.admin.createUser({
          email,
          password: randomUUID(),
          email_confirm: true,
          user_metadata: { nome: nomeFlowlab, importado_do_flowlab: true },
        });

      if (erroCriacao || !criado?.user) {
        const existente = await encontrarUsuarioPorEmail(admin, email);
        if (!existente) {
          return NextResponse.json({ error: ERRO_SESSAO }, { status: 500 });
        }
      } else {
        // Garante o profile mesmo se o trigger handle_new_user falhar.
        const { error: erroProfile } = await (admin as any)
          .from("profiles")
          .upsert(
            { id: criado.user.id, nome: nomeFlowlab, role: "viewer" },
            { onConflict: "id" },
          );
        if (erroProfile) {
          console.error("[api/auth/login] profile upsert", erroProfile);
        }
      }
    }

    // 3. Espelha a sessao no cubo: magiclink gerado no servidor + verifyOtp
    const { data: link, error: erroLink } =
      await admin.auth.admin.generateLink({ type: "magiclink", email });

    const hashedToken = link?.properties?.hashed_token;
    if (erroLink || !hashedToken) {
      return NextResponse.json({ error: ERRO_SESSAO }, { status: 500 });
    }

    const supabase = await createClient();
    const { error: erroSessao } = await supabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: hashedToken,
    });

    if (erroSessao) {
      return NextResponse.json({ error: ERRO_SESSAO }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("[api/auth/login]", erro);
    return NextResponse.json({ error: ERRO_SESSAO }, { status: 500 });
  }
}
