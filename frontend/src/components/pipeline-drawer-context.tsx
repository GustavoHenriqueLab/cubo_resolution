"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type PipelineType = "scraper" | "classifier" | "ranker" | "destaques";

export interface PipelineInfo {
  type: PipelineType;
  label: string;
  icon: string;
}

interface PipelineDrawerContextType {
  pipeline: PipelineInfo | null;
  open: (p: PipelineInfo) => void;
  close: () => void;
}

const PipelineDrawerContext = createContext<PipelineDrawerContextType>({
  pipeline: null,
  open: () => {},
  close: () => {},
});

export function usePipelineDrawer() {
  return useContext(PipelineDrawerContext);
}

export function PipelineDrawerProvider({ children }: { children: ReactNode }) {
  const [pipeline, setPipeline] = useState<PipelineInfo | null>(null);

  return (
    <PipelineDrawerContext.Provider
      value={{
        pipeline,
        open: setPipeline,
        close: () => setPipeline(null),
      }}
    >
      {children}
    </PipelineDrawerContext.Provider>
  );
}
