import { useEffect, useState, useRef } from 'react';
import { Volume2, VolumeX, RefreshCw, Clock, Phone } from 'lucide-react';
import { RiskAlertMark } from '@/components/KavachIcons';
import type { ParsedUPI, RiskAssessment } from '@/lib/types';
import { formatAmount } from '@/lib/upi';
import { playWarningChime, triggerHaptics, speakWarning, stopSpeech, replaySpeech } from '@/lib/audio';

interface InterceptionShieldProps {
  parsed: ParsedUPI;
  assessment: RiskAssessment;
  muted: boolean;
  onToggleMute: () => void;
  onBlock: () => void;
  onOverride: () => void;
  onDismiss: () => void;
}

export function InterceptionShield({
  parsed,
  assessment,
  muted,
  onToggleMute,
  onBlock,
  onOverride,
  onDismiss,
}: InterceptionShieldProps) {
  const [countdown, setCountdown] = useState(5);
  const [countdownDone, setCountdownDone] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const amount = formatAmount(parsed.am);

  // Audio + haptics + voice on mount
  useEffect(() => {
    playWarningChime();
    triggerHaptics([300, 100, 300, 100, 500]);
    speakWarning(amount, muted);

    // Countdown timer
    setCountdown(5);
    setCountdownDone(false);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setCountdownDone(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      stopSpeech();
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    };
  }, [amount, muted]);

  // Hold-to-override logic
  useEffect(() => {
    if (holding && countdownDone) {
      const start = Date.now();
      holdTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - start;
        const pct = Math.min(100, (elapsed / 3000) * 100);
        setHoldProgress(pct);
        if (pct >= 100) {
          if (holdTimerRef.current) clearInterval(holdTimerRef.current);
          onOverride();
        }
      }, 50);
    } else {
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
      setHoldProgress(0);
    }

    return () => {
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    };
  }, [holding, countdownDone, onOverride]);

  const startHold = () => { if (countdownDone) setHolding(true); };
  const stopHold = () => setHolding(false);

  return (
    <div className="fixed inset-0 z-[100] bg-obsidian/95 backdrop-blur-sm flex flex-col animate-fade-in">
      {/* Warning chime header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <RiskAlertMark size={20} className="text-crimson-fraud animate-flash-crimson" />
          <span className="text-[10px] font-mono font-bold text-crimson-fraud tracking-wider uppercase animate-flash-crimson">
            Pre-PIN Interception Active
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => replaySpeech(amount, muted)}
            className="tactile p-1.5 rounded-lg bg-surface border border-border text-ink-muted"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={onToggleMute}
            className="tactile p-1.5 rounded-lg bg-surface border border-border text-ink-muted"
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scroll-hide px-4 pb-4 space-y-3">
        {/* Main risk banner */}
        <div className="rounded-2xl border-2 border-crimson-fraud/50 bg-crimson-fraud/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <RiskAlertMark size={16} className="text-crimson-fraud" />
            <span className="text-[10px] font-mono font-bold text-crimson-fraud tracking-wider uppercase">Composite Risk: {assessment.compositeScore}% — BLOCKED</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold">Direction:</span>
              <span className="text-xs font-bold text-crimson-fraud tracking-tight">DEBIT (MONEY GOING OUT)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold">Reality:</span>
              <span className="text-xs font-bold text-ink-primary tracking-tight">YOU WILL LOSE ₹{amount} — YOU ARE NOT RECEIVING MONEY</span>
            </div>
          </div>
        </div>

        {/* Voice transcript */}
        <div className="rounded-xl bg-surface border border-border p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Volume2 size={12} className="text-npcigreen" />
            <span className="text-[9px] uppercase tracking-wider font-bold text-npcigreen">Hinglish Voice Alert</span>
          </div>
          <p className="text-xs text-ink-primary leading-relaxed font-medium">
            "Savdhaan! Payment blocked before UPI PIN. This QR code will <span className="text-crimson-fraud font-bold">DEBIT Rupees {amount}</span> from your bank account, <span className="text-crimson-fraud font-bold">NOT credit it</span>."
          </p>
        </div>

        {/* Triggered vectors summary */}
        <div className="rounded-xl bg-surface border border-border p-3">
          <div className="text-[10px] uppercase tracking-wider font-bold text-ink-muted mb-2">Triggered Risk Vectors</div>
          <div className="space-y-1.5">
            {assessment.vectors.filter(v => v.triggered).map(v => (
              <div key={v.id} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-crimson-fraud mt-1.5 shrink-0" />
                <div className="flex-1">
                  <span className="text-[11px] font-semibold text-ink-primary">{v.label}</span>
                  <span className="text-[10px] font-mono text-crimson-fraud ml-1">+{v.weight}%</span>
                  <p className="text-[10px] text-ink-muted leading-snug mt-0.5">{v.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cognitive friction — countdown */}
        <div className="rounded-xl bg-elevated border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className={countdownDone ? 'text-ink-muted' : 'text-amber-warn'} />
            <span className="text-[10px] uppercase tracking-wider font-bold text-ink-muted">
              {countdownDone ? 'Cooling-off period complete' : 'Mandatory 5-Second Cooling-Off'}
            </span>
          </div>

          {!countdownDone ? (
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" fill="none" stroke="#222631" strokeWidth="3" />
                  <circle
                    cx="24" cy="24" r="20" fill="none" stroke="#FFB020" strokeWidth="3"
                    strokeDasharray={`${2 * Math.PI * 20}`}
                    strokeDashoffset={`${2 * Math.PI * 20 * (1 - countdown / 5)}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-mono text-lg font-bold text-amber-warn tabular-nums">{countdown}</span>
                </div>
              </div>
              <p className="text-[11px] text-ink-muted leading-snug flex-1">
                Waiting to unlock override. This delay protects you from acting under phone coercion.
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-ink-muted leading-snug mb-3">
              Override is now unlocked. You must <span className="text-amber-warn font-bold">hold the button for 3 full seconds</span> to proceed — this prevents reflexive taps under pressure.
            </p>
          )}
        </div>
      </div>

      {/* Bottom action area */}
      <div className="px-4 pb-5 pt-2 border-t border-border bg-obsidian space-y-2.5">
        {/* Primary: Block & Report */}
        <button
          onClick={onBlock}
          className="tactile w-full py-3.5 rounded-2xl bg-crimson-fraud text-white font-bold text-sm tracking-tight flex items-center justify-center gap-2 hover:brightness-110"
        >
          <Phone size={16} /> BLOCK PAYEE & REPORT TO CYBERCRIME (1930)
        </button>

        {/* Hold-to-override */}
        <button
          onMouseDown={startHold}
          onMouseUp={stopHold}
          onMouseLeave={stopHold}
          onTouchStart={startHold}
          onTouchEnd={stopHold}
          disabled={!countdownDone}
          className={`tactile w-full py-3 rounded-2xl border-2 font-semibold text-xs tracking-tight transition-all relative overflow-hidden ${
            countdownDone
              ? 'border-amber-warn/40 text-amber-warn bg-amber-warn/5'
              : 'border-border text-ink-dim bg-surface'
          }`}
        >
          {holdProgress > 0 && (
            <div
              className="absolute inset-0 bg-amber-warn/20 transition-all"
              style={{ width: `${holdProgress}%` }}
            />
          )}
          <span className="relative">
            {countdownDone
              ? holdProgress > 0
                ? `Keep Holding... ${Math.round(holdProgress / 33.3)}s`
                : 'Hold for 3 Seconds to Override Risk & Proceed to UPI PIN'
              : `Override locked — ${countdown}s cooling-off remaining`}
          </span>
        </button>

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="tactile w-full py-2 text-[11px] text-ink-dim font-medium hover:text-ink-muted"
        >
          Close Shield
        </button>
      </div>
    </div>
  );
}
