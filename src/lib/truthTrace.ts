import { parseUPI } from './upi';
import { matchAdaptedPatterns } from './risk';

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

export type MessageScreeningStatus = 'NOT_ASSESSED' | 'NO_OBVIOUS_SIGNALS' | 'CAUTION' | 'HIGH_CONCERN';
export interface MessageIndicator {
  id: string;
  title: string;
  detail: string;
  strength: 'strong' | 'weak';
}
export interface MessageScreening {
  status: MessageScreeningStatus;
  indicators: MessageIndicator[];
  urls: string[];
  /** Plain-text signals only; neither website content nor sender identity was authenticated. */
  senderVerified: false;
  webpageInspected: false;
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
  messageScreening: MessageScreening;
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

/** An independent warning-sign screen for SMS text. It is NOT a legitimacy classifier. */
export function screenMessage(message: string): MessageScreening {
  const text = message.slice(0, MAX_INPUT).trim();
  const urls = uniqueMatches(text, WEB_PATTERN);
  const plain = text.replace(URI_PATTERN, ' ').replace(WEB_PATTERN, ' ');
  const indicators: MessageIndicator[] = [];
  function add(id: string, title: string, detail: string, strength: 'strong' | 'weak') {
    if (!indicators.some((item) => item.id === id)) indicators.push({ id, title, detail, strength });
  }
  if (!text) return { status: 'NOT_ASSESSED', indicators, urls, senderVerified: false, webpageInspected: false };

  // Pair credential keywords with a request, rather than classifying every OTP notification as fraud.
  const credential = /\b(?:otp|one.time.password|upi\s*pin|cvv|card\s*pin|atm\s*pin|password)\b|ओटीपी|पिन/i.test(plain);
  const request = /\b(?:share|send|reply|tell|submit|provide|enter|give|forward|bhejo|bheje|batao|bataye|daalo|dalo)\b|भेज(?:ो|ें)|बताएं|दर्ज करें/i.test(plain);
  const protectiveAdvice = /\b(?:never|do not|don.t|avoid|should not|mat|nahin|nahi)\b.{0,32}\b(?:share|send|reply|tell|enter|give|forward|bhejo|batao)\b|कभी\s*नहीं|साझा\s*न\s*करें/i.test(plain);
  if (credential && request && !protectiveAdvice) {
    add('credential-request', 'Sensitive code or PIN requested', 'The text appears to ask for an OTP, PIN or password. Do not share sensitive payment credentials; verify the request using an independently found official contact.', 'strong');
  }
  const refundClaim = /\b(?:refund|cashback|reward|prize|lottery|money\s*back|winnings?)\b|रिफंड|कैशबैक|इनाम/i.test(plain);
  const feeToReceive = /\b(?:processing|release|verification|activation|transfer|refundable)\s*(?:fee|charge|deposit)\b|\b(?:pay|deposit|send)\b.{0,35}\b(?:fee|charge|to\s+(?:receive|claim|release))\b|भुगतान.{0,20}(?:रिफंड|कैशबैक)/i.test(plain);
  if (refundClaim && feeToReceive) {
    add('advance-fee', 'Money requested to release a reward', 'The message links a refund/reward claim with a fee or outgoing payment. This is a concerning instruction, but the payment destination has not been verified.', 'strong');
  }
  const remoteTool = /\b(?:anydesk|teamviewer|quick\s*support|screen\s*share|remote\s*access)\b/i.test(plain);
  const remoteInstruction = /\b(?:install|download|allow|enable|start|open|share|grant)\b/i.test(plain);
  if (remoteTool && remoteInstruction && !/\b(?:never|do not|don't)\b.{0,30}\b(?:install|download|allow)\b/i.test(plain)) {
    add('remote-access', 'Remote-access or screen-sharing instruction', 'The message encourages remote access or screen sharing. Never let an unknown caller control your device during a payment.', 'strong');
  }

  for (const raw of urls.slice(0, 6)) {
    try {
      const url = new URL(raw);
      const host = url.hostname.toLowerCase();
      if (url.protocol === 'http:') add('plaintext-link', 'Link does not use HTTPS', 'The submitted link uses HTTP. This alone does not establish fraud, and the site has not been opened.', 'weak');
      if (url.username || url.password) add('credential-in-url', 'Misleading link structure', 'The link embeds user information before an @ sign, which can obscure the actual destination host.', 'weak');
      if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes('xn--')) add('unusual-domain', 'Unusual website address', 'The URL uses a numerical IP or encoded internationalized domain. Inspect the actual hostname carefully.', 'weak');
      if (/(?:^|\.)(?:bit\.ly|tinyurl\.com|cutt\.ly|is\.gd|t\.co|rebrand\.ly|shorturl\.at|rb\.gy)$/.test(host)) {
        add('short-link', 'Shortened link hides the final destination', 'A URL shortener appears in the message. The final website has not been resolved or inspected.', 'weak');
      }
    } catch { /* Invalid URL text is not proof of fraud. */ }
  }
  const locallyReviewed = matchAdaptedPatterns(plain);
  if (locallyReviewed) {
    add('local-reviewed-pattern', 'Locally saved scam pattern matched',
      `This text matches at least two keywords from an analyst-approved browser-only rule: ${locallyReviewed.signature}. This is a heuristic match, not evidence the sender is fraudulent.`, 'strong');
  }
  // Time pressure is weak evidence, especially in ordinary marketing campaigns.
  const highPressure = /\b(?:urgent|immediately|last chance|final notice|within\s+\d+\s+(?:hours?|minutes?)|account\s+(?:blocked|suspended)|disconnection|disconnected|connection\s+will\s+be\s+cut)\b|तुरंत|अभी\s*करें|आखिरी\s*मौका|बिजली\s*काट/i.test(plain);
  const mildPressure = /\b(?:abhi|turant|jaldi|aaj\s*hi|today\s*only|act\s*now)\b/i.test(plain);
  if ((highPressure || mildPressure) && urls.length) {
    add('time-pressure', 'Act-now language next to a link', 'The message encourages quick action through a link. Legitimate promotions can use similar wording, so treat this as a weak warning sign.', 'weak');
  }
  const status: MessageScreeningStatus = indicators.some(i => i.strength === 'strong')
    ? 'HIGH_CONCERN' : indicators.length ? 'CAUTION' : 'NO_OBVIOUS_SIGNALS';
  return { status, indicators, urls, senderVerified: false, webpageInspected: false };
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
  const messageScreening = screenMessage(message);
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
  if (messageScreening.indicators.length) {
    steps.push({ id: 'message-screening', label: 'Message warning signs',
      value: messageScreening.indicators.map(item => item.title).join('; ').slice(0, 260),
      source: 'INFERENCE',
      note: 'Text-only clues, not proof of fraud; no website fetched and sender not authenticated' });
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
    recipientVerified: false, htmlSupplied: Boolean(html.trim()), messageScreening };
}
