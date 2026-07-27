"use client";

import { memo } from "react";
import Link from "next/link";
import { useStartupDrawer } from "@/components/startup-drawer-context";
import { ConfiancaBadge } from "@/components/confianca-badge";
import { nomeParaSlug } from "@/lib/constants";
import { ExternalLink } from "lucide-react";
import type { StartupEnriquecida } from "@/lib/types";

interface Props {
  startup: StartupEnriquecida;
  index?: number;
}

export const StartupCard = memo(function StartupCard({ startup, index = 0 }: Props) {
  const { open } = useStartupDrawer();

  return (
    <article
      className={`hover-lift animate-fade-in-up group cursor-pointer rounded-2xl border border-gray-100 bg-white p-6 shadow-sm opacity-0 transition-all dark:border-gray-700 dark:bg-gray-800`}
      style={{
        animationDelay: `${index * 50}ms`,
        animationFillMode: "forwards",
      }}
      onClick={() => open(startup)}
    >
      {/* Rank badge */}
      {startup.rank != null && (
        <div
          className="mb-3 inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400"
          title="Relevancia para a LAB (1 = mais relevante)"
        >
          <span className="text-[10px] uppercase tracking-wider text-blue-400">Rank</span>
          #{startup.rank}
        </div>
      )}

      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2 min-w-0">
        <h3 className="font-display text-lg font-semibold text-gray-900 truncate dark:text-gray-100">
          {startup.nome}
        </h3>
        <div
          className="flex items-center gap-1.5"
          title="Confianca = precisao do encaixe da startup no departamento"
        >
          <ConfiancaBadge confianca={startup.confianca} />
        </div>
      </div>

      {/* Department chips */}
      <div
        className="mb-3 flex flex-wrap gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        {startup.departamentos.map((d) => (
          <Link
            key={d}
            href={`/departamentos/${nomeParaSlug(d)}`}
            className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
          >
            {d}
          </Link>
        ))}
      </div>

      {/* Description */}
      <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
        {startup.descricao}
      </p>

      {/* Meta */}
      <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-gray-500 min-w-0 overflow-hidden">
        <span className="truncate">{startup.segmento || "—"}</span>
        {startup.tecnologias.length > 0 && (
          <>
            <span>·</span>
            <span>{startup.tecnologias.slice(0, 2).join(", ")}</span>
            {startup.tecnologias.length > 2 && (
              <span>+{startup.tecnologias.length - 2}</span>
            )}
          </>
        )}
      </div>

      {/* Site link */}
      {startup.site && (
        <div
          className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-700"
          onClick={(e) => e.stopPropagation()}
        >
          <a
            href={startup.site}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <ExternalLink size={12} />
            {startup.site}
          </a>
        </div>
      )}
    </article>
  );
});
