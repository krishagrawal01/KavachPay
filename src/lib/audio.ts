let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playWarningChime(): void {
  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Two-tone urgent warning: high-low-high
  const tones = [
    { freq: 880, start: 0, dur: 0.15 },
    { freq: 660, start: 0.16, dur: 0.12 },
    { freq: 990, start: 0.30, dur: 0.20 },
  ];

  tones.forEach(({ freq, start, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, now + start);
    gain.gain.linearRampToValueAtTime(0.18, now + start + 0.01);
    gain.gain.linearRampToValueAtTime(0.14, now + start + dur * 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + start);
    osc.stop(now + start + dur + 0.05);
  });
}

export function playSafeChime(): void {
  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(523, now);
  osc.frequency.linearRampToValueAtTime(784, now + 0.15);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.35);
}

export function triggerHaptics(pattern: number[] = [300, 100, 300, 100, 500]): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

export function speakWarning(amount: string, muted: boolean): void {
  if (muted) return;
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(
    `Savdhaan! Payment blocked before UPI PIN. This QR code will DEBIT Rupees ${amount} from your bank account, NOT credit it.`
  );
  utterance.rate = 0.92;
  utterance.pitch = 0.8;
  utterance.volume = 1.0;
  utterance.lang = 'en-IN';
  window.speechSynthesis.speak(utterance);
}

export function replaySpeech(amount: string, muted: boolean): void {
  if (muted) return;
  speakWarning(amount, false);
}

export function stopSpeech(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
