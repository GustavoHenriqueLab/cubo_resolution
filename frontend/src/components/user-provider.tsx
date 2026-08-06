"use client";

import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

interface UserContextType {
  profile: { nome: string | null; role: string; email: string | null; departamento_slug: string | null } | null;
  isAdmin: boolean;
  loading: boolean;
}

const UserContext = createContext<UserContextType>({
  profile: null,
  isAdmin: false,
  loading: true,
});

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<{ nome: string | null; role: string; email: string | null; departamento_slug: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("nome, role, departamento_slug")
        .eq("id", session.user.id)
        .single();

      if (cancelled) return;

      const profileData = data as { nome: string | null; role: string; departamento_slug: string | null } | null;
      if (profileData) {
        setProfile({ nome: profileData.nome, role: profileData.role, email: session.user.email ?? null, departamento_slug: profileData.departamento_slug ?? null });
      } else {
        setProfile({ nome: null, role: "viewer", email: session.user.email ?? null, departamento_slug: null });
      }
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const value = useMemo(() => ({
    profile,
    isAdmin: profile?.role === "admin",
    loading,
  }), [profile, loading]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}
