import { Star } from "lucide-react";

interface Props {
  nivel: "alta" | "media" | "baixa";
}

const STYLES: Record<string, string> = {
  alta: "bg-green-500/10 text-green-600 border-green-500/20",
  media: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  baixa: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

const LABELS: Record<string, string> = {
  alta: "Alta",
  media: "Media",
  baixa: "Baixa",
};

export function AderenciaBadge({ nivel }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STYLES[nivel] ?? STYLES.media}`}
    >
      <Star size={10} className="shrink-0" />
      {LABELS[nivel] ?? nivel}
    </span>
  );
}
