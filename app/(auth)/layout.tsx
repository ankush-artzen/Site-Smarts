import { BrandMark } from "@/components/brand-mark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col lg:grid lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-[linear-gradient(155deg,#0b1f2a_0%,#164a45_55%,#c46f08_140%)] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="sun-orb absolute -right-10 top-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(255,210,120,0.45),transparent_70%)]"
        />
        <BrandMark tone="onDark" className="relative z-10" />
        <div className="relative z-10 max-w-md">
          <h1 className="font-display text-4xl font-semibold leading-tight">
            Keep every solar site in view.
          </h1>
          <p className="mt-4 text-base leading-7 text-white/75">
            Sign in to Site Smarts for production monitoring, plant status, and
            day-ahead operational clarity.
          </p>
        </div>
        <p className="relative z-10 text-sm text-white/55">
          Built for Solarshed operators
        </p>
      </aside>

      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-10">
        <div className="mx-auto mb-8 w-full max-w-md lg:hidden">
          <BrandMark />
        </div>
        {children}
      </div>
    </div>
  );
}
