"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, AlertCircle, Loader2, Building2 } from "lucide-react";
import { DEPARTAMENTOS } from "@/lib/constants";

export function CadastroForm() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!departamento) {
      setError("Selecione o departamento.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome, departamento_slug: departamento },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    router.push("/");
  };

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="font-display text-[30px] font-bold -tracking-[.02em] leading-tight">
          <span className="text-gradient-brand">Criar conta</span>
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Cadastre-se para acessar o FlowLab
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleCadastro} className="flex flex-col gap-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-300">
            Nome
          </label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            placeholder="Seu nome completo"
            className="w-full rounded-xl border border-gray-600 bg-gray-700 px-4 py-3 text-sm text-gray-100 placeholder-gray-500 outline-none transition-all focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,.15)]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-300">
            Departamento
          </label>
          <div className="relative">
            <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <select
              value={departamento}
              onChange={(e) => setDepartamento(e.target.value)}
              required
              className="w-full appearance-none rounded-xl border border-gray-600 bg-gray-700 py-3 pl-10 pr-10 text-sm text-gray-100 outline-none transition-all focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,.15)]"
            >
              <option value="" className="bg-gray-800 text-gray-400">
                Selecione seu departamento...
              </option>
              {Object.entries(DEPARTAMENTOS)
                .sort(([, a], [, b]) => a.localeCompare(b))
                .map(([slug, nome]) => (
                  <option key={slug} value={slug} className="bg-gray-800 text-gray-100">
                    {nome}
                  </option>
                ))}
            </select>
          </div>
        </div>

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
              minLength={6}
              placeholder="Minimo 6 caracteres"
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
          {loading ? "Criando conta..." : "Criar conta"}
        </button>
      </form>

      <div className="mt-8 flex flex-col items-center gap-3.5 text-center">
        <Link
          href="/login"
          className="text-sm font-medium text-white transition-colors hover:text-white/80"
        >
          Ja tem uma conta? Fazer login
        </Link>
      </div>
    </>
  );
}
