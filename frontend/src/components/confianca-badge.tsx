import { CheckCircle, AlertCircle } from "lucide-react";

interface Props {
  confianca: "alta" | "media";
}

export function ConfiancaBadge({ confianca }: Props) {
  const isAlta = confianca === "alta";

  const styles = isAlta
    ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
    : "bg-amber-500/10 text-amber-600 border-amber-500/20";

  const Icon = isAlta ? CheckCircle : AlertCircle;
  const label = isAlta ? "Alta" : "Media";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${styles}`}
    >
      <Icon size={10} className="shrink-0" />
      {label}
    </span>
  );
}
