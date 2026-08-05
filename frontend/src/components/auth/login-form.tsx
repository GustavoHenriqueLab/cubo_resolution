"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError(
        loginError.message === "Invalid login credentials"
          ? "Email ou senha incorretos."
          : loginError.message,
      );
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  };

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="font-display text-[30px] font-bold -tracking-[.02em] leading-tight">
          <span className="text-gradient-brand">Bem-vindo</span>
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Faca login para continuar no FlowLab
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="flex flex-col gap-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-300">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="seu@email.com"
            className="w-full rounded-xl border border-gray-600 bg-gray-700 px-4 py-3 text-sm text-gray-100 placeholder-gray-500 outline-none transition-all focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,.15)]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-300">
            Senha
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-xl border border-gray-600 bg-gray-700 py-3 pl-4 pr-11 text-sm text-gray-100 placeholder-gray-500 outline-none transition-all focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,.15)]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-600"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white shadow-blue-glow transition-all hover:shadow-blue-glow-lg disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: "var(--grad-primary-btn)" }}
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <div className="mt-8 flex flex-col items-center gap-3.5 text-center">
        <Link
          href="/cadastro"
          className="text-sm font-medium text-white transition-colors hover:text-white/80"
        >
          Nao tem uma conta? Cadastre-se
        </Link>
        {/* <button className="text-sm text-slate-500 transition-colors hover:text-slate-600">
          Esqueci minha senha
        </button> */}
      </div>
    </>
  );
}
