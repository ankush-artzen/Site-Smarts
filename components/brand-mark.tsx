type BrandMarkProps = {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  tone?: "default" | "onDark";
  className?: string;
};

const sizes = {
  sm: "h-8 w-8 text-sm",
  md: "h-11 w-11 text-lg",
  lg: "h-14 w-14 text-xl",
};

export function BrandMark({
  size = "md",
  showWordmark = true,
  tone = "default",
  className = "",
}: BrandMarkProps) {
  const titleClass =
    tone === "onDark" ? "text-white" : "text-foreground";
  const subtitleClass =
    tone === "onDark" ? "text-white/65" : "text-muted";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`relative flex ${sizes[size]} items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#e08a12_0%,#c46f08_55%,#1f7a6c_140%)] text-white shadow-[0_10px_24px_rgba(196,111,8,0.28)]`}
        aria-hidden
      >
        <span className="sun-orb absolute inset-1 rounded-xl bg-white/15" />
        <span className="relative font-display font-bold">S</span>
      </div>
      {showWordmark ? (
        <div className="leading-tight">
          <p
            className={`font-display text-lg font-semibold tracking-tight ${titleClass}`}
          >
            Site Smarts
          </p>
          <p className={`text-xs ${subtitleClass}`}>Solarshed monitoring</p>
        </div>
      ) : null}
    </div>
  );
}
