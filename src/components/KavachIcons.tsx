import type { SVGProps } from 'react';

export type KavachIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function BaseIcon({ size = 24, ...props }: KavachIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  );
}

/** The primary brand signature: protected boundary + positive action. */
export function KavachMark(props: KavachIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 2.7 20 6v5.1c0 5-3.4 8.5-8 10.2-4.6-1.7-8-5.2-8-10.2V6l8-3.3Z" />
      <path d="m8.1 12.1 2.5 2.5 5.3-5.4" stroke="#0B9B83" strokeWidth={2.1} />
      <path d="M7.1 6.9 12 4.9l4.9 2" stroke="currentColor" strokeOpacity=".3" />
    </BaseIcon>
  );
}

/** Provenance path with three evidence nodes, designed specifically for TruthTrace. */
export function TruthTraceMark(props: KavachIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5.2 4.7v5.1a3.1 3.1 0 0 0 3.1 3.1h4.2a3.1 3.1 0 0 1 3.1 3.1v2.7" />
      <path d="M12.4 6.6h5.2m-2.1-2.1 2.1 2.1-2.1 2.1" />
      <circle cx="5.2" cy="4.7" r="2.1" fill="white" />
      <circle cx="5.2" cy="4.7" r="2.1" />
      <circle cx="12.4" cy="6.6" r="2.1" fill="white" />
      <circle cx="12.4" cy="6.6" r="2.1" />
      <circle cx="15.6" cy="18.8" r="2.1" fill="white" />
      <circle cx="15.6" cy="18.8" r="2.1" />
      <circle cx="5.2" cy="19.3" r="2.1" fill="white" />
      <circle cx="5.2" cy="19.3" r="2.1" />
      <path d="M5.2 16v1.2" />
    </BaseIcon>
  );
}

/** Pattern memory: deliberately spaced nodes rather than a stock brain silhouette. */
export function PatternMemoryMark(props: KavachIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 5.2v13.5M6.3 8.2l5.7 3.4 5.7-3.4M6.3 15.8l5.7-4.2 5.7 4.2" />
      <circle cx="12" cy="4" r="2.2" fill="white" />
      <circle cx="12" cy="4" r="2.2" />
      <circle cx="5" cy="7.4" r="2.2" fill="white" />
      <circle cx="5" cy="7.4" r="2.2" />
      <circle cx="19" cy="7.4" r="2.2" fill="white" />
      <circle cx="19" cy="7.4" r="2.2" />
      <circle cx="5" cy="16.8" r="2.2" fill="white" />
      <circle cx="5" cy="16.8" r="2.2" />
      <circle cx="19" cy="16.8" r="2.2" fill="white" />
      <circle cx="19" cy="16.8" r="2.2" />
      <circle cx="12" cy="20" r="2" fill="white" />
      <circle cx="12" cy="20" r="2" />
    </BaseIcon>
  );
}

/** Accuracy: scale bars plus a signal line, keeping analysis distinct from analytics chrome. */
export function AccuracyMark(props: KavachIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 4.2v15.6h16" />
      <path d="M7.5 15.8v-3.5M12 15.8V8.5M16.5 15.8v-5" strokeWidth={2.2} />
      <path d="m7.4 8.2 3.2-2.1 3.1 1.6 3.5-3" stroke="#7C3AED" strokeWidth={2} />
      <circle cx="17.3" cy="4.7" r="1.5" fill="#7C3AED" stroke="none" />
    </BaseIcon>
  );
}

/** QR scanning corners remain recognizable even when rendered small in a bottom tab. */
export function QrScanMark(props: KavachIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" strokeWidth={2.2} />
      <rect x="7" y="7" width="4.2" height="4.2" rx=".6" />
      <rect x="14" y="7" width="3" height="3" rx=".5" />
      <rect x="7" y="14" width="3" height="3" rx=".5" />
      <path d="M14 14h2v2h2v2M14 18v-1.2" />
    </BaseIcon>
  );
}

/** Link inspection: chain with an explicit verification point. */
export function LinkSafetyMark(props: KavachIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m9.3 14.7-1.1 1.1a3.2 3.2 0 0 1-4.5-4.5l3-3a3.2 3.2 0 0 1 4.5 0M14.7 9.3l1.1-1.1a3.2 3.2 0 0 1 4.5 4.5l-3 3a3.2 3.2 0 0 1-4.5 0M8.7 15.3l6.6-6.6" />
      <path d="m14.7 17.3 1.4 1.4 3-3" stroke="#0B9B83" strokeWidth={2} />
    </BaseIcon>
  );
}

/** Simple app destinations icon: three deliberate product areas. */
export function ToolsMark(props: KavachIconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3.7" y="3.7" width="6.2" height="6.2" rx="1.4" />
      <rect x="14.1" y="3.7" width="6.2" height="6.2" rx="1.4" />
      <rect x="3.7" y="14.1" width="6.2" height="6.2" rx="1.4" />
      <path d="M14.1 14.1h2.7v2.7h3.5v3.5h-3.5v-3.5h-2.7Z" />
    </BaseIcon>
  );
}

/** Fund-flow chart: connected transfer nodes with visible direction. */
export function FundFlowMark(props: KavachIconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="9.1" y="2.8" width="5.8" height="4.2" rx="1.2" />
      <rect x="2.8" y="16.8" width="5.8" height="4.2" rx="1.2" />
      <rect x="15.4" y="16.8" width="5.8" height="4.2" rx="1.2" />
      <path d="M12 7v4.2M5.7 16.8v-2.7h12.6v2.7M12 11.2h6.3" />
      <path d="m16.5 9.4 1.8 1.8-1.8 1.8" strokeWidth={1.5} />
    </BaseIcon>
  );
}

/** Semantic danger mark used for blocked or suspicious payment states. */
export function RiskAlertMark(props: KavachIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 2.7 20 6v5.1c0 5-3.4 8.5-8 10.2-4.6-1.7-8-5.2-8-10.2V6l8-3.3Z" />
      <path d="M12 7.6v5.4M12 16.5v.1" strokeWidth={2.2} />
    </BaseIcon>
  );
}

/** Payment method symbol with a compact, readable balance line. */
export function PaymentCardMark(props: KavachIconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="2.8" y="5" width="18.4" height="14" rx="2.5" />
      <path d="M3.1 9.3h17.8M6.2 14h4.1M6.2 16.2h2.7" />
      <path d="m16.3 14.5 1.1 1.1 2.2-2.4" stroke="#0B9B83" strokeWidth={1.9} />
    </BaseIcon>
  );
}

/** Merchant storefront with awning and a clear entrance. */
export function MerchantMark(props: KavachIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 10.2 5.8 4h12.4l1.8 6.2" />
      <path d="M3.3 10.2h17.4v9.9H3.3zM8.7 20.1v-5.3h3.5v5.3" />
      <path d="M3.3 10.2c0 1.7 1.2 2.5 2.6 2.5s2.6-.8 2.6-2.5c0 1.7 1.2 2.5 2.5 2.5s2.6-.8 2.6-2.5c0 1.7 1.2 2.5 2.6 2.5s2.5-.8 2.5-2.5" />
    </BaseIcon>
  );
}

/** Camera icon paired with the scanning square, without a filled glyph. */
export function CameraScanMark(props: KavachIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 8.3A2.3 2.3 0 0 1 5.3 6h2l1.3-2h6.8l1.3 2h2A2.3 2.3 0 0 1 21 8.3v9.4a2.3 2.3 0 0 1-2.3 2.3H5.3A2.3 2.3 0 0 1 3 17.7Z" />
      <circle cx="12" cy="12.8" r="4" />
      <circle cx="12" cy="12.8" r="1.4" fill="currentColor" stroke="none" />
    </BaseIcon>
  );
}

/** Upload mark: strong vertical action paired with a receiving tray. */
export function UploadMark(props: KavachIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 15V3.8m-4 4 4-4 4 4" strokeWidth={2} />
      <path d="M4 14.5v4.1A1.4 1.4 0 0 0 5.4 20h13.2a1.4 1.4 0 0 0 1.4-1.4v-4.1" />
    </BaseIcon>
  );
}

/** Compact conversation mark for scam-message simulations. */
export function MessageSafetyMark(props: KavachIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M20.2 11.1a7.8 7.8 0 0 1-8 7.6 8.6 8.6 0 0 1-3.5-.8L4 19l1.2-3.6a7.3 7.3 0 0 1-1.1-4.3 7.9 7.9 0 0 1 8.1-7.4 7.9 7.9 0 0 1 8 7.4Z" />
      <path d="M8 10.8h8M8 14h5" strokeWidth={1.7} />
    </BaseIcon>
  );
}
