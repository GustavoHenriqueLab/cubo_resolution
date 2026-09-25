"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Trash2,
} from "lucide-react";
import {
  ACCEPT_ANEXO,
  MAX_ANEXOS,
  enviarAnexosProposta,
  formatarTamanho,
  removerAnexoProposta,
  validarAnexos,
} from "@/lib/anexos";
import type { PropostaAnexo } from "@/lib/types";

function IconeAnexo({ mime }: { mime: string | null }) {
  const classe = "shrink-0 text-blue-500";
  if (!mime) return <FileText size={15} className={classe} />;
  if (mime.startsWith("image/")) return <FileImage size={15} className={classe} />;
  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    mime.includes("csv")
  ) {
    return <FileSpreadsheet size={15} className={classe} />;
  }
  if (mime.includes("zip")) return <FileArchive size={15} className={classe} />;
  return <FileText size={15} className={classe} />;
}

interface Props {
  propostaId: string;
  anexos: PropostaAnexo[];
  podeAnexar?: boolean;
  podeRemover?: boolean;
  semBorda?: boolean;
}

export function AnexosProposta({
  propostaId,
  anexos,
  podeAnexar = false,
  podeRemover = false,
  semBorda = false,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const vagas = Math.max(0, MAX_ANEXOS - anexos.length);

  if (anexos.length === 0 && !podeAnexar) return null;

  const handleArquivos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const lista = Array.from(files);
    setErro("");

    const invalido = validarAnexos(lista, vagas);
    if (invalido) {
      setErro(invalido);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setEnviando(true);
    try {
      const { erros } = await enviarAnexosProposta(propostaId, lista);
      if (erros.length > 0) setErro(erros.join(" "));
      router.refresh();
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemover = async (anexo: PropostaAnexo) => {
    if (!window.confirm(`Remover o anexo "${anexo.nome}"?`)) return;
    setErro("");
    setEnviando(true);
    try {
      const mensagem = await removerAnexoProposta(anexo.id, anexo.path);
      if (mensagem) setErro(mensagem);
      router.refresh();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className={
        semBorda
          ? ""
          : "rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50"
      }
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          <Paperclip size={11} />
          Anexos ({anexos.length}/{MAX_ANEXOS})
        </p>
        {podeAnexar && vagas > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={enviando}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 disabled:opacity-50 dark:text-blue-400"
          >
            {enviando ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Plus size={12} />
            )}
            Adicionar
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept={ACCEPT_ANEXO}
        onChange={(e) => handleArquivos(e.target.files)}
      />

      {anexos.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Nenhum documento anexado.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {anexos.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
            >
              <IconeAnexo mime={a.mime} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">
                  {a.nome}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">
                  {formatarTamanho(a.tamanho)}
                </p>
              </div>
              {a.url && (
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Baixar"
                  className="rounded-lg p-1.5 text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                >
                  <Download size={14} />
                </a>
              )}
              {podeRemover && (
                <button
                  type="button"
                  onClick={() => handleRemover(a)}
                  disabled={enviando}
                  title="Remover"
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-500/10"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {erro && (
        <p className="mt-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {erro}
        </p>
      )}
    </div>
  );
}
