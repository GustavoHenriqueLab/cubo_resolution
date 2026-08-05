"use client";

import { useEffect, type ReactNode } from "react";
import { usePipelineDrawer, type PipelineType } from "@/components/pipeline-drawer-context";
import { X, FileSearch, BrainCircuit, Trophy, Sparkles, Play, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const PIPELINES: Record<PipelineType, {
  icon: typeof FileSearch;
  label: string;
  color: string;
  description: string;
  steps: { label: string; detail: string }[];
  dependsOn: string | null;
  warning?: string;
}> = {
  scraper: {
    icon: FileSearch,
    label: "Scraper",
    color: "blue",
    description: "Extrai dados de startups da plataforma Cubo Itau usando automacao de navegador (Selenium).",
    steps: [
      { label: "Login", detail: "Autentica na plataforma Cubo Itau com credenciais." },
      { label: "Navegacao", detail: "Percorre ate 100 paginas de busca de startups." },
      { label: "Extracao", detail: "Coleta nome, segmento, descricao, fundadores, site, tecnologias e modelos de negocio de cada card e pagina de perfil." },
      { label: "Persistencia", detail: "Salva no Supabase (upsert por nome) e exporta backup JSON." },
      { label: "Rate-limit", detail: "Respeita intervalo minimo de 30 dias entre execucoes." },
    ],
    dependsOn: null,
  },
  classifier: {
    icon: BrainCircuit,
    label: "Classificador",
    color: "green",
    description: "Usa Google Gemini para classificar startups nos 12 departamentos e selecionar destaques LAB.",
    steps: [
      { label: "Carga", detail: "Carrega todas as startups do Supabase e progresso anterior." },
      { label: "Filtro", detail: "Ignora startups sem descricao, segmento, site, fundadores ou tecnologias." },
      { label: "Classificacao", detail: "Envia lotes para o Gemini categorizar em departamentos com confianca (alta/media), aderencia ao LAB e grade de 9 criterios de avaliacao." },
      { label: "Destaques", detail: "Gemini seleciona 8-15 startups mais relevantes para a LAB." },
      { label: "Persistencia", detail: "Salva em startup_departamentos e destaques_lab." },
    ],
    dependsOn: "Scraper",
  },
  ranker: {
    icon: Trophy,
    label: "Ranqueador",
    color: "amber",
    description: "Usa Gemini para ranquear startups dentro de cada departamento por relevancia para a LAB.",
    steps: [
      { label: "Iteracao", detail: "Percorre todos os 12 departamentos." },
      { label: "Agrupamento", detail: "Para cada departamento, carrega startups classificadas." },
      { label: "Ranking", detail: "Envia lotes de 30 para o Gemini ranquear de #1 (mais relevante) em diante." },
      { label: "Persistencia", detail: "Atualiza a coluna rank em startup_departamentos." },
    ],
    dependsOn: "Classificador",
  },
  destaques: {
    icon: Sparkles,
    label: "Destaques",
    color: "purple",
    description: "Analisa em profundidade as startups selecionadas como destaques LAB pelo classificador.",
    steps: [
      { label: "Carga", detail: "Busca startups da tabela destaques_lab com dados completos." },
      { label: "Analise", detail: "Envia lotes de 10 para o Gemini gerar rank definitivo e analise de 2-3 frases por startup." },
      { label: "Persistencia", detail: "Atualiza destaques_lab com rank final e texto da analise." },
    ],
    dependsOn: "Classificador",
    warning: "Execute apenas apos o Classificador ter populado a tabela destaques_lab.",
  },
};

export function PipelineDrawer() {
  const { pipeline, close } = usePipelineDrawer();
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (pipeline) {
      document.body.style.overflow = "hidden";
      setRunning(false);
      setDone(false);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [pipeline]);

  if (!pipeline) return null;

  const info = PIPELINES[pipeline.type];
  const Icon = info.icon;

  const colorMap: Record<string, string> = {
    blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400",
    green: "border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400",
    amber: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400",
    purple: "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-400",
  };

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await fetch(`/api/pipeline/${pipeline.type}`, { method: "POST" });
      if (res.ok) {
        setDone(true);
        setTimeout(() => setDone(false), 3000);
        router.refresh();
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={close}
      />

      <div className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-2xl animate-slide-in-right dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`rounded-xl p-2.5 ${colorMap[info.color]}`}>
              <Icon size={22} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {info.label}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Pipeline de automacao
              </p>
            </div>
          </div>
          <button
            onClick={close}
            className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Description */}
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {info.description}
          </p>

          {/* Dependencies */}
          {info.dependsOn && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Depende de: <strong>{info.dependsOn}</strong>
              </p>
              {info.warning && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
                  {info.warning}
                </p>
              )}
            </div>
          )}

          {/* Steps */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Etapas
            </h3>
            <div className="space-y-3">
              {info.steps.map((step, i) => (
                <StepRow key={step.label} step={i + 1} color={info.color}>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {step.label}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                      {step.detail}
                    </p>
                  </div>
                </StepRow>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 dark:border-gray-700">
          <button
            onClick={handleRun}
            disabled={running}
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
              done
                ? "bg-green-500 text-white"
                : running
                ? "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
                : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/25"
            }`}
          >
            {done ? (
              <>
                <CheckCircle2 size={18} />
                Pipeline disparada!
              </>
            ) : running ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Disparando...
              </>
            ) : (
              <>
                <Play size={18} />
                Executar {info.label}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

function StepRow({
  step,
  color,
  children,
}: {
  step: number;
  color: string;
  children: ReactNode;
}) {
  const bgMap: Record<string, string> = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    amber: "bg-amber-500",
    purple: "bg-purple-500",
  };

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${bgMap[color]}`}
        >
          {step}
        </span>
        <div className="mt-1 w-px flex-1 bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="pb-3 flex-1">{children}</div>
    </div>
  );
}
