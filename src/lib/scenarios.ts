import type { Scenario } from './types';

export const SCENARIOS: Scenario[] = [
  {
    id: 'safe_pharmacy',
    label: 'Verified Pharmacy QR',
    tag: 'SAFE',
    tagNumber: 0,
    title: '[SAFE] Verified Pharmacy QR',
    uri: 'upi://pay?pa=sharmamedicals@okicici&pn=Sharma%20Medical%20Store&mc=5912&am=180.00&cu=INR&tn=Medicine%20Bill&mode=02',
    description: 'Legitimate merchant QR at a pharmacy with matching signboard and verified NPCI merchant code.',
    telemetry: {
      callState: 'IDLE',
      displaySecurity: 'SECURE',
      chatContext: 'None',
      shopSignboard: 'Sharma Medical Store',
    },
  },
  {
    id: 'refund_trap',
    label: 'Collect / QR "Refund" Trap',
    tag: 'SCAM',
    tagNumber: 1,
    title: '[SCAM 1] Collect / QR "Refund" Trap',
    uri: 'upi://pay?pa=ramesh.mule88@okaxis&pn=OLX%20Refund%20Department&am=5000.00&cu=INR&tn=Receive%20Cashback%20Rs%205000&mode=02',
    description: 'Psychological debit reversal — victim believes they are receiving a refund but the UPI intent debits their account.',
    telemetry: {
      callState: 'ACTIVE_UNKNOWN',
      displaySecurity: 'SECURE',
      chatContext: 'Click or Scan QR to RECEIVE ₹5,000 for your OLX Sofa listing',
      shopSignboard: '',
    },
  },
  {
    id: 'qr_swap',
    label: 'Physical Shop QR Sticker Swap',
    tag: 'SCAM',
    tagNumber: 2,
    title: '[SCAM 2] Physical Shop QR Sticker Swap',
    uri: 'upi://pay?pa=fastcash.sonu99@ybl&pn=Sonu%20Kumar%20Personal&am=1450.00&cu=INR&tn=Payment&mode=01',
    description: 'Fraudster pastes a personal VPA QR sticker over a legitimate merchant QR at a physical shop.',
    telemetry: {
      callState: 'IDLE',
      displaySecurity: 'SECURE',
      chatContext: 'None',
      shopSignboard: 'Sharma Medical Store (Merchant Code 5912)',
    },
  },
  {
    id: 'screen_share',
    label: 'Digital Arrest / Screen-Share Coercion',
    tag: 'SCAM',
    tagNumber: 3,
    title: '[SCAM 3] Digital Arrest / Remote Screen-Share Coercion + Mule Fan-Out',
    uri: 'upi://pay?pa=rbi.verification.vault@paytm&pn=CyberCell%20Escrow%20A/C&am=49999.00&cu=INR&tn=Case%20Clearance%20Deposit&mode=02',
    description: 'Scammer impersonates police/RBI on a call, forces AnyDesk screen-share, and pressures victim to transfer funds to a fake escrow VPA.',
    telemetry: {
      callState: 'ACTIVE_UNKNOWN',
      displaySecurity: 'SCREEN_CAST_DETECTED',
      chatContext: 'This is Cyber Cell. Your account is under investigation. Do not disconnect. Transfer clearance deposit immediately.',
      shopSignboard: '',
    },
  },
];

export const SCENARIO_MAP: Record<string, Scenario> = SCENARIOS.reduce((acc, s) => {
  acc[s.id] = s;
  return acc;
}, {} as Record<string, Scenario>);

export const URL_TRIGGER_MAP: Record<string, string> = {
  refund_trap: 'refund_trap',
  screen_share: 'screen_share',
  qr_swap: 'qr_swap',
  safe: 'safe_pharmacy',
};
