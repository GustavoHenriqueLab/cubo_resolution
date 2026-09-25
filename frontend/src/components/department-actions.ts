"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateUserDepartment } from "@/lib/queries";

export async function handleDepartmentChange(formData: FormData) {
  const depto = formData.get("departamento") as string;
  const userId = formData.get("userId") as string;

  if (!depto) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if ((data as { role?: string } | null)?.role === "manager") {
      throw new Error("Gestor precisa ter um departamento definido.");
    }
  }

  await updateUserDepartment(userId, depto || null);
  revalidatePath("/admin/usuarios");
}
