"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
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

  const open = (s: StartupEnriquecida) => setStartup(s);
  const close = () => setStartup(null);

  return (
    <DrawerContext.Provider value={{ startup, open, close }}>
      {children}
    </DrawerContext.Provider>
  );
}
