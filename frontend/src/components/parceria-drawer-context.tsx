"use client";

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import type { Parceria } from "@/lib/types";

interface DrawerContextType {
  parceria: Parceria | null;
  open: (p: Parceria) => void;
  close: () => void;
}

const DrawerContext = createContext<DrawerContextType>({
  parceria: null,
  open: () => {},
  close: () => {},
});

export function useParceriaDrawer() {
  return useContext(DrawerContext);
}

export function ParceriaDrawerProvider({ children }: { children: ReactNode }) {
  const [parceria, setParceria] = useState<Parceria | null>(null);

  const open = useCallback((p: Parceria) => setParceria(p), []);
  const close = useCallback(() => setParceria(null), []);
  const value = useMemo(() => ({ parceria, open, close }), [parceria, open, close]);

  return (
    <DrawerContext.Provider value={value}>
      {children}
    </DrawerContext.Provider>
  );
}
