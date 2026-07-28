"use client";

import Link from "next/link";
import { ConfiancaBadge } from "@/components/confianca-badge";
import type { DepartamentoInfo } from "@/lib/types";

const TINTS: Record<string, { tint: string; blob: string; iconGrad: string; iconShadow: string; tintDark: string; blobDark: string }> = {
  atendimento: {
    tint: "rgba(191,219,254,.65)",
    tintDark: "rgba(59,130,246,.18)",
    blob: "radial-gradient(closest-side, rgba(59,130,246,.22), transparent)",
    blobDark: "radial-gradient(closest-side, rgba(59,130,246,.12), transparent)",
    iconGrad: "linear-gradient(135deg,#60a5fa,#2563eb)",
    iconShadow: "rgba(59,130,246,.45)",
  },
  comercial: {
    tint: "rgba(167,243,208,.55)",
    tintDark: "rgba(16,185,129,.15)",
    blob: "radial-gradient(closest-side, rgba(16,185,129,.22), transparent)",
    blobDark: "radial-gradient(closest-side, rgba(16,185,129,.10), transparent)",
    iconGrad: "linear-gradient(135deg,#34d399,#059669)",
    iconShadow: "rgba(16,185,129,.45)",
  },
  qualidade: {
    tint: "rgba(254,215,170,.65)",
    tintDark: "rgba(249,115,22,.18)",
    blob: "radial-gradient(closest-side, rgba(249,115,22,.22), transparent)",
    blobDark: "radial-gradient(closest-side, rgba(249,115,22,.12), transparent)",
    iconGrad: "linear-gradient(135deg,#fb923c,#ea580c)",
    iconShadow: "rgba(249,115,22,.45)",
  },
  transporte: {
    tint: "rgba(221,214,254,.55)",
    tintDark: "rgba(139,92,246,.15)",
    blob: "radial-gradient(closest-side, rgba(139,92,246,.22), transparent)",
    blobDark: "radial-gradient(closest-side, rgba(139,92,246,.12), transparent)",
    iconGrad: "linear-gradient(135deg,#a78bfa,#7c3aed)",
    iconShadow: "rgba(139,92,246,.45)",
  },
  "biologia-molecular": {
    tint: "rgba(254,202,202,.55)",
    tintDark: "rgba(239,68,68,.15)",
    blob: "radial-gradient(closest-side, rgba(239,68,68,.22), transparent)",
    blobDark: "radial-gradient(closest-side, rgba(239,68,68,.10), transparent)",
    iconGrad: "linear-gradient(135deg,#f87171,#dc2626)",
    iconShadow: "rgba(239,68,68,.45)",
  },
  faturamento: {
    tint: "rgba(165,243,252,.55)",
    tintDark: "rgba(6,182,212,.15)",
    blob: "radial-gradient(closest-side, rgba(6,182,212,.22), transparent)",
    blobDark: "radial-gradient(closest-side, rgba(6,182,212,.12), transparent)",
    iconGrad: "linear-gradient(135deg,#22d3ee,#0891b2)",
    iconShadow: "rgba(6,182,212,.45)",
  },
  rh: {
    tint: "rgba(254,240,138,.55)",
    tintDark: "rgba(245,158,11,.18)",
    blob: "radial-gradient(closest-side, rgba(245,158,11,.22), transparent)",
    blobDark: "radial-gradient(closest-side, rgba(245,158,11,.12), transparent)",
    iconGrad: "linear-gradient(135deg,#fbbf24,#d97706)",
    iconShadow: "rgba(245,158,11,.45)",
  },
  "area-tecnica": {
    tint: "rgba(251,207,232,.55)",
    tintDark: "rgba(236,72,153,.15)",
    blob: "radial-gradient(closest-side, rgba(236,72,153,.22), transparent)",
    blobDark: "radial-gradient(closest-side, rgba(236,72,153,.12), transparent)",
    iconGrad: "linear-gradient(135deg,#f472b6,#db2777)",
    iconShadow: "rgba(236,72,153,.45)",
  },
  estoque: {
    tint: "rgba(217,249,157,.55)",
    tintDark: "rgba(132,204,22,.15)",
    blob: "radial-gradient(closest-side, rgba(132,204,22,.22), transparent)",
    blobDark: "radial-gradient(closest-side, rgba(132,204,22,.12), transparent)",
    iconGrad: "linear-gradient(135deg,#a3e635,#65a30d)",
    iconShadow: "rgba(132,204,22,.45)",
  },
  financeiro: {
    tint: "rgba(153,246,228,.55)",
    tintDark: "rgba(20,184,166,.15)",
    blob: "radial-gradient(closest-side, rgba(20,184,166,.22), transparent)",
    blobDark: "radial-gradient(closest-side, rgba(20,184,166,.12), transparent)",
    iconGrad: "linear-gradient(135deg,#2dd4bf,#0d9488)",
    iconShadow: "rgba(20,184,166,.45)",
  },
  ti: {
    tint: "rgba(199,210,254,.55)",
    tintDark: "rgba(99,102,241,.18)",
    blob: "radial-gradient(closest-side, rgba(99,102,241,.22), transparent)",
    blobDark: "radial-gradient(closest-side, rgba(99,102,241,.12), transparent)",
    iconGrad: "linear-gradient(135deg,#818cf8,#4f46e5)",
    iconShadow: "rgba(99,102,241,.45)",
  },
  "equipe-medica": {
    tint: "rgba(254,215,215,.55)",
    tintDark: "rgba(225,29,72,.15)",
    blob: "radial-gradient(closest-side, rgba(244,63,94,.22), transparent)",
    blobDark: "radial-gradient(closest-side, rgba(244,63,94,.12), transparent)",
    iconGrad: "linear-gradient(135deg,#fb7185,#e11d48)",
    iconShadow: "rgba(225,29,72,.45)",
  },
};

interface Props {
  departamento: DepartamentoInfo;
  index: number;
}

export function DepartamentoCard({ departamento, index }: Props) {
  const t = TINTS[departamento.slug] ?? TINTS.atendimento;

  const percAlta =
    departamento.totalStartups > 0
      ? Math.round((departamento.altaConfianca / departamento.totalStartups) * 100)
      : 0;

  return (
    <Link href={`/departamentos/${departamento.slug}`} prefetch={true} className="block">
      <article
        className="animate-fade-in-up group relative cursor-pointer overflow-hidden rounded-[20px] border border-white/[.12] p-5 opacity-0 transition-all duration-200 dark:border-white/[.06]"
        style={{
          background: `linear-gradient(135deg, rgba(255,255,255,.85) 0%, rgba(255,255,255,.55) 60%, ${t.tint} 100%)`,
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,.9), inset 0 -1px 0 rgba(15,23,42,.04), 0 1px 0 rgba(15,23,42,.04), 0 12px 32px -16px rgba(15,23,42,.18), 0 4px 10px -6px rgba(15,23,42,.10)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          animationFillMode: "forwards",
        }}
      >
        {/* Tint overlay — dark */}
        <div
          className="pointer-events-none absolute inset-0 hidden dark:block"
          style={{
            background: `linear-gradient(135deg, rgba(15,23,42,.75) 0%, rgba(15,23,42,.55) 60%, ${t.tintDark} 100%)`,
          }}
        />

        {/* Blob — light */}
        <div
          className="pointer-events-none absolute -bottom-10 -right-8 h-[140px] w-[140px] rounded-full blur-lg dark:hidden"
          style={{ background: t.blob }}
        />
        {/* Blob — dark */}
        <div
          className="pointer-events-none absolute -bottom-10 -right-8 hidden h-[140px] w-[140px] rounded-full blur-lg dark:block"
          style={{ background: t.blobDark }}
        />

        {/* Top row: icon + total inline */}
        <div className="relative z-10 flex items-center gap-3">
          <div
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl text-white"
            style={{
              background: t.iconGrad,
              boxShadow: `0 8px 18px -6px ${t.iconShadow}, inset 0 1px 0 rgba(255,255,255,.35)`,
            }}
          >
            <span className="text-lg font-bold">{departamento.totalStartups}</span>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            startups
          </span>
        </div>

        {/* Department name — destaque */}
        <div className="relative z-10 mt-3 truncate font-display text-lg font-bold text-gray-800 dark:text-gray-100">
          {departamento.nome}
        </div>

        {/* Breakdown */}
        <div className="relative z-10 mt-3 flex items-center gap-3">
          <ConfiancaBadge confianca="alta" />
          <span className="text-sm font-semibold tabular-nums text-gray-700 dark:text-gray-300">{departamento.altaConfianca}</span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">{percAlta}%</span>
        </div>
        <div className="relative z-10 mt-1.5 flex items-center gap-3">
          <ConfiancaBadge confianca="media" />
          <span className="text-sm font-semibold tabular-nums text-gray-700 dark:text-gray-300">{departamento.mediaConfianca}</span>
        </div>
      </article>
    </Link>
  );
}
