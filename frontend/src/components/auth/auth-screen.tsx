"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Handshake,
  LayoutDashboard,
  LogIn,
  Moon,
  Rocket,
  Star,
  Sun,
  Users,
} from "lucide-react";

const MODULES = [
  {
    icon: LayoutDashboard,
    title: "Departamentos",
    description:
      "12 areas do laboratorio com startups ranqueadas por aderencia e nivel de confianca.",
  },
  {
    icon: Rocket,
    title: "Startups",
    description:
      "Busca global por nome, segmento, tecnologia, departamento e confianca.",
  },
  {
    icon: FileText,
    title: "Propostas",
    description:
      "Proponha integracoes e acompanhe o status de cada tratativa em tempo real.",
  },
  {
    icon: Handshake,
    title: "Parcerias",
    description:
      "Parcerias firmadas com o ecossistema de inovacao do Cubo Itau.",
  },
  {
    icon: Star,
    title: "Destaques LAB",
    description:
      "As startups mais relevantes para a area de P&D do laboratorio.",
  },
  {
    icon: Users,
    title: "Admin",
    description:
      "Gestao de usuarios, curadoria de startups e pipelines de dados.",
  },
];

const formVariants = {
  enter: { x: 20, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -20, opacity: 0 },
};

const slideVariants = {
  enter: (dir: string) => ({
    opacity: 0,
    x: dir === "right" ? 40 : -40,
    scale: 0.95,
  }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (dir: string) => ({
    opacity: 0,
    x: dir === "right" ? -40 : 40,
    scale: 0.95,
  }),
};

const springTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
};

export function AuthScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect") ?? "/";
  const redirect =
    redirectParam.startsWith("/") && !redirectParam.startsWith("//")
      ? redirectParam
      : "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">(
    "right",
  );

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const isDark = stored === "dark" || (!stored && prefersDark);
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else if (stored === "light") {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const goToSlide = useCallback(
    (index: number, direction?: "left" | "right") => {
      setSlideDirection(direction || (index > activeSlide ? "right" : "left"));
      setActiveSlide(index);
    },
    [activeSlide],
  );

  const nextSlide = useCallback(() => {
    goToSlide((activeSlide + 1) % MODULES.length, "right");
  }, [activeSlide, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide((activeSlide - 1 + MODULES.length) % MODULES.length, "left");
  }, [activeSlide, goToSlide]);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(nextSlide, 4500);
    return () => clearInterval(timer);
  }, [isAutoPlaying, nextSlide]);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem("theme", "light");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const resposta = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const dados = (await resposta.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!resposta.ok) {
        setError(
          dados?.error ?? "Ocorreu um erro inesperado. Tente novamente.",
        );
        setLoading(false);
        return;
      }

      router.push(redirect);
      router.refresh();
    } catch {
      setError("Ocorreu um erro inesperado. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* ====== LADO ESQUERDO — Branding / Visual (hidden no mobile) ====== */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 p-10 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 lg:flex lg:w-[45%] lg:flex-col lg:items-center lg:justify-center">
        {/* Animated orbs */}
        <div className="animate-blob absolute -left-20 top-1/4 h-96 w-96 rounded-full bg-gradient-to-r from-blue-200/50 to-cyan-200/50 blur-3xl dark:from-blue-500/20 dark:to-cyan-500/20"></div>
        <div className="animation-delay-2000 animate-blob absolute -right-20 bottom-1/4 h-96 w-96 rounded-full bg-gradient-to-r from-indigo-200/50 to-blue-200/50 blur-3xl dark:from-indigo-500/20 dark:to-blue-500/20"></div>
        <div className="animation-delay-4000 animate-blob absolute left-1/4 top-2/3 h-72 w-72 rounded-full bg-gradient-to-r from-cyan-200/30 to-blue-300/30 blur-3xl dark:from-cyan-500/15 dark:to-blue-500/15"></div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:64px_64px]"></div>

        {/* ── Main branding card ── */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex w-full max-w-lg flex-col items-center gap-6 rounded-3xl border border-white/20 bg-white/10 px-12 py-14 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
        >
          {/* Glow behind main card */}
          <div className="animate-pulse-soft absolute -inset-2 -z-10 rounded-3xl bg-gradient-to-r from-blue-500/20 via-indigo-500/15 to-cyan-500/20 blur-2xl"></div>

          {/* Logo com borda rotativa */}
          <div className="relative inline-flex items-center justify-center">
            <div
              className="absolute h-32 w-32 animate-spin-slow rounded-full border-2 border-transparent"
              style={{
                background:
                  "linear-gradient(rgba(255,255,255,0.1), rgba(255,255,255,0.1)) padding-box, linear-gradient(to right, #1e3a8a, #3b82f6, #1e40af) border-box",
                animationDuration: "8s",
              }}
            />
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-white/30 bg-white/20 shadow-lg shadow-blue-900/20 backdrop-blur-md">
              <Image
                src="/LOGO BRANCA.png"
                alt="Logo FlowLab"
                width={80}
                height={80}
                className="h-20 w-20 object-contain transition-all duration-500 ease-out hover:scale-110"
                priority
              />
            </div>
          </div>

          <div className="space-y-3 text-center">
            <h2 className="text-4xl font-bold tracking-tight text-white">
              FlowLab
            </h2>
            <p className="max-w-sm text-base font-normal leading-relaxed text-white/80">
              Startups do ecossistema Cubo Itau por departamento do LAB
              Medicina Diagnostica.
            </p>
          </div>

          {/* Divider line */}
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>

          {/* Module count badge */}
          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2">
            <div className="animate-pulse-soft h-2 w-2 rounded-full bg-green-400"></div>
            <span className="text-xs font-medium text-blue-100/90">
              {MODULES.length} modulos integrados
            </span>
          </div>
        </motion.div>

        {/* ── Module carousel ── */}
        <div
          className="relative z-10 mt-8 w-full max-w-lg"
          onMouseEnter={() => setIsAutoPlaying(false)}
          onMouseLeave={() => setIsAutoPlaying(true)}
        >
          {/* Carousel viewport */}
          <div
            className="relative overflow-hidden rounded-2xl"
            style={{ minHeight: "140px" }}
          >
            <AnimatePresence mode="wait" custom={slideDirection}>
              <motion.div
                key={activeSlide}
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-stretch"
              >
                {(() => {
                  const mod = MODULES[activeSlide];
                  const Icon = mod.icon;
                  return (
                    <div className="card-interactive group w-full cursor-default rounded-2xl border border-white/15 bg-white/[0.08] p-7 shadow-lg backdrop-blur-lg dark:border-white/10 dark:bg-white/[0.04]">
                      <div className="flex items-start gap-5">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-white/20 bg-gradient-to-br from-blue-400/30 to-indigo-400/30 transition-transform duration-300 group-hover:scale-110">
                          <Icon className="h-6 w-6 text-blue-200" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="mb-1.5 text-base font-semibold text-white transition-colors duration-300 group-hover:text-blue-200">
                            {mod.title}
                          </h3>
                          <p className="text-sm leading-relaxed text-white/65">
                            {mod.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="mt-5 flex items-center justify-between">
            <button
              onClick={prevSlide}
              className="rounded-xl border border-white/15 bg-white/10 p-2 text-white/70 transition-all duration-200 hover:scale-105 hover:bg-white/20 hover:text-white active:scale-95"
              aria-label="Modulo anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Dot indicators */}
            <div className="flex gap-2">
              {MODULES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`rounded-full transition-all duration-300 ${
                    index === activeSlide
                      ? "h-2 w-6 bg-blue-400"
                      : "h-2 w-2 bg-white/30 hover:bg-white/50"
                  }`}
                  aria-label={`Ir para modulo ${index + 1}`}
                />
              ))}
            </div>

            <button
              onClick={nextSlide}
              className="rounded-xl border border-white/15 bg-white/10 p-2 text-white/70 transition-all duration-200 hover:scale-105 hover:bg-white/20 hover:text-white active:scale-95"
              aria-label="Proximo modulo"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ====== LADO DIREITO — Formulario ====== */}
      <div className="relative flex w-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 transition-colors duration-300 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 sm:p-8 lg:w-[55%]">
        {/* Background orbs visiveis apenas no mobile */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden">
          <div className="animate-blob absolute -left-20 top-1/4 h-96 w-96 rounded-full bg-gradient-to-r from-blue-200/50 to-cyan-200/50 blur-3xl dark:from-blue-900/30 dark:to-cyan-900/30"></div>
          <div className="animation-delay-2000 animate-blob absolute -right-20 bottom-1/4 h-96 w-96 rounded-full bg-gradient-to-r from-indigo-200/50 to-blue-200/50 blur-3xl dark:from-indigo-900/30 dark:to-blue-900/30"></div>
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(30,58,138,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(30,58,138,0.03)_1px,transparent_1px)] bg-[size:64px_64px] dark:bg-[linear-gradient(rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px)]"></div>

        {/* Card do formulario com Glassmorphism */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200/50 bg-white/80 px-8 pb-8 pt-12 shadow-[0_32px_80px_-8px_rgba(15,23,42,0.08),0_8px_24px_-4px_rgba(15,23,42,0.04)] backdrop-blur-2xl dark:border-gray-600/50 dark:bg-gray-800/80 dark:shadow-[0_32px_80px_-8px_rgba(0,0,0,0.35)]"
        >
          {/* Subtle glow effect behind card */}
          <div className="absolute -inset-1 -z-10 rounded-3xl bg-gradient-to-r from-blue-500/[0.15] via-indigo-500/[0.12] to-slate-500/[0.08] blur-xl dark:from-blue-500/10 dark:via-indigo-500/10 dark:to-slate-500/10"></div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="absolute right-4 top-4 z-20 rounded-xl bg-slate-100/80 p-2 text-slate-600 transition-all duration-200 hover:bg-slate-200 dark:bg-gray-700/80 dark:text-gray-300 dark:hover:bg-gray-600"
            aria-label="Alternar tema"
          >
            {isDarkMode ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          {/* Mobile logo — always visible on mobile */}
          <div className="mb-6 text-center lg:hidden">
            <div className="relative mb-4 inline-flex items-center justify-center">
              <div
                className="absolute h-28 w-28 animate-spin-slow rounded-full border-2 border-transparent"
                style={{
                  background:
                    "linear-gradient(white, white) padding-box, linear-gradient(to right, #1e3a8a, #3b82f6, #1e40af) border-box",
                  animationDuration: "8s",
                }}
              />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-slate-200 bg-white shadow-lg shadow-blue-900/10 backdrop-blur-md dark:border-gray-600 dark:bg-gray-700 dark:shadow-black/20">
                <Image
                  src={isDarkMode ? "/LOGO BRANCA.png" : "/LOGO.png"}
                  alt="Logo FlowLab"
                  width={64}
                  height={64}
                  className="h-16 w-16 object-contain transition-all duration-500 ease-out hover:scale-110 dark:brightness-110"
                  priority
                />
              </div>
            </div>
          </div>

          {/* ── Form area ── */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key="login"
              variants={formVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={springTransition}
            >
              <div className="mb-8 text-center">
                <h1 className="mb-1 text-4xl font-bold">
                  <span className="bg-gradient-to-r from-blue-900 via-blue-700 to-indigo-800 bg-clip-text text-transparent dark:from-white dark:via-gray-100 dark:to-white">
                    Bem-vindo
                  </span>
                </h1>
                <p className="text-sm text-slate-500 dark:text-gray-300">
                  Faca login para continuar no FlowLab
                </p>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
                  >
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-500 dark:bg-red-800 dark:text-red-300">
                      !
                    </span>
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="login-email"
                    className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-gray-300"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="login-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 backdrop-blur-sm transition-all duration-200 placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-gray-600 dark:bg-gray-900/50 dark:text-gray-100 dark:placeholder:text-gray-400 dark:hover:border-gray-500"
                    placeholder="seu@email.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-gray-300"
                  >
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="login-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-11 text-slate-800 backdrop-blur-sm transition-all duration-200 placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-gray-600 dark:bg-gray-900/50 dark:text-gray-100 dark:placeholder:text-gray-400 dark:hover:border-gray-500"
                      placeholder="••••••••"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="hover-lift flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 font-medium text-white shadow-md shadow-blue-500/25 transition-all duration-200 hover:from-blue-600 hover:to-blue-700 hover:shadow-lg hover:shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-blue-500/15 dark:hover:shadow-blue-500/20"
                >
                  {loading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Entrando...
                    </>
                  ) : (
                    <>
                      Entrar
                      <LogIn className="ml-2 h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
