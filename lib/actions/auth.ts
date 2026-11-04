"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function signOut(): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Authentication logout failed:", error.message);
    redirect("/dashboard?error=logout_failed");
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
