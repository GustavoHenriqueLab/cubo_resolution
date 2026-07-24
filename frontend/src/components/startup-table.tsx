import { StartupCard } from "@/components/startup-card";
import { ConfiancaBadge } from "@/components/confianca-badge";
import type { StartupEnriquecida } from "@/lib/types";

interface Props {
  startups: StartupEnriquecida[];
}

export function StartupTable({ startups }: Props) {
  const alta = startups.filter((s) => s.confianca === "alta");
  const media = startups.filter((s) => s.confianca === "media");

  return (
    <div className="space-y-10">
      {alta.length > 0 && (
        <section>
          <div className="mb-5 flex items-center gap-3">
            <h2 className="font-display text-xl font-semibold text-gray-800 dark:text-gray-200">
              Alta confianca
            </h2>
            <ConfiancaBadge confianca="alta" />
            <span className="text-xs font-medium text-slate-400">{alta.length}</span>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {alta.map((s, i) => (
              <StartupCard key={s.nome} startup={s} index={i} />
            ))}
          </div>
        </section>
      )}

      {media.length > 0 && (
        <section>
          <div className="mb-5 flex items-center gap-3">
            <h2 className="font-display text-xl font-semibold text-gray-800 dark:text-gray-200">
              Media confianca
            </h2>
            <ConfiancaBadge confianca="media" />
            <span className="text-xs font-medium text-slate-400">{media.length}</span>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {media.map((s, i) => (
              <StartupCard key={s.nome} startup={s} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
