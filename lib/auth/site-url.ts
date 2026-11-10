import { headers } from "next/headers";

/**
 * Origin used in invitation links. Prefer NEXT_PUBLIC_SITE_URL in production
 * so a forwarded Host header cannot point the email at another site.
 * The value must also be listed under Supabase Auth → Redirect URLs.
 */
export async function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";

  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}
