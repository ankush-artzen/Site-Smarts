import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { createClient } from "@/lib/supabase/server";

function LandingPage() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(224,138,18,0.22),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(31,122,108,0.18),transparent_40%),linear-gradient(180deg,#f2f6f8_0%,#e7eef2_100%)]"
      />
      <div
        aria-hidden
        className="sun-orb pointer-events-none absolute -right-16 top-10 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(224,138,18,0.45),transparent_70%)] blur-2xl"
      />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <BrandMark />
        <Link
          href="/login"
          className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal"
        >
          Sign in
        </Link>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 pb-20 pt-10">
        <p className="animate-rise text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">
          Solarshed platform
        </p>
        <h1 className="animate-rise-delay mt-4 max-w-3xl font-display text-5xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl md:text-7xl">
          Site Smarts
        </h1>
        <p className="animate-rise-delay-2 mt-5 max-w-xl text-lg leading-8 text-muted">
          Monitor solar sites, catch production dips early, and keep every plant
          visible from one operations view.
        </p>
        <div className="animate-rise-delay-2 mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(196,111,8,0.28)] transition hover:bg-accent-strong"
          >
            Open monitoring
          </Link>
          <a
            href="#capabilities"
            className="rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-foreground transition hover:border-teal hover:text-teal"
          >
            See capabilities
          </a>
        </div>
      </section>

      <section
        id="capabilities"
        className="relative z-10 border-t border-border/70 bg-surface/70 backdrop-blur"
      >
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-3">
          {[
            {
              title: "Live production",
              copy: "Track output curves and site health as telemetry comes online.",
            },
            {
              title: "Portfolio clarity",
              copy: "Compare plants, storage, and efficiency from a single dashboard.",
            },
            {
              title: "Secure access",
              copy: "Supabase auth keeps operator sessions locked to your workspace.",
            },
          ].map((item) => (
            <div key={item.title}>
              <h2 className="font-display text-xl font-semibold text-foreground">
                {item.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">{item.copy}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

async function HomeWithAuthGate() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return <LandingPage />;
}

export default function HomePage() {
  return (
    <Suspense fallback={<LandingPage />}>
      <HomeWithAuthGate />
    </Suspense>
  );
}
