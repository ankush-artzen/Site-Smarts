import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — server only. Never import from Client Components.
 * Used for privileged auth work (send an invitation email, resolve an existing user by email).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase admin credentials");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
