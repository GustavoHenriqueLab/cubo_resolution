"use server";

import { revalidatePath } from "next/cache";
import { updateUserRole } from "@/lib/queries";

const ROLES = ["admin", "manager", "viewer"] as const;

export async function handleRoleChange(formData: FormData) {
  const userId = formData.get("userId") as string;
  const role = formData.get("role") as string;

  if (!ROLES.includes(role as (typeof ROLES)[number])) {
    throw new Error("Role invalida");
  }

  await updateUserRole(userId, role as (typeof ROLES)[number]);
  revalidatePath("/admin/usuarios");
}
