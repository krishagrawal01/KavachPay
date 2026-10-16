import type { SVGProps } from 'react';

type MarkProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

/** Small brand mark used in the app header; keeps the check accent consistent with the app icon. */
export function KavachMark({ size = 24, ...props }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M12 2.75 20 6v5.2c0 5.05-3.38 8.52-8 10.05-4.62-1.53-8-5-8-10.05V6l8-3.25Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="m8.4 12.1 2.3 2.35 4.95-5.05"
        stroke="#0D9F8B"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Evidence lineage: a connected path with a distinct origin and conclusion. */
export function TruthTraceIcon({ size = 24, ...props }: MarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M6 6.5v4.25a3.25 3.25 0 0 0 3.25 3.25h5.5A3.25 3.25 0 0 1 18 17.25V19"
        stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M6 8.5a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5ZM18 21.5a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
        stroke="currentColor" strokeWidth="1.9"
      />
      <path d="M12.5 7h4.25M14.5 4.8l2.25 2.2-2.25 2.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="6" cy="18" r="2.25" stroke="currentColor" strokeWidth="1.9"/>
    </svg>
  );
}

/** Scam-pattern memory: a calm, simplified neural graph rather than a busy generic brain glyph. */
export function PatternMemoryIcon({ size = 24, ...props }: MarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12 4.2a3.15 3.15 0 0 0-5.82 1.7A3.3 3.3 0 0 0 4.4 11.3a3.25 3.25 0 0 0 1.25 5.9 3.2 3.2 0 0 0 6.35.5V4.2ZM12 4.2a3.15 3.15 0 0 1 5.82 1.7 3.3 3.3 0 0 1 1.78 5.4 3.25 3.25 0 0 1-1.25 5.9 3.2 3.2 0 0 1-6.35.5"
        stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      />
      <path d="M7.4 8.2h2.05M14.6 8.2h2M8 14.2h2M14.2 14.2h2.4M12 8.2v3.1" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
      <circle cx="7.1" cy="8.2" r="1" fill="currentColor"/>
      <circle cx="16.9" cy="8.2" r="1" fill="currentColor"/>
      <circle cx="7.7" cy="14.2" r="1" fill="currentColor"/>
      <circle cx="16.8" cy="14.2" r="1" fill="currentColor"/>
    </svg>
  );
}

/** Accuracy checks: a compact measurement chart with a rising signal. */
export function AccuracyIcon({ size = 24, ...props }: MarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M4 4.5v15h16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 16v-3.5M12 16V8M16 16v-5.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/>
      <path d="m7.2 8.5 3-2.2 3.1 1.5 3.7-3.1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="17" cy="4.7" r="1.15" fill="currentColor"/>
    </svg>
  );
}
