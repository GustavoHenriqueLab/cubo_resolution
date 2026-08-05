"use server";

import { revalidatePath } from "next/cache";
import { updateUserDepartment } from "@/lib/queries";

export async function handleDepartmentChange(formData: FormData) {
  const depto = formData.get("departamento") as string;
  const userId = formData.get("userId") as string;

  await updateUserDepartment(userId, depto || null);
  revalidatePath("/admin/usuarios");
}
