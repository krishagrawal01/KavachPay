interface PhoneShellProps {
  children: React.ReactNode;
  callActive: boolean;
  screenShareActive: boolean;
}

export function PhoneShell({ children }: PhoneShellProps) {
  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-obsidian sm:px-4 sm:py-6">
      <main className="mx-auto flex h-full min-h-0 w-full max-w-[480px] flex-col overflow-hidden bg-surface sm:h-[calc(100dvh-3rem)] sm:rounded-[28px] sm:border sm:border-border sm:shadow-floating">
        {children}
      </main>
    </div>
  );
}

interface JudgePanelProps {
  children: React.ReactNode;
  open: boolean;
  onClose: () => void;
}

export function JudgePanel({ children, open, onClose }: JudgePanelProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-5">
      <button
        type="button"
        aria-label="Close advanced settings"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <section className="relative z-10 flex max-h-[88vh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-3xl border border-border bg-surface shadow-floating sm:max-h-[85vh] sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-ink-primary">
              Demo &amp; advanced tools
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              For testing and hackathon demonstrations
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-obsidian text-ink-muted hover:text-ink-primary"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              ×
            </span>
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5">{children}</div>
      </section>
    </div>
  );
}