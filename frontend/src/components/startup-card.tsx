"use client";

import { memo } from "react";
import Link from "next/link";
import { useStartupDrawer } from "@/components/startup-drawer-context";
import { ConfiancaBadge } from "@/components/confianca-badge";
import { StatusBadge } from "@/components/status-badge";
import { FavoriteButton } from "@/components/favorite-button";
import { nomeParaSlug } from "@/lib/constants";
import { ExternalLink, Star } from "lucide-react";
import type { StartupEnriquecida } from "@/lib/types";

interface Props {
  startup: StartupEnriquecida;
  index?: number;
  initialFavorited?: boolean;
}

export const StartupCard = memo(function StartupCard({
  startup,
  index = 0,
  initialFavorited = false,
}: Props) {
  const { open } = useStartupDrawer();
  const isDestaque = startup.rank != null;

  return (
    <article
      className="hover-lift animate-fade-in-up group flex cursor-pointer flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm opacity-0 transition-all dark:border-gray-700 dark:bg-gray-800"
      style={{
        animationDelay: `${index * 50}ms`,
        animationFillMode: "forwards",
      }}
      onClick={() => open(startup)}
    >
      {/* Header — titulo + acoes */}
      <div className="mb-3 flex items-start justify-between gap-2 min-w-0">
        <h3 className="font-display text-base font-semibold text-gray-900 truncate dark:text-gray-100">
          {startup.nome}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0">
          <div onClick={(e) => e.stopPropagation()}>
            <FavoriteButton
              startupId={startup.id}
              initialFavorited={initialFavorited}
            />
          </div>
          <ConfiancaBadge confianca={startup.confianca} />
        </div>
      </div>

      {/* Destaque slot */}
      <div className="mb-3 flex min-h-[24px] items-center gap-2">
        {isDestaque && (
          <>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-3 py-1 shadow-sm shadow-blue-500/20">
              <Star size={10} className="fill-white text-white" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-white">Destaque LAB</span>
            </div>
            <span
              className="rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[11px] font-bold text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400"
              title="Rank de relevancia para a LAB (1 = mais relevante)"
            >
              #{startup.rank}
            </span>
          </>
        )}
      </div>

      {/* Status + Departamentos */}
      <div
        className="mb-3 flex flex-wrap items-center justify-between gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        <StatusBadge status={startup.status} />
        <div className="flex flex-wrap gap-1.5">
          {startup.departamentos.map((d) => (
            <Link
              key={d}
              href={`/departamentos/${nomeParaSlug(d)}`}
              prefetch={false}
              className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
            >
              {d}
            </Link>
          ))}
        </div>
      </div>

      {/* Descricao */}
      {startup.descricao ? (
        <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          {startup.descricao}
        </p>
      ) : (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-3 dark:border-blue-500/20 dark:bg-blue-500/10">
          <p className="text-sm font-medium leading-relaxed text-blue-700 dark:text-blue-400">
            Esta empresa nao disponibilizou informacoes sobre ela no site do Cubo Itau.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-blue-600 dark:text-blue-500">
            Para saber mais, recomendamos acessar o site da empresa.
          </p>
        </div>
      )}

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
          className="mt-auto border-t border-gray-100 pt-3 dark:border-gray-700"
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
