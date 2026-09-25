import { createClient } from "@/lib/supabase/client";

export const MAX_ANEXOS = 5;
export const MAX_ANEXO_BYTES = 10 * 1024 * 1024;

export const MIMES_ANEXO = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
];

export const ACCEPT_ANEXO =
  ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip";

export function formatarTamanho(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validarAnexos(arquivos: File[], vagas: number): string | null {
  if (arquivos.length > vagas) {
    return `Limite de ${MAX_ANEXOS} anexos por proposta.`;
  }
  for (const f of arquivos) {
    if (f.size > MAX_ANEXO_BYTES) {
      return `"${f.name}" passa de 10 MB.`;
    }
    if (f.type && !MIMES_ANEXO.includes(f.type)) {
      return `Tipo de arquivo nao permitido: ${f.name}`;
    }
  }
  return null;
}

function nomeSeguro(nome: string): string {
  return nome
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .slice(-80);
}

export async function enviarAnexosProposta(
  propostaId: string,
  arquivos: File[],
): Promise<{ erros: string[] }> {
  const erros: string[] = [];
  if (arquivos.length === 0) return { erros };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { erros: ["Sessao expirada. Faca login novamente."] };
  }

  for (const file of arquivos) {
    const path = `${propostaId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}-${nomeSeguro(file.name)}`;

    const { error: erroUpload } = await supabase.storage
      .from("proposta-anexos")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });

    if (erroUpload) {
      erros.push(`"${file.name}": ${erroUpload.message}`);
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: erroDb } = await (supabase as any)
      .from("proposta_anexos")
      .insert({
        proposta_id: propostaId,
        enviado_por: user.id,
        nome: file.name,
        path,
        mime: file.type || null,
        tamanho: file.size,
      });

    if (erroDb) {
      erros.push(`"${file.name}": ${erroDb.message}`);
    }
  }

  return { erros };
}

export async function removerAnexoProposta(
  anexoId: string,
  path: string,
): Promise<string | null> {
  const supabase = createClient();

  // best-effort no storage; a linha e removida de qualquer forma
  await supabase.storage.from("proposta-anexos").remove([path]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("proposta_anexos")
    .delete()
    .eq("id", anexoId);

  return error ? error.message : null;
}
