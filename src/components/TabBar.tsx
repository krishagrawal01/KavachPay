import { ScanLine, Link2, Grid2X2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TabKey } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

interface TabBarProps {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

const TABS: {
  key: 'scanner' | 'links' | 'tools';
  label: 'scanQr' | 'smsLink' | 'moreTools';
  icon: LucideIcon;
}[] = [
  { key: 'scanner', label: 'scanQr', icon: ScanLine },
  { key: 'links', label: 'smsLink', icon: Link2 },
  { key: 'tools', label: 'moreTools', icon: Grid2X2 },
];

export function TabBar({ active, onChange }: TabBarProps) {
  const { t } = useI18n();
  const selectedTab =
    active === 'mule' || active === 'adaptive' || active === 'accuracy' || active === 'truthtrace'
      ? 'tools'
      : active;

  return (
    <nav
      aria-label="Main navigation"
      className="relative z-40 shrink-0 border-t border-border bg-white px-2 pt-1.5"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
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
              className={
                selected
                  ? 'tactile relative flex min-h-[58px] flex-col items-center justify-center gap-1.5 rounded-xl px-1.5 py-2 text-brand-blue transition-colors after:absolute after:inset-x-7 after:top-0 after:h-[3px] after:rounded-full after:bg-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/50'
                  : 'tactile relative flex min-h-[58px] flex-col items-center justify-center gap-1.5 rounded-xl px-1.5 py-2 text-ink-muted transition-colors hover:bg-obsidian/70 hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/50'
              }
            >
              <Icon size={20} strokeWidth={selected ? 2.3 : 1.9} aria-hidden="true" />
              <span className={selected ? 'text-[11px] font-bold leading-tight' : 'text-[11px] font-medium leading-tight'}>
                {t(tab.label)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
