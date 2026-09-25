"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateUserRole } from "@/lib/queries";

const ROLES = ["admin", "manager", "viewer"] as const;

export async function handleRoleChange(formData: FormData) {
  const userId = formData.get("userId") as string;
  const role = formData.get("role") as string;

  if (!ROLES.includes(role as (typeof ROLES)[number])) {
    throw new Error("Role invalida");
  }

  if (role === "manager") {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("departamento_slug")
      .eq("id", userId)
      .maybeSingle();

    const departamento = (data as { departamento_slug?: string | null } | null)
      ?.departamento_slug;

    if (!departamento) {
      throw new Error("Defina o departamento antes de tornar gestor.");
    }
  }

  await updateUserRole(userId, role as (typeof ROLES)[number]);
  revalidatePath("/admin/usuarios");
}
