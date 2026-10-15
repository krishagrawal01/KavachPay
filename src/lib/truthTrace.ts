import { parseUPI } from './upi';

/**
 * TruthTrace runs entirely on user-supplied material. It NEVER fetches a website,
 * executes supplied HTML/JavaScript, or verifies bank-account ownership.
 */
export type EvidenceSource = 'MESSAGE' | 'SUPPLIED_HTML' | 'DIRECT_URI' | 'REFERENCE' | 'INFERENCE' | 'SIMULATION';
export type Direction = 'receive' | 'pay' | 'unknown';
export type TraceDecision = 'STOP' | 'REVIEW' | 'NO_CONTRADICTION' | 'INSUFFICIENT';

export interface TraceInput {
  message: string;
  html?: string;
  paymentUri?: string;
  expectedPayee?: string;
  expectedAmount?: string;
  expectedDirection?: Direction;
  claimedBusiness?: string;
  /** What-if replay only; never used to create a real payment URI handoff. */
  simulatedPayee?: string;
}

export interface TraceSignal {
  id: string;
  title: string;
  detail: string;
  points: number;
  severe: boolean;
}

export interface EvidenceStep {
  id: string;
  label: string;
  value: string;
  source: EvidenceSource;
  note: string;
}

export interface TraceResult {
  score: number | null;
  decision: TraceDecision;
  blockHandoff: boolean;
  signals: TraceSignal[];
  steps: EvidenceStep[];
  payment: { payee: string; name: string; amount: string; uri: string; source: EvidenceSource } | null;
  paymentCount: number;
  expectedDirection: Direction;
  directionSource: 'EXPLICIT' | 'INFERRED' | 'UNKNOWN';
  websiteFetched: false;
  recipientVerified: false;
  htmlSupplied: boolean;
}

const URI_PATTERN = /upi:\/\/pay\?[^\s<>"'`]+/gi;
const WEB_PATTERN = /https?:\/\/[^\s<>"'`]+/gi;
const MAX_INPUT = 30000;

function uniqueMatches(text: string, regex: RegExp): string[] {
  const unique = new Set<string>();
  for (const match of text.matchAll(regex)) {
    // Remove punctuation that can appear after a URI in a sentence.
    const value = match[0].replace(/[),\]}>.!?;]+$/g, '');
    if (value) unique.add(value.replace(/&amp;/gi, '&'));
    if (unique.size >= 12) break;
  }
  return [...unique];
}

/** Only scan relevant markup and text; no fetching, scripting or rendering. */
function paymentUrisFromHtml(html: string): string[] {
  if (!html.trim()) return [];
  // Handles UPI intents supplied in href, onclick string, data-* attributes or text.
  // Unusual HTML escaping may require manual URI entry; we do not run JS handlers.
  const normalized = html
    .replace(/&amp;/gi, '&')
    .replace(/&#38;/gi, '&')
    .replace(/&#x26;/gi, '&');
  return uniqueMatches(normalized, URI_PATTERN);
}

function inferredDirection(text: string): Direction {
  // Inspect only the human-readable claim, not params inside URLs/UPI URIs.
  const words = text.replace(URI_PATTERN, ' ').replace(WEB_PATTERN, ' ').toLowerCase();
  if (/\b(refund|cashback|reward|prize|lottery|money back)\b/.test(words) &&
      /\b(receive|claim|collect|credited|credit|get|win|won|return|back|ready)\b/.test(words)) {
    return 'receive';
  }
  if (/\b(receive|credited to your account|collect your money)\b/.test(words) &&
      /\b(money|rupees|rs\.?|inr|₹|payment|amount)\b/.test(words)) {
    return 'receive';
  }
  // We don't automatically infer "pay" from a bill because a real payee must be checked.
  return 'unknown';
}

function isValidVpa(value: string): boolean {
  return /^[a-z0-9._-]{2,256}@[a-z0-9.-]{2,64}$/i.test(value);
}

export function analyzeTruthTrace(input: TraceInput): TraceResult {
  const message = (input.message || '').slice(0, MAX_INPUT).trim();
  const html = (input.html || '').slice(0, MAX_INPUT);
  const directUri = (input.paymentUri || '').slice(0, MAX_INPUT).trim();
  const expectedPayee = (input.expectedPayee || '').trim().toLowerCase();
  const expectedAmount = (input.expectedAmount || '').trim();
  const simulatedPayee = (input.simulatedPayee || '').trim();
  const steps: EvidenceStep[] = [];
  const signals: TraceSignal[] = [];
  const payments = new Map<string, EvidenceSource>();

  if (message) {
    steps.push({ id: 'message', label: 'Message / claim', value: message.slice(0, 260), source: 'MESSAGE', note: 'Text supplied by the user; sender identity not verified' });
  }
  if (input.claimedBusiness?.trim()) {
    steps.push({ id: 'claimed-business', label: 'Claimed merchant / service', value: input.claimedBusiness.trim().slice(0, 160), source: 'REFERENCE', note: 'Claim label from demonstration context; actual business affiliation not verified' });
  }

  const websites = uniqueMatches(message, WEB_PATTERN);
  if (websites.length) {
    steps.push({ id: 'website', label: 'Website mentioned', value: websites[0], source: 'MESSAGE', note: 'Only the URL text was observed; the website was NOT fetched' });
  }

  const htmlUris = paymentUrisFromHtml(html);
  if (html.trim()) {
    steps.push({ id: 'html', label: 'Checkout markup', value: htmlUris.length ? `${htmlUris.length} UPI intent(s) found in supplied HTML` : 'No UPI intent extracted', source: 'SUPPLIED_HTML', note: 'User-supplied HTML was read as text; webpage was NOT fetched and scripts were NOT run' });
  }

  if (directUri) payments.set(directUri, 'DIRECT_URI');
  for (const uri of uniqueMatches(message, URI_PATTERN)) if (!payments.has(uri)) payments.set(uri, 'MESSAGE');
  for (const uri of htmlUris) if (!payments.has(uri)) payments.set(uri, 'SUPPLIED_HTML');

  const paymentEntries = [...payments.entries()];
  const paymentCount = paymentEntries.length;
  const [firstUri = '', firstSource = 'DIRECT_URI'] = paymentEntries[0] ?? [];
  const parsed = firstUri ? parseUPI(firstUri) : null;
  const actualPayee = simulatedPayee || parsed?.pa || '';
  const actualAmount = parsed?.am || '';
  const payment = parsed ? {
    payee: actualPayee, name: parsed.pn, amount: actualAmount,
    uri: firstUri, source: simulatedPayee ? 'SIMULATION' as const : firstSource,
  } : null;

  if (payment) {
    steps.push({
      id: 'payment', label: simulatedPayee ? 'Simulated recipient (replay)' : 'UPI payment request',
      value: `PAY ${payment.amount ? `₹${payment.amount} → ` : '→ '}${payment.payee || '(missing recipient)'}`,
      source: payment.source,
      note: 'upi://pay is an outgoing payment request; display names do not establish ownership',
    });
  } else if (paymentCount) {
    steps.push({ id: 'payment', label: 'UPI intent', value: firstUri.slice(0, 240), source: firstSource, note: 'UPI payment request could not be parsed' });
  }

  const direction: Direction = input.expectedDirection && input.expectedDirection !== 'unknown'
    ? input.expectedDirection : inferredDirection(message);
  const directionSource = input.expectedDirection && input.expectedDirection !== 'unknown'
    ? 'EXPLICIT' : direction === 'unknown' ? 'UNKNOWN' : 'INFERRED';

  if (direction !== 'unknown') {
    steps.push({
      id: 'intent', label: 'Expected payment direction',
      value: direction === 'receive' ? 'User expects to RECEIVE money' : 'User expects to PAY money',
      source: directionSource === 'EXPLICIT' ? 'REFERENCE' : 'INFERENCE',
      note: directionSource === 'EXPLICIT' ? 'Manually specified for comparison' : 'Inferred from message language; may be wrong',
    });
  }
  if (expectedPayee) {
    steps.push({ id: 'trusted-payee', label: 'Reference payee', value: expectedPayee, source: 'REFERENCE', note: 'User-provided reference only; not validated against a bank registry' });
  }

  function add(id: string, title: string, detail: string, points: number, severe = true) {
    signals.push({ id, title, detail, points, severe });
  }

  if (paymentCount > 1) add('multiple', 'Multiple payment destinations', `${paymentCount} distinct payment URIs were supplied. No single safe destination can be established.`, 75);
  if (paymentCount && (!parsed || parsed.action.toLowerCase() !== 'upi://pay' || !isValidVpa(parsed.pa))) {
    add('malformed', 'Invalid recipient or payment URI', 'The payment request is incomplete or has an invalid recipient format.', 70);
  }
  if (payment && direction === 'receive') {
    add('direction', 'Receive-versus-pay contradiction', 'The claim promises money arriving, but upi://pay requests an outgoing payment.', 90);
  }
  if (payment && expectedPayee && payment.payee.toLowerCase() !== expectedPayee) {
    add('recipient', 'Recipient mismatch', `Expected ${expectedPayee}, but the URI targets ${payment.payee || '(missing)'}. This comparison uses a user-provided reference.`, 75);
  }
  if (payment && expectedAmount) {
    const expected = Number(expectedAmount);
    const actual = Number(actualAmount);
    if (Number.isFinite(expected) && expected > 0 && (!actualAmount || !Number.isFinite(actual) || Math.abs(expected - actual) > 0.005)) {
      add('amount', 'Amount differs from expectation', `Expected ₹${expectedAmount}, but URI requests ${actualAmount ? `₹${actualAmount}` : 'an unspecified amount'}.`, 45);
    }
  }
  // Low-confidence context signals do not independently cause a STOP.
  const plainMessage = message.replace(URI_PATTERN, ' ').replace(WEB_PATTERN, ' ');
  if (/\b(urgent|immediately|last chance|within \d+ minutes?|account suspended|final notice)\b/i.test(plainMessage)) {
    add('pressure', 'Pressure or urgency language', 'The message includes urgency language. This is a weak indicator, not proof of fraud.', 8, false);
  }
  if (websites.length) {
    try {
      const url = new URL(websites[0]);
      if (url.protocol === 'http:') add('http', 'Non-HTTPS destination', 'The link does not use HTTPS; destination not inspected.', 9, false);
      if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(url.hostname) || url.hostname.includes('xn--')) {
        add('domain', 'Unusual link structure', 'IP or punycode hostname merits review; it is not a confirmed scam.', 12, false);
      }
    } catch { /* Plain text URL can remain unverified. */ }
  }

  const score = paymentCount ? Math.min(100, signals.reduce((sum, signal) => sum + signal.points, 0)) : null;
  const severe = signals.some((signal) => signal.severe);
  const decision: TraceDecision = !paymentCount ? 'INSUFFICIENT' : severe ? 'STOP' : signals.length ? 'REVIEW' : 'NO_CONTRADICTION';

  steps.push({
    id: 'decision', label: 'TruthTrace decision',
    value: decision === 'STOP' ? 'STOP · payment contradiction' : decision === 'REVIEW' ? 'REVIEW · weak warning signs' :
      decision === 'NO_CONTRADICTION' ? 'No contradiction found · NOT verified safe' : 'Insufficient payment evidence',
    source: 'INFERENCE', note: 'Rule-based evidence score; separate from the existing ML model',
  });

  return { score, decision, blockHandoff: severe, signals, steps, payment, paymentCount,
    expectedDirection: direction, directionSource, websiteFetched: false,
    recipientVerified: false, htmlSupplied: Boolean(html.trim()) };
}
