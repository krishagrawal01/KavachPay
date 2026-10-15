import { useEffect, useState } from 'react';

interface StatusBarProps {
  callActive: boolean;
  screenShareActive: boolean;
}

export function StatusBar({ callActive, screenShareActive }: StatusBarProps) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes().toString().padStart(2, '0');
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      setTime(`${h12}:${m}`);
      void ampm;
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hidden sm:flex items-center justify-between px-5 pt-2.5 pb-1.5 bg-obsidian no-select">
      {/* Left: Time */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[13px] font-semibold text-ink-primary tabular-nums">
          {time}
        </span>
        {/* Android 15 privacy indicator */}
        {(callActive || screenShareActive) && (
          <div className="flex items-center gap-1 ml-1">
            {callActive && (
              <div className="w-1.5 h-1.5 rounded-full bg-amber-warn animate-pulse" />
            )}
            {screenShareActive && (
              <div className="w-1.5 h-1.5 rounded-full bg-crimson-fraud animate-pulse" />
            )}
          </div>
        )}
      </div>

      {/* Right: System icons */}
      <div className="flex items-center gap-1.5">
        {/* Signal */}
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none" className="text-ink-primary">
          <rect x="0" y="8" width="3" height="4" rx="0.5" fill="currentColor" />
          <rect x="4.5" y="5.5" width="3" height="6.5" rx="0.5" fill="currentColor" />
          <rect x="9" y="3" width="3" height="9" rx="0.5" fill="currentColor" />
          <rect x="13.5" y="0.5" width="2.5" height="11.5" rx="0.5" fill="currentColor" opacity="0.4" />
        </svg>
        {/* 5G */}
        <span className="text-[10px] font-bold text-ink-primary tracking-tight">5G</span>
        {/* Battery */}
        <div className="flex items-center gap-0.5">
          <div className="relative w-6 h-3 rounded-[3px] border border-ink-muted/60 flex items-center px-[1px]">
            <div className="h-1.5 w-[16px] rounded-[1px] bg-ink-primary" />
          </div>
          <div className="w-0.5 h-1.5 rounded-r-sm bg-ink-muted/60" />
        </div>
      </div>
    </div>
  );
}
