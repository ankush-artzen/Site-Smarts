"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  inviteSessionSchema,
  setPasswordSchema,
} from "@/lib/validation/auth";

import type { ActionResult } from "@/lib/actions/organizations";

export async function establishInviteSession(
  input: unknown
): Promise<ActionResult> {
  const parsed = inviteSessionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "This invitation link is invalid or has expired.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: "invite",
    token_hash: parsed.data.tokenHash,
  });

  if (error) {
    console.error("establishInviteSession failed:", error.message);
    return {
      ok: false,
      error: "This invitation link is invalid or has expired.",
    };
  }

  return { ok: true, data: undefined };
}

export async function setInvitedPassword(input: unknown): Promise<ActionResult> {
  const parsed = setPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid password",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "Your invitation session expired. Open the email link again.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    console.error("setInvitedPassword failed:", error.message);
    return {
      ok: false,
      error: error.message || "Could not save the password",
    };
  }

  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) {
    console.error("Sign out after password set failed:", signOutError.message);
  }

  revalidatePath("/", "layout");
  redirect("/login?notice=password_set");
}

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
