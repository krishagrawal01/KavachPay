
import type {
  ParsedUPI,
  RiskAssessment,
  RiskVector,
  TelemetryState,
  AdaptedPattern,
} from './types';

import {
  extractDeceptiveKeywords,
  getVpaInfo,
  getMuleHop,
} from './upi';
import { isBenignStatusNotice } from './messageContext';

const ADAPTED_KEY = 'kavach_adapted_patterns';

export function loadAdaptedPatterns(): AdaptedPattern[] {
  try {
    if (typeof localStorage === 'undefined') return [];

    const raw = localStorage.getItem(ADAPTED_KEY);

    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed) ? (parsed as AdaptedPattern[]) : [];
  } catch {
    return [];
  }
}

export function saveAdaptedPattern(pattern: AdaptedPattern): void {
  try {
    const existing = loadAdaptedPatterns();
    const normalizedSignature = pattern.signature.trim().toLowerCase();

    // Avoid saving an identical signature multiple times.
    const duplicate = existing.some(
      (item) =>
        item.signature.trim().toLowerCase() === normalizedSignature
    );

    if (duplicate) return;

    existing.push(pattern);

    localStorage.setItem(ADAPTED_KEY, JSON.stringify(existing));
  } catch {
    // Storage may be unavailable or full.
    // Do not crash the application if persistence fails.
  }
}

export function matchAdaptedPatterns(
  text: string
): AdaptedPattern | null {
  const patterns = loadAdaptedPatterns();
  const lower = (text || '').toLowerCase();
  // A completed-status notification with no action request is a known false-positive
  // trap for keyword-only KYC/refund signatures. A benign context is NOT proof of safety.
  if (isBenignStatusNotice(text)) return null;

  for (const pattern of patterns) {
    const keywords = Array.isArray(pattern.keywords)
      ? pattern.keywords.filter(
          (keyword) =>
            typeof keyword === 'string' && keyword.trim().length > 0
        )
      : [];

    // Two distinct keywords are required to avoid broad rules flagging an
    // unrelated legitimate message merely because it says "refund" or "link".
    const distinct = [...new Set(keywords.map(keyword => keyword.toLowerCase().trim()))];
    const includesKeyword = (keyword: string) => {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return /^[a-z0-9_ -]+$/i.test(keyword)
        ? new RegExp(`(^|[^a-z0-9_])${escaped}(?=$|[^a-z0-9_])`, 'i').test(lower)
        : lower.includes(keyword);
    };
    if (distinct.length >= 2 && distinct.filter(includesKeyword).length >= 2) {
      return {
        ...pattern,
        matchLatency: 'Matched locally',
      };
    }
  }

  return null;
}

function normalizeName(value: string): string {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameSimilarity(left: string, right: string): boolean {
  const normalizedLeft = normalizeName(left);
  const normalizedRight = normalizeName(right);

  if (!normalizedLeft || !normalizedRight) return false;

  if (normalizedLeft === normalizedRight) return true;

  // Allow a meaningful complete name to appear within a longer signboard.
  const compactLeft = normalizedLeft.replace(/\s/g, '');
  const compactRight = normalizedRight.replace(/\s/g, '');

  if (
    Math.min(compactLeft.length, compactRight.length) >= 8 &&
    (compactLeft.includes(compactRight) ||
      compactRight.includes(compactLeft))
  ) {
    return true;
  }

  const ignoredWords = new Set([
    'the',
    'and',
    'store',
    'shop',
    'limited',
    'ltd',
    'private',
    'pvt',
    'company',
    'co',
  ]);

  const leftTokens = new Set(
    normalizedLeft
      .split(' ')
      .filter((word) => word.length > 1 && !ignoredWords.has(word))
  );

  const rightTokens = new Set(
    normalizedRight
      .split(' ')
      .filter((word) => word.length > 1 && !ignoredWords.has(word))
  );

  let commonTokens = 0;

  for (const word of leftTokens) {
    if (rightTokens.has(word)) commonTokens++;
  }

  // Avoid declaring a match from a coincidental first-four-character match.
  return commonTokens >= 2;
}

function validVpa(value: string): boolean {
  return /^[A-Za-z0-9._-]{2,256}@[A-Za-z0-9.-]{2,64}$/.test(
    (value || '').trim()
  );
}

function nowMs(): number {
  return typeof performance !== 'undefined'
    ? performance.now()
    : Date.now();
}

export function assessRisk(
  parsed: ParsedUPI,
  telemetry: TelemetryState
): RiskAssessment {
  const startedAt = nowMs();
  const vectors: RiskVector[] = [];

  const noteKeywords = extractDeceptiveKeywords(parsed.tn);
  const contextKeywords = extractDeceptiveKeywords(
    telemetry.chatContext || ''
  );

  const deceptive = [
    ...new Set([...noteKeywords, ...contextKeywords]),
  ];

  const action = (parsed.action || '').toLowerCase().replace(/\/+$/, '');
  const isDebit = action === 'upi://pay';

  const vpaInfo = getVpaInfo(parsed.pa);
  const muleHop = getMuleHop(parsed.pa);

  const adapted = matchAdaptedPatterns(
    `${telemetry.chatContext} ${parsed.tn} ${parsed.pn} ${parsed.pa}`
  );

  // Signal 1: Message / transaction intent conflict.
  const semanticTriggered =
    isDebit && deceptive.length > 0;

  vectors.push({
    id: 'semantic',
    label: 'Payment Intent Conflict',
    description: semanticTriggered
      ? `A payment URI requests a payment while the note or message contains potentially misleading terms: ${deceptive.slice(0, 4).join(', ')}.`
      : 'No refund/reward-versus-payment conflict was detected in the available text.',
    weight: semanticTriggered ? 45 : 0,
    triggered: semanticTriggered,
  });

  // Signal 2: Simulated device-risk context.
  const callActive = telemetry.callState === 'ACTIVE_UNKNOWN';
  const screenShare =
    telemetry.displaySecurity === 'SCREEN_CAST_DETECTED';

  const coercionActive = callActive || screenShare;

  const coercionDetails = [
    callActive ? 'Simulated unknown active call' : null,
    screenShare ? 'Simulated screen-share risk indicator' : null,
  ].filter(Boolean);

  vectors.push({
    id: 'coercion',
    label: 'Device Context Risk',
    description: coercionActive
      ? `${coercionDetails.join(' and ')}. These indicators were supplied by the app's telemetry controls and are not independently verified by this browser.`
      : 'No active demo call or screen-share risk indicator is enabled.',
    weight: coercionActive ? 35 : 0,
    triggered: coercionActive,
  });

  // Signal 3: Signboard versus payment-recipient mismatch.
  const hasShopContext =
    Boolean(telemetry.shopSignboard.trim()) &&
    Boolean(parsed.pn.trim());

  const identityMismatch =
    hasShopContext &&
    !nameSimilarity(telemetry.shopSignboard, parsed.pn);

  vectors.push({
    id: 'identity',
    label: 'Shop / Payee Name Mismatch',
    description: identityMismatch
      ? `The provided signboard text "${telemetry.shopSignboard}" does not sufficiently match the UPI payee name "${parsed.pn}". This is a warning signal, not proof of fraud.`
      : hasShopContext
        ? 'The available signboard and UPI payee names appear consistent.'
        : 'There is insufficient signboard and payee-name information for comparison.',
    weight: identityMismatch ? 40 : 0,
    triggered: identityMismatch,
  });

  // Signal 4: Incomplete destination details.
  const destinationValid = validVpa(parsed.pa);

  vectors.push({
    id: 'recipient',
    label: 'Payment Destination Completeness',
    description: destinationValid
      ? 'A syntactically plausible UPI recipient address is present. Its ownership and trustworthiness have not been verified.'
      : 'The UPI recipient address is missing or malformed; the payment destination cannot be assessed completely.',
    weight: destinationValid ? 0 : 30,
    triggered: !destinationValid,
  });

  // Signal 5: Synthetic demo watchlist.
  const muleFlagged = vpaInfo.isKnownMule;

  vectors.push({
    id: 'mule',
    label: 'Demo Watchlist Match',
    description: muleFlagged
      ? 'The recipient matches a seeded synthetic hackathon watchlist entry. No live bank or mule-account network lookup was performed.'
      : 'No match was found in the small local demo watchlist. This does not establish that the recipient is safe.',
    weight: muleFlagged ? 25 : 0,
    triggered: muleFlagged,
  });

  // Signal 6: Previously saved local fraud pattern.
  if (adapted) {
    vectors.push({
      id: 'adapted',
      label: 'Saved Fraud Pattern Match',
      description: `The text matched a locally saved pattern: "${adapted.signature}". This is a local rule match, not model retraining.`,
      weight: 30,
      triggered: true,
    });
  }

  /*
   * Transparent baseline:
   * add only the weights of triggered signals and cap at 100.
   * This is a heuristic score, not a trained ML probability.
   */
  const compositeScore = Math.min(
    100,
    vectors.reduce(
      (sum, vector) => sum + (vector.triggered ? vector.weight : 0),
      0
    )
  );

  let level: RiskAssessment['level'];

  if (compositeScore >= 60) {
    level = 'CRITICAL';
  } else if (compositeScore >= 30) {
    level = 'WARNING';
  } else {
    level = 'SAFE';
  }

  // Report measured local computation time without random padding.
  const latencyMs = Math.max(0, Math.ceil(nowMs() - startedAt));

  return {
    compositeScore,
    level,
    vectors,
    latencyMs,
    deceptiveKeywords: deceptive,
    vpaAge: vpaInfo.age,
    muleHop,
    isDebit,
  };
}

export function extractFraudSignature(
  text: string
): { keywords: string[]; signature: string } {
  const lower = (text || '').toLowerCase();

  const allKeywords = [
    'receive',
    'refund',
    'cashback',
    'claim',
    'credit',
    'rbi',
    'escrow',
    'clearance',
    'deposit',
    'verification',
    'kyc',
    'case',
    'arrest',
    'installment',
    'yojana',
    'pm kisan',
    'reward',
    'won',
    'lottery',
    'gift',
    'urgent',
    'immediately',
    'block',
    'suspend',
    'expire',
    'otp',
    'aadh',
    'pan',
    'link',
    'update',
    'approve',
    'pending',
  ];

  const matched = allKeywords.filter((keyword) =>
    lower.includes(keyword)
  );

  const words = text
    .split(/[\s,;:!?]+/)
    .filter((word) => word.length > 3);

  const keywords =
    matched.length > 0 ? matched : words.slice(0, 5);

  const signature =
    matched.length > 0
      ? matched.slice(0, 4).join('::')
      : words.slice(0, 3).join('::');

  return { keywords, signature };
}
