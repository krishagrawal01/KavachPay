import { useState, useEffect } from 'react';
import { ShieldCheck, Delete, Check, Lock } from 'lucide-react';
import type { ParsedUPI } from '@/lib/types';
import { formatAmount } from '@/lib/upi';

interface UpiPinPadProps {
  parsed: ParsedUPI;
  onComplete: () => void;
  onCancel: () => void;
}

export function UpiPinPad({ parsed, onComplete, onCancel }: UpiPinPadProps) {
  const [pin, setPin] = useState<string>('');
  const [status, setStatus] = useState<'entering' | 'processing' | 'success'>('entering');

  const handleDigit = (d: string) => {
    if (pin.length >= 6 || status !== 'entering') return;
    const newPin = pin + d;
    setPin(newPin);
    if (newPin.length === 6) {
      setStatus('processing');
      setTimeout(() => {
        setStatus('success');
        setTimeout(() => onComplete(), 1200);
      }, 1500);
    }
  };

  const handleDelete = () => {
    if (status !== 'entering') return;
    setPin(pin.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-obsidian flex flex-col animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-npcigreen" />
          <span className="text-[10px] font-mono font-bold text-ink-muted tracking-wider uppercase">UPI PIN Entry</span>
        </div>
        <button onClick={onCancel} className="tactile text-ink-dim text-xs hover:text-ink-muted">Cancel</button>
      </div>

      {/* Merchant verification banner */}
      <div className="mx-4 mt-4 rounded-xl bg-npcigreen/10 border border-npcigreen/30 p-3">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={16} className="text-npcigreen" />
          <span className="text-xs font-bold text-npcigreen tracking-tight">KavachPay Verified Safe</span>
        </div>
        <div className="text-[10px] text-ink-muted leading-relaxed">
          Merchant Code <span className="font-mono text-npcigreen font-bold">{parsed.mc || '5912'}</span> Confirmed · NPCI UPI Secure Channel
        </div>
      </div>

      {/* Payee + amount */}
      <div className="px-4 mt-4 text-center">
        <div className="text-[10px] uppercase tracking-wider text-ink-dim font-semibold mb-1">Paying</div>
        <div className="text-lg font-bold text-ink-primary tracking-tight">{parsed.pn}</div>
        <div className="font-mono text-2xl font-bold text-ink-primary tabular-nums mt-1">₹{formatAmount(parsed.am)}</div>
        <div className="text-[10px] font-mono text-ink-muted mt-1">{parsed.pa}</div>
      </div>

      {/* PIN dots */}
      <div className="px-4 mt-6 flex justify-center gap-3">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
              status === 'success'
                ? 'bg-npcigreen border-npcigreen'
                : i < pin.length
                ? 'bg-npcigreen border-npcigreen'
                : 'border-border-light bg-transparent'
            }`}
          />
        ))}
      </div>

      {/* Status text */}
      <div className="text-center mt-3 h-5">
        {status === 'entering' && (
          <span className="text-[11px] text-ink-muted font-medium">
            {pin.length === 0 ? 'Enter 6-digit UPI PIN' : `${6 - pin.length} digits remaining`}
          </span>
        )}
        {status === 'processing' && (
          <span className="text-[11px] text-amber-warn font-semibold flex items-center justify-center gap-1.5">
            <div className="w-3 h-3 border-2 border-amber-warn border-t-transparent rounded-full animate-spin" />
            Verifying PIN...
          </span>
        )}
        {status === 'success' && (
          <span className="text-[11px] text-npcigreen font-bold flex items-center justify-center gap-1.5">
            <Check size={14} /> Payment Successful
          </span>
        )}
      </div>

      {/* Number pad */}
      <div className="flex-1 flex flex-col justify-end px-6 pb-6">
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key, i) => {
            if (key === '') return <div key={i} />;
            if (key === 'del') {
              return (
                <button
                  key={i}
                  onClick={handleDelete}
                  disabled={pin.length === 0 || status !== 'entering'}
                  className="tactile h-14 flex items-center justify-center text-ink-muted disabled:opacity-20"
                >
                  <Delete size={22} />
                </button>
              );
            }
            return (
              <button
                key={i}
                onClick={() => handleDigit(key)}
                disabled={status !== 'entering'}
                className="tactile h-14 flex items-center justify-center text-2xl font-mono font-semibold text-ink-primary rounded-xl bg-surface border border-border hover:border-border-light hover:bg-elevated disabled:opacity-30 no-select"
              >
                {key}
              </button>
            );
          })}
        </div>
        <p className="text-center text-[9px] text-ink-dim mt-4 font-mono">
          NPCI UPI · Bank-grade encryption · KavachPay Shield
        </p>
      </div>
    </div>
  );
}
