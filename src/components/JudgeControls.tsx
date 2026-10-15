import { useState } from 'react';
import { Key, FlaskConical, Info, Zap, MessageCircle } from 'lucide-react';
import { SCENARIOS } from '@/lib/scenarios';
import type { Scenario, TelemetryState } from '@/lib/types';

interface JudgeControlsProps {
  geminiKey: string;
  onGeminiKeyChange: (key: string) => void;
  onSelectScenario: (s: Scenario) => void;
  activeScenarioId: string | null;
  telemetry: TelemetryState;
  onTelemetryChange: (t: TelemetryState) => void;
  onSimulateWhatsApp: () => void;
}

export function JudgeControls({
  geminiKey,
  onGeminiKeyChange,
  onSelectScenario,
  activeScenarioId,
  telemetry,
  onTelemetryChange,
  onSimulateWhatsApp,
}: JudgeControlsProps) {
  const [keyInput, setKeyInput] = useState(geminiKey);

  return (
    <div className="space-y-4">
      {/* Gemini API Key */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Key size={12} className="text-amber-warn" />
          <span className="text-[10px] uppercase tracking-wider font-bold text-ink-muted">Gemini API Key (Optional)</span>
        </div>
        <input
          type="password"
          value={keyInput}
          onChange={e => setKeyInput(e.target.value)}
          onBlur={() => onGeminiKeyChange(keyInput)}
          placeholder="AIza..."
          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-[11px] font-mono text-ink-primary outline-none focus:border-amber-warn/40"
        />
        <p className="text-[9px] text-ink-dim leading-snug">
          For live AI shop-board vision. Without a key, the built-in offline analyzer runs deterministically.
        </p>
      </div>

      <div className="h-px bg-border" />

      {/* WhatsApp scam simulator */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <MessageCircle size={12} className="text-[#25D366]" fill="#25D366" />
          <span className="text-[10px] uppercase tracking-wider font-bold text-ink-muted">Scam Vector Simulator</span>
        </div>
        <button
          onClick={onSimulateWhatsApp}
          className="tactile w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] text-xs font-bold tracking-tight hover:bg-[#25D366]/15"
        >
          <MessageCircle size={16} fill="#25D366" /> Simulate Incoming Scam WhatsApp
        </button>
        <p className="text-[9px] text-ink-dim leading-snug">
          Slides down a realistic Android WhatsApp heads-up notification. Tapping "Scan in UPI" fires the Refund Trap scenario with full interception.
        </p>
      </div>

      <div className="h-px bg-border" />

      {/* Quick scenario triggers */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <FlaskConical size={12} className="text-npcigreen" />
          <span className="text-[10px] uppercase tracking-wider font-bold text-ink-muted">Instant Scenario Load</span>
        </div>
        {SCENARIOS.map(s => (
          <button
            key={s.id}
            onClick={() => onSelectScenario(s)}
            className={`tactile w-full text-left p-2.5 rounded-xl border transition-all ${
              activeScenarioId === s.id
                ? s.tag === 'SAFE'
                  ? 'bg-npcigreen/10 border-npcigreen/30 text-npcigreen'
                  : 'bg-crimson-fraud/10 border-crimson-fraud/30 text-crimson-fraud'
                : 'bg-surface border-border text-ink-muted hover:border-border-light'
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[9px] font-mono font-bold tracking-wider">
                {s.tag === 'SAFE' ? '[SAFE]' : `[SCAM ${s.tagNumber}]`}
              </span>
              {activeScenarioId === s.id && (
                <span className="text-[8px] font-bold uppercase animate-pulse">Active</span>
              )}
            </div>
            <div className="text-[11px] font-semibold tracking-tight">{s.label}</div>
            <div className="text-[9px] text-ink-dim mt-0.5 leading-snug">{s.description}</div>
          </button>
        ))}
      </div>

      <div className="h-px bg-border" />

      {/* Live telemetry quick-toggles */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Zap size={12} className="text-amber-warn" />
          <span className="text-[10px] uppercase tracking-wider font-bold text-ink-muted">Telemetry Override</span>
        </div>

        <button
          onClick={() => onTelemetryChange({ ...telemetry, callState: telemetry.callState === 'IDLE' ? 'ACTIVE_UNKNOWN' : 'IDLE' })}
          className={`tactile w-full flex items-center justify-between p-2.5 rounded-xl border text-[11px] font-semibold ${
            telemetry.callState === 'ACTIVE_UNKNOWN' ? 'bg-amber-warn/10 border-amber-warn/30 text-amber-warn' : 'bg-surface border-border text-ink-muted'
          }`}
        >
          <span>Call State</span>
          <span className="font-mono">{telemetry.callState === 'IDLE' ? 'IDLE' : 'ACTIVE'}</span>
        </button>

        <button
          onClick={() => onTelemetryChange({ ...telemetry, displaySecurity: telemetry.displaySecurity === 'SECURE' ? 'SCREEN_CAST_DETECTED' : 'SECURE' })}
          className={`tactile w-full flex items-center justify-between p-2.5 rounded-xl border text-[11px] font-semibold ${
            telemetry.displaySecurity === 'SCREEN_CAST_DETECTED' ? 'bg-crimson-fraud/10 border-crimson-fraud/30 text-crimson-fraud' : 'bg-surface border-border text-ink-muted'
          }`}
        >
          <span>Display Security</span>
          <span className="font-mono">{telemetry.displaySecurity === 'SECURE' ? 'SECURE' : 'CAST'}</span>
        </button>
      </div>

      <div className="h-px bg-border" />

      {/* Info */}
      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-surface border border-border">
        <Info size={12} className="text-ink-dim mt-0.5 shrink-0" />
        <p className="text-[10px] text-ink-muted leading-relaxed">
          URL auto-triggers: <span className="font-mono text-npcigreen">?scenario=refund_trap</span>, <span className="font-mono text-npcigreen">?scenario=screen_share</span>, <span className="font-mono text-npcigreen">?scenario=qr_swap</span>
        </p>
      </div>
    </div>
  );
}
