export function DashboardLoadingState({
  message = "Checking your session…",
}: {
  message?: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center shadow-[var(--shadow)]">
        <p className="font-display text-lg font-semibold text-foreground">
          Loading Site Smarts
        </p>
        <p className="mt-2 text-sm text-muted">{message}</p>
      </div>
    </div>
  );
}
