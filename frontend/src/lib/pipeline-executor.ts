import { spawn } from "child_process";
import path from "path";

const BACKEND_ROOT = path.resolve(process.cwd(), "..", "backend");

const SCRIPT_MAP: Record<string, string> = {
  scraper: path.join(BACKEND_ROOT, "scripts", "run_scraper.py"),
  classifier: path.join(BACKEND_ROOT, "scripts", "run_classifier.py"),
  ranker: path.join(BACKEND_ROOT, "scripts", "rankear_deptos.py"),
  destaques: path.join(BACKEND_ROOT, "scripts", "analisar_destaques.py"),
};

export function spawnPipeline(type: string): void {
  const script = SCRIPT_MAP[type];
  if (!script) {
    console.error(`[pipeline] Script nao encontrado para tipo: ${type}`);
    return;
  }

  const child = spawn("python", [script], {
    cwd: BACKEND_ROOT,
    detached: true,
    stdio: "ignore",
  });

  child.unref();

  console.log(`[pipeline] Disparado ${type} (PID ${child.pid})`);
}
