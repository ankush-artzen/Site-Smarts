import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Separate browser client for invitation links.
 * The shared client always uses PKCE and rejects the implicit
 * access-token fragment Supabase appends to invite redirects.
 * This client skips that automatic parse so the page can call setSession.
 */
export function createInviteSessionClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      isSingleton: false,
      auth: {
        detectSessionInUrl: false,
      },
    }
  );
}