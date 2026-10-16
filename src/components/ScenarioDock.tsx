import { Skull, MonitorSmartphone } from 'lucide-react';
import { KavachMark, RiskAlertMark } from '@/components/KavachIcons';
import { SCENARIOS } from '@/lib/scenarios';
import type { Scenario } from '@/lib/types';

interface ScenarioDockProps {
  activeId: string | null;
  onSelect: (scenario: Scenario) => void;
}

const TAG_STYLES = {
  SAFE: {
    bg: 'bg-npcigreen/10 border-npcigreen/30',
    text: 'text-npcigreen',
    icon: KavachMark,
  },
  SCAM: {
    bg: 'bg-crimson-fraud/10 border-crimson-fraud/30',
    text: 'text-crimson-fraud',
    icon: RiskAlertMark,
  },
};

export function ScenarioDock({ activeId, onSelect }: ScenarioDockProps) {
  return (
    <div className="px-4 py-3 border-t border-border bg-surface/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider font-bold text-ink-muted">Live Judge Scenarios</span>
        <span className="text-[9px] text-ink-dim font-mono">One-tap demo</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {SCENARIOS.map(s => {
          const style = TAG_STYLES[s.tag];
  const Icon = s.tag === 'SAFE' ? KavachMark : s.tagNumber === 3 ? MonitorSmartphone : s.tagNumber === 2 ? Skull : RiskAlertMark;
          const isActive = activeId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className={`tactile flex flex-col items-start gap-1.5 p-2.5 rounded-xl border text-left transition-all ${
                isActive
                  ? `${style.bg} ${style.text} ring-1 ring-current`
                  : 'bg-surface border-border text-ink-muted hover:border-border-light'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Icon size={14} className={isActive ? style.text : 'text-ink-dim'} />
                <span className={`text-[9px] font-mono font-bold tracking-wider ${isActive ? style.text : 'text-ink-dim'}`}>
                  {s.tag === 'SAFE' ? '[SAFE]' : `[SCAM ${s.tagNumber}]`}
                </span>
              </div>
              <span className={`text-[11px] font-semibold tracking-tight leading-tight ${isActive ? 'text-ink-primary' : ''}`}>
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
