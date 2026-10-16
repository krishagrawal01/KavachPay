/**
 * Limited, transparent language heuristics for user-supplied SMS text.
 * This is NOT sender verification, website inspection, or a trained classifier.
 * Do not use it as evidence that a message is genuine or fraudulent.
 */
export interface ContextClue {
  id: string;
  title: string;
  detail: string;
  strength: 'strong' | 'weak';
}
export interface ContextReading {
  clues: ContextClue[];
  observations: string[];
  protectiveOrCompleted: boolean;
}

const URL = /https?:\/\/[^\s<>"'`]+/gi;
const UPI = /upi:\/\/pay\?[^\s<>"'`]+/gi;
const CREDENTIAL = /\b(?:otp|one[ -]?time[ -]?password|upi\s*pin|card\s*pin|atm\s*pin|cvv|password|passcode)\b|ओटीपी|पासवर्ड|पिन/i;
const CREDENTIAL_REQUEST = /\b(?:share|send|reply|tell|submit|provide|enter|give|forward|bhejo|bheje|batao|bataye|dalo|daalo)\b|भेज(?:ो|ें)|बताएं|दर्ज\s*करें/i;
const PROTECT_CREDENTIAL = /\b(?:never|do\s*not|don['’]?t|should\s*not|avoid|must\s*not|mat|nahi|nahin)\b.{0,55}\b(?:share|send|reply|tell|enter|provide|give|bhejo|batao)\b|\b(?:no\s+(?:otp|pin|password)\s+(?:is\s+)?(?:required|needed))\b|(?:मत|नहीं).{0,40}(?:भेज|बताएं|शेयर)/i;
const REFUND = /\b(?:refund|cashback|reward|prize|lottery|winnings?|money\s*back|payout)\b|रिफंड|कैशबैक|इनाम/i;
const PAYMENT_DEMAND = /\b(?:(?:pay|send|deposit|transfer)\b.{0,55}\b(?:fee|charge|deposit|to\s+(?:receive|claim|release)|first|before)|(?:processing|release|verification|activation|transfer|refundable)\s*(?:fee|charge|deposit)|(?:fee|deposit|charge)\s+(?:required|needed|first)|pay\s+\d+\s+(?:to|before))\b|\b(?:release|claim|receive)\b.{0,45}\b(?:refund|cashback|reward)\b.{0,35}\b(?:deposit|fee|charge)\b|(?:refund\s+lene\s+ke\s+liye|cashback\s+lene\s+ke\s+liye).{0,40}(?:pay|payment|paisa|bhejo|karo)|भुगतान.{0,30}(?:रिफंड|कैशबैक)/i;
const NO_PAYMENT_DEMAND = /\b(?:never|do\s*not|don['’]?t|should\s*not|avoid|no\s+need\s+to|without)\b.{0,40}\b(?:pay|deposit|send|processing\s*fee|fee|charge)\b|\bno\s+(?:(?:processing|verification|release|activation)\s+)?(?:fee|charge|deposit)\s+(?:is\s+)?(?:required|needed)\b/i;
const REMOTE_TOOL = /\b(?:anydesk|teamviewer|quick\s*support|screen\s*shar(?:e|ing)|remote\s*access)\b/i;
const REMOTE_REQUEST = /\b(?:install|download|allow|enable|start|open|share|grant)\b/i;
const NO_REMOTE_REQUEST = /\b(?:never|do\s*not|don['’]?t|avoid|without)\b.{0,35}\b(?:install|download|allow|enable|share|grant)\b/i;
const PRESSURE = /\b(?:urgent|immediately|last\s*chance|final\s*notice|within\s+\d+\s+(?:hours?|minutes?)|account\s+(?:will\s+be\s+)?(?:blocked|suspended)|disconnection|disconnected|connection\s+will\s+be\s+cut|aaj\s*hi|turant|jaldi|abhi)\b|तुरंत|अभी\s*करें|आखिरी\s*मौका|बिजली\s*काट/i;
const COMPLETED = /\b(?:completed\s+successfully|successfully\s+(?:completed|credited|processed)|has\s+been\s+(?:completed|credited|processed|received)|already\s+(?:credited|received)|no\s+further\s+action\s+(?:is\s+)?required|will\s+not\s+be\s+suspended|not\s+be\s+suspended|without\s+any\s+action|no\s+action\s+needed)\b|सफलतापूर्वक|पूरा\s*हो\s*गया/i;
const ACTION_REQUEST = /\b(?:click|visit|open\s+(?:this\s+)?link|share|send|provide|enter|pay|deposit|install|download|verify\s+now|update\s+now|complete\s+now|immediately|urgent|act\s+now|must\s+update)\b|भेजो|भुगतान\s*करें/i;

/** Removes URLs before sentence segmentation so domain dots aren't mistaken for sentence boundaries. */
export function messageClauses(text: string): string[] {
  return text.slice(0, 30000).replace(URL, ' [link] ').replace(UPI, ' [upi payment] ')
    .split(/[\n.!?;]+|\s+\b(?:but|however|lekin|magar)\b\s+/i)
    .map(part => part.trim()).filter(Boolean);
}

/** Strictly contextual benign observation — NOT proof that an SMS is safe. */
export function isBenignStatusNotice(text: string): boolean {
  const message = (text || '').slice(0, 30000);
  return COMPLETED.test(message) && !ACTION_REQUEST.test(message) && !PAYMENT_DEMAND.test(message);
}

export function analyzeMessageContext(message: string): ContextReading {
  const trimmed = (message || '').slice(0, 30000).trim();
  const clauses = messageClauses(trimmed);
  const clues: ContextClue[] = [];
  const observations: string[] = [];
  const add = (clue: ContextClue) => { if (!clues.some(c => c.id === clue.id)) clues.push(clue); };

  for (const clause of clauses) {
    if (CREDENTIAL.test(clause) && CREDENTIAL_REQUEST.test(clause) && !PROTECT_CREDENTIAL.test(clause)) {
      add({ id: 'credential-request', title: 'Request for OTP, PIN or password', strength: 'strong',
        detail: 'An instruction asks for a sensitive authentication code. Do not share it; confirm the sender independently.' });
    }
    if (REFUND.test(trimmed) && PAYMENT_DEMAND.test(clause) && !NO_PAYMENT_DEMAND.test(clause)) {
      add({ id: 'advance-fee', title: 'Outgoing payment requested for an incoming reward', strength: 'strong',
        detail: 'The message appears to link a promised reward/refund to a fee, charge or payment. Check the actual destination before acting.' });
    }
    if (REMOTE_TOOL.test(clause) && REMOTE_REQUEST.test(clause) && !NO_REMOTE_REQUEST.test(clause)) {
      add({ id: 'remote-access', title: 'Remote access or screen sharing requested', strength: 'strong',
        detail: 'Instructions to install remote-access software or share the screen can expose payment credentials.' });
    }
  }

  const hasLink = URL.test(trimmed); URL.lastIndex = 0;
  const actualPressure = clauses.some(clause => PRESSURE.test(clause) &&
    !/\b(?:will\s+not|not\s+be|never|avoid|already)\b.{0,28}\b(?:suspended|blocked|disconnected)\b/i.test(clause));
  if (hasLink && actualPressure) {
    add({ id: 'time-pressure', title: 'Time pressure tied to a link', strength: 'weak',
      detail: 'The message urges quick action through an uninspected link. This can also occur in legitimate notices.' });
  }

  const protectiveOrCompleted = clauses.some(c => PROTECT_CREDENTIAL.test(c) || COMPLETED.test(c));
  if (protectiveOrCompleted && clues.length === 0) {
    observations.push('Text includes a completed-status or protective instruction; no risky action request was detected by the current rules. Sender authenticity remains unverified.');
  }
  if (clues.length === 0 && trimmed && !observations.length) {
    observations.push('No contextual action warning detected. This does not establish that the sender or link is trustworthy.');
  }
  return { clues, observations, protectiveOrCompleted };
}
