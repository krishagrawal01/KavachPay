import { useState } from 'react';
import { Phone, MonitorUp, MessageSquare, Store, ChevronDown, ChevronUp } from 'lucide-react';
import type { TelemetryState } from '@/lib/types';

interface TelemetryBarProps {
  state: TelemetryState;
  onChange: (state: TelemetryState) => void;
}

function TogglePill({
  active,
  activeLabel,
  inactiveLabel,
  activeColor,
  icon,
  onClick,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  activeColor: 'amber' | 'crimson' | 'green';
  icon: React.ReactNode;
  onClick: () => void;
}) {
  const colorMap = {
    amber: 'bg-amber-warn/15 border-amber-warn/40 text-amber-warn',
    crimson: 'bg-crimson-fraud/15 border-crimson-fraud/40 text-crimson-fraud',
    green: 'bg-npcigreen/15 border-npcigreen/40 text-npcigreen',
  };

  return (
    <button
      onClick={onClick}
      className={`tactile flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-semibold tracking-tight transition-all no-select ${
        active ? colorMap[activeColor] : 'bg-surface border-border text-ink-muted'
      }`}
    >
      {icon}
      <span className="truncate max-w-[140px]">{active ? activeLabel : inactiveLabel}</span>
      <div className={`w-1.5 h-1.5 rounded-full ${active ? `bg-current ${activeColor === 'crimson' ? 'animate-flash-crimson' : 'animate-pulse'}` : 'bg-ink-dim'}`} />
    </button>
  );
}

function EditablePill({
  label,
  value,
  icon,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value);

  return (
    <div className="flex items-start gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface">
      <div className="text-ink-muted mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[9px] uppercase tracking-wider text-ink-dim font-semibold mb-0.5">{label}</div>
        {editing ? (
          <input
            autoFocus
            value={temp}
            onChange={e => setTemp(e.target.value)}
            onBlur={() => { onChange(temp); setEditing(false); }}
            onKeyDown={e => { if (e.key === 'Enter') { onChange(temp); setEditing(false); } }}
            className="w-full bg-transparent text-[11px] text-ink-primary font-medium outline-none border-b border-border"
            placeholder={placeholder}
          />
        ) : (
          <button
            onClick={() => { setTemp(value); setEditing(true); }}
            className="text-left text-[11px] text-ink-primary font-medium truncate block w-full hover:text-npcigreen transition-colors"
          >
            {value || placeholder}
          </button>
        )}
      </div>
    </div>
  );
}

export function TelemetryBar({ state, onChange }: TelemetryBarProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border-b border-border bg-surface/50">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 no-select tactile"
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${state.callState === 'ACTIVE_UNKNOWN' || state.displaySecurity === 'SCREEN_CAST_DETECTED' ? 'bg-amber-warn animate-pulse' : 'bg-npcigreen'}`} />
          </div>
          <span className="text-[10px] uppercase tracking-wider font-bold text-ink-muted">Android OS Telemetry</span>
        </div>
        {expanded ? <ChevronUp size={14} className="text-ink-dim" /> : <ChevronDown size={14} className="text-ink-dim" />}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2 animate-fade-in">
          {/* Call State Toggle */}
          <TogglePill
            active={state.callState === 'ACTIVE_UNKNOWN'}
            activeLabel="ACTIVE UNKNOWN CALL (+91 9821••XXXX - VoIP)"
            inactiveLabel="Call IDLE"
            activeColor="amber"
            icon={<Phone size={12} />}
            onClick={() => onChange({ ...state, callState: state.callState === 'IDLE' ? 'ACTIVE_UNKNOWN' : 'IDLE' })}
          />

          {/* Display Security Toggle */}
          <div>
            <TogglePill
              active={state.displaySecurity === 'SCREEN_CAST_DETECTED'}
              activeLabel="SCREEN CAST / ANYDESK OVERLAY DETECTED"
              inactiveLabel="Display SECURE"
              activeColor="crimson"
              icon={<MonitorUp size={12} />}
              onClick={() => onChange({ ...state, displaySecurity: state.displaySecurity === 'SECURE' ? 'SCREEN_CAST_DETECTED' : 'SECURE' })}
            />
            {state.displaySecurity === 'SCREEN_CAST_DETECTED' && (
              <div className="mt-1 px-3 py-1 rounded-md bg-crimson-fraud/10 border border-crimson-fraud/30">
                <span className="text-[10px] font-mono font-semibold text-crimson-fraud animate-flash-crimson">
                  ⚠ FLAG_SECURE BYPASS ATTEMPT
                </span>
              </div>
            )}
          </div>

          {/* Chat Context */}
          <EditablePill
            label="Clipboard / Notification Context"
            value={state.chatContext}
            icon={<MessageSquare size={12} />}
            onChange={v => onChange({ ...state, chatContext: v })}
            placeholder="Tap to paste SMS/WhatsApp message..."
          />

          {/* Shop Signboard OCR */}
          <EditablePill
            label="Shop Signboard OCR"
            value={state.shopSignboard}
            icon={<Store size={12} />}
            onChange={v => onChange({ ...state, shopSignboard: v })}
            placeholder="Tap to enter shop signboard text..."
          />
        </div>
      )}
    </div>
  );
}
