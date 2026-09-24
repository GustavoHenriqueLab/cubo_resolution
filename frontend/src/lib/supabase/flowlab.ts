import { createClient } from "@supabase/supabase-js";

/**
 * Client do Supabase do FlowLab (sistema Lab) usado apenas no servidor para
 * validar credenciais. Nao persiste sessao: o login do app acontece no
 * Supabase do cubo (espelho de sessao).
 */
export function createFlowlabClient() {
  const url = process.env.FLOWLAB_SUPABASE_URL;
  const anonKey = process.env.FLOWLAB_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "FLOWLAB_SUPABASE_URL/FLOWLAB_SUPABASE_ANON_KEY nao configurados.",
    );
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
