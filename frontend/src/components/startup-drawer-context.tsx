"use client";

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import type { StartupEnriquecida } from "@/lib/types";

interface DrawerContextType {
  startup: StartupEnriquecida | null;
  open: (s: StartupEnriquecida) => void;
  close: () => void;
}

const DrawerContext = createContext<DrawerContextType>({
  startup: null,
  open: () => {},
  close: () => {},
});

export function useStartupDrawer() {
  return useContext(DrawerContext);
}

export function StartupDrawerProvider({ children }: { children: ReactNode }) {
  const [startup, setStartup] = useState<StartupEnriquecida | null>(null);

  const open = useCallback((s: StartupEnriquecida) => setStartup(s), []);
  const close = useCallback(() => setStartup(null), []);
  const value = useMemo(() => ({ startup, open, close }), [startup, open, close]);

  return (
    <DrawerContext.Provider value={value}>
      {children}
    </DrawerContext.Provider>
  );
}
