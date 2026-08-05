"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
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
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("nome, role, departamento_slug")
        .eq("id", user.id)
        .single();

      const profileData = data as { nome: string | null; role: string; departamento_slug: string | null } | null;
      if (profileData) {
        setProfile({ nome: profileData.nome, role: profileData.role, email: user.email ?? null, departamento_slug: profileData.departamento_slug ?? null });
      } else {
        setProfile({ nome: null, role: "viewer", email: user.email ?? null, departamento_slug: null });
      }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <UserContext.Provider value={{ profile, isAdmin: profile?.role === "admin", loading }}>
      {children}
    </UserContext.Provider>
  );
}
