"use client";

import { FileSearch, BrainCircuit, Trophy, Sparkles } from "lucide-react";
import { usePipelineDrawer } from "@/components/pipeline-drawer-context";
import type { PipelineType } from "@/components/pipeline-drawer-context";

interface PipelineCardConfig {
  type: PipelineType;
  label: string;
  description: string;
  icon: typeof FileSearch;
  color: "blue" | "green" | "amber" | "purple";
  steps: number;
}

const PIPELINE_CARDS: PipelineCardConfig[] = [
  {
    type: "scraper",
    label: "Scraper",
    description: "Extrai dados de startups do site do Cubo Itau e persiste no banco.",
    icon: FileSearch,
    color: "blue",
    steps: 5,
  },
  {
    type: "classifier",
    label: "Classificador",
    description: "Usa Gemini para classificar startups nos 12 departamentos e selecionar destaques LAB.",
    icon: BrainCircuit,
    color: "green",
    steps: 5,
  },
  {
    type: "ranker",
    label: "Ranqueador",
    description: "Ranqueia startups por relevancia dentro de cada departamento via Gemini.",
    icon: Trophy,
    color: "amber",
    steps: 4,
  },
  {
    type: "destaques",
    label: "Destaques",
    description: "Analise profunda das startups selecionadas como destaques da LAB.",
    icon: Sparkles,
    color: "purple",
    steps: 3,
  },
];

const COLOR_CONFIG: Record<string, {
  iconBg: string;
  border: string;
  hoverBg: string;
  hoverBorder: string;
  hoverShadow: string;
  badge: string;
  detailLabel: string;
}> = {
  blue: {
    iconBg: "bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25",
    border: "border-gray-100 dark:border-gray-700",
    hoverBg: "hover:bg-blue-50/80 dark:hover:bg-blue-500/5",
    hoverBorder: "hover:border-blue-200 dark:hover:border-blue-500/30",
    hoverShadow: "hover:shadow-lg hover:shadow-blue-500/10",
    badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30",
    detailLabel: "text-blue-600 dark:text-blue-400",
  },
  green: {
    iconBg: "bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/25",
    border: "border-gray-100 dark:border-gray-700",
    hoverBg: "hover:bg-emerald-50/80 dark:hover:bg-emerald-500/5",
    hoverBorder: "hover:border-emerald-200 dark:hover:border-emerald-500/30",
    hoverShadow: "hover:shadow-lg hover:shadow-emerald-500/10",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30",
    detailLabel: "text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25",
    border: "border-gray-100 dark:border-gray-700",
    hoverBg: "hover:bg-amber-50/80 dark:hover:bg-amber-500/5",
    hoverBorder: "hover:border-amber-200 dark:hover:border-amber-500/30",
    hoverShadow: "hover:shadow-lg hover:shadow-amber-500/10",
    badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30",
    detailLabel: "text-amber-600 dark:text-amber-400",
  },
  purple: {
    iconBg: "bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/25",
    border: "border-gray-100 dark:border-gray-700",
    hoverBg: "hover:bg-purple-50/80 dark:hover:bg-purple-500/5",
    hoverBorder: "hover:border-purple-200 dark:hover:border-purple-500/30",
    hoverShadow: "hover:shadow-lg hover:shadow-purple-500/10",
    badge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30",
    detailLabel: "text-purple-600 dark:text-purple-400",
  },
};

export function AdminPipelineCards() {
  const { open } = usePipelineDrawer();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {PIPELINE_CARDS.map((p) => {
        const Icon = p.icon;
        const c = COLOR_CONFIG[p.color];
        return (
          <button
            key={p.type}
            onClick={() => open({ type: p.type, label: p.label, icon: p.label })}
            className={`group flex w-full flex-col gap-3 rounded-2xl border bg-white p-5 text-left transition-all duration-300 ${c.border} ${c.hoverBg} ${c.hoverBorder} ${c.hoverShadow} dark:bg-gray-800`}
          >
            <div className="flex items-start justify-between">
              <div className={`rounded-xl p-2.5 ${c.iconBg}`}>
                <Icon size={20} className="text-white" />
              </div>
              <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${c.badge}`}>
                {p.steps} etapas
              </span>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {p.label}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                {p.description}
              </p>
            </div>

            <div className={`mt-auto text-[11px] font-medium transition-all group-hover:font-semibold ${c.detailLabel}`}>
              Clique para detalhes
            </div>
          </button>
        );
      })}
    </div>
  );
}
