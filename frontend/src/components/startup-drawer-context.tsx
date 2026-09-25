"use client";

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import type { StartupEnriquecida } from "@/lib/types";

export interface ContextoDepartamento {
  nome: string;
  confianca: "alta" | "media" | "baixa";
}

interface DrawerContextType {
  startup: StartupEnriquecida | null;
  contextoDepartamento: ContextoDepartamento | null;
  open: (s: StartupEnriquecida, contexto?: ContextoDepartamento) => void;
  close: () => void;
}

const DrawerContext = createContext<DrawerContextType>({
  startup: null,
  contextoDepartamento: null,
  open: () => {},
  close: () => {},
});

export function useStartupDrawer() {
  return useContext(DrawerContext);
}

export function StartupDrawerProvider({ children }: { children: ReactNode }) {
  const [startup, setStartup] = useState<StartupEnriquecida | null>(null);
  const [contextoDepartamento, setContextoDepartamento] = useState<ContextoDepartamento | null>(null);

  const open = useCallback((s: StartupEnriquecida, contexto?: ContextoDepartamento) => {
    setStartup(s);
    setContextoDepartamento(contexto ?? null);
  }, []);

  const close = useCallback(() => {
    setStartup(null);
    setContextoDepartamento(null);
  }, []);

  const value = useMemo(
    () => ({ startup, contextoDepartamento, open, close }),
    [startup, contextoDepartamento, open, close]
  );

  return (
    <DrawerContext.Provider value={value}>
      {children}
    </DrawerContext.Provider>
  );
}
