import { useEffect, useState } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { MessageSafetyMark } from '@/components/KavachIcons';

interface WhatsAppPopupProps {
  message: string;
  sender: string;
  onTapToScan: () => void;
  onDismiss: () => void;
}

export function WhatsAppPopup({ message, sender, onTapToScan, onDismiss }: WhatsAppPopupProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const enterTimer = setTimeout(() => setVisible(true), 50);
    const autoTimer = setTimeout(() => handleDismiss(), 12000);
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(autoTimer);
    };
  }, []);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => onDismiss(), 300);
  };

  const handleTapToScan = () => {
    setExiting(true);
    setTimeout(() => onTapToScan(), 300);
  };

  return (
    <div
      className={`absolute top-0 left-0 right-0 z-[90] transition-all duration-300 ${
        visible && !exiting ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
    >
      <div className="mx-2 mt-1 rounded-2xl bg-elevated border border-border-light shadow-2xl shadow-black/80 overflow-hidden">
        {/* Notification header bar */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[#1a2e1a] border-b border-border">
          <MessageSafetyMark size={14} className="text-[#25D366]" fill="#25D366" />
          <span className="text-[10px] font-bold text-[#25D366] tracking-tight">WhatsApp</span>
          <span className="text-[9px] text-ink-dim ml-auto font-mono">now</span>
          <button onClick={handleDismiss} className="tactile text-ink-dim hover:text-ink-muted">
            <X size={14} />
          </button>
        </div>

        {/* Message body */}
        <div className="px-3 py-2.5">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#25D366]/20 border border-[#25D366]/40 flex items-center justify-center shrink-0">
              <MessageSafetyMark size={17} className="text-[#25D366]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-ink-primary tracking-tight truncate">{sender}</span>
                <span className="text-[8px] font-mono text-ink-dim shrink-0">WhatsApp</span>
              </div>
              <p className="text-[11px] text-ink-muted leading-snug mt-0.5 line-clamp-2">{message}</p>
            </div>
          </div>

          {/* Tap to Scan button */}
          <button
            onClick={handleTapToScan}
            className="tactile mt-2.5 w-full flex items-center justify-between px-3 py-2 rounded-lg bg-crimson-fraud/15 border border-crimson-fraud/30 group"
          >
            <span className="text-[11px] font-bold text-crimson-fraud tracking-tight flex items-center gap-1.5">
              <ChevronRight size={14} className="animate-pulse" /> Tap to Scan in UPI
            </span>
            <span className="text-[9px] font-mono text-ink-dim">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
