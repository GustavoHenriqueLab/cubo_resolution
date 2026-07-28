import { CheckCircle, AlertCircle, XCircle } from "lucide-react";

interface Props {
  confianca: "alta" | "media" | "baixa";
}

export function ConfiancaBadge({ confianca }: Props) {
  const config = ({
    alta: {
      style: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
      icon: CheckCircle,
      label: "Alta",
    },
    media: {
      style: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
      icon: AlertCircle,
      label: "Media",
    },
    baixa: {
      style: "bg-gray-500/10 text-gray-500 border-gray-500/20 dark:text-gray-400",
      icon: XCircle,
      label: "Baixa",
    },
  } as const)[confianca] ?? {
    style: "bg-gray-500/10 text-gray-500 border-gray-500/20 dark:text-gray-400",
    icon: XCircle,
    label: "—",
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${config.style}`}
    >
      <Icon size={10} className="shrink-0" />
      {config.label}
    </span>
  );
}
