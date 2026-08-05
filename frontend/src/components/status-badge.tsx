"use client";

import { STATUS_LABELS, STATUS_COLORS } from "@/lib/types";
import type { StartupStatus } from "@/lib/types";

interface Props {
  status: StartupStatus;
}

export function StatusBadge({ status }: Props) {
  const label = STATUS_LABELS[status] ?? status;
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.a_contatar;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${colors}`}
    >
      {label}
    </span>
  );
}
