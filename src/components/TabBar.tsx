import { ScanLine, Link2, Grid2X2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TabKey } from '@/lib/types';

interface TabBarProps {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

const TABS: {
  key: 'scanner' | 'links' | 'tools';
  label: string;
  icon: LucideIcon;
}[] = [
  { key: 'scanner', label: 'Scan QR', icon: ScanLine },
  { key: 'links', label: 'Check SMS/Link', icon: Link2 },
  { key: 'tools', label: 'More tools', icon: Grid2X2 },
];

export function TabBar({ active, onChange }: TabBarProps) {
  const selectedTab =
    active === 'mule' || active === 'adaptive' || active === 'accuracy' || active === 'truthtrace' ? 'tools' : active;

  return (
    <nav
      aria-label="Main navigation"
      className="relative z-40 shrink-0 border-t border-border bg-white/95 px-3 pt-2 backdrop-blur-md"
      style={{
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="grid grid-cols-3 gap-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const selected = selectedTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              aria-current={selected ? 'page' : undefined}
              className={`tactile flex min-h-[54px] flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-2 transition-colors ${
                selected
                  ? 'bg-brand-pale text-brand-blue'
                  : 'text-ink-muted hover:bg-obsidian hover:text-ink-primary'
              }`}
            >
              <Icon size={19} strokeWidth={selected ? 2.4 : 2} />

              <span className="text-[11px] font-semibold leading-none">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}