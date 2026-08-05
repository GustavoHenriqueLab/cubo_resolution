"use client";

import { X } from "lucide-react";
import { MultiCombobox } from "@/components/multi-combobox";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/types";
import type { DepartamentoInfo, StartupStatus } from "@/lib/types";

interface Props {
  segmentos: string[];
  tecnologias: string[];
  departamentos: DepartamentoInfo[];
  segmentosAtivos: string[];
  tecnologiasAtivas: string[];
  departamentosAtivos: string[];
  confiancaAtiva: string[];
  statusAtivo: StartupStatus[];
  onSegmentosChange: (v: string[]) => void;
  onTecnologiasChange: (v: string[]) => void;
  onDepartamentosChange: (v: string[]) => void;
  onConfiancaChange: (v: string[]) => void;
  onStatusChange: (v: StartupStatus[]) => void;
}

export function FilterBar({
  segmentos,
  tecnologias,
  departamentos,
  segmentosAtivos,
  tecnologiasAtivas,
  departamentosAtivos,
  confiancaAtiva,
  statusAtivo,
  onSegmentosChange,
  onTecnologiasChange,
  onDepartamentosChange,
  onConfiancaChange,
  onStatusChange,
}: Props) {
  const temFiltros =
    segmentosAtivos.length > 0 ||
    tecnologiasAtivas.length > 0 ||
    departamentosAtivos.length > 0 ||
    confiancaAtiva.length > 0 ||
    statusAtivo.length > 0;

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <MultiCombobox
          options={segmentos.map((s) => ({ value: s, label: s }))}
          values={segmentosAtivos}
          onChange={onSegmentosChange}
          placeholder="Segmentos"
        />

        <MultiCombobox
          options={tecnologias.map((t) => ({ value: t, label: t }))}
          values={tecnologiasAtivas}
          onChange={onTecnologiasChange}
          placeholder="Tecnologias"
        />

        <MultiCombobox
          options={departamentos.map((d) => ({ value: d.slug, label: d.nome }))}
          values={departamentosAtivos}
          onChange={onDepartamentosChange}
          placeholder="Departamentos"
        />

        <MultiCombobox
          options={[
            { value: "alta", label: "Alta" },
            { value: "media", label: "Media" },
            { value: "baixa", label: "Baixa" },
          ]}
          values={confiancaAtiva}
          onChange={onConfiancaChange}
          placeholder="Confianca"
        />

        <MultiCombobox
          options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
          values={statusAtivo}
          onChange={(v) => onStatusChange(v as StartupStatus[])}
          placeholder="Status"
        />
      </div>

      {temFiltros && (
        <button
          onClick={() => {
            onSegmentosChange([]);
            onTecnologiasChange([]);
            onDepartamentosChange([]);
            onConfiancaChange([]);
            onStatusChange([]);
          }}
          className="mt-2 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        >
          <X size={14} />
          Limpar filtros
        </button>
      )}
    </div>
  );
}
