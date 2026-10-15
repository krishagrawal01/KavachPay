
import type { ParsedUPI } from './types';

/**
 * Parse a UPI URI without crashing on malformed input.
 * Parsing a URI does not establish that its recipient is trustworthy.
 */
export function parseUPI(uri: string): ParsedUPI | null {
  if (!uri || !uri.trim()) return null;

  try {
    const trimmed = uri.trim();
    const url = new URL(trimmed);

    if (url.protocol.toLowerCase() !== 'upi:' || !url.hostname) {
      return null;
    }

    const params: Record<string, string> = {};

    url.searchParams.forEach((value, key) => {
      params[key.toLowerCase()] = value;
    });

    return {
      action: `${url.protocol}//${url.host}`,
      pa: params['pa'] || '',
      pn: params['pn'] || '',
      am: params['am'] || '',
      cu: params['cu'] || 'INR',
      tn: params['tn'] || '',
      mc: params['mc'] || '',
      mode: params['mode'] || '',
      raw: trimmed,
      params,
    };
  } catch {
    return null;
  }
}

export function formatAmount(am: string): string {
  if (!am) return '0.00';

  const amount = Number(am);

  if (!Number.isFinite(amount)) return am;

  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const DECEPTIVE_KEYWORDS = [
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
];

export function extractDeceptiveKeywords(tn: string): string[] {
  const lower = (tn || '').toLowerCase();

  return DECEPTIVE_KEYWORDS.filter((keyword) =>
    lower.includes(keyword)
  );
}

/**
 * These are synthetic demo fixtures for repeatable hackathon scenarios.
 * They are NOT a live bank reputation or account-age database.
 */
const DEMO_SAFE_VPAS = new Set([
  'sharmamedicals@okicici',
]);

const DEMO_MULE_VPAS = new Set([
  'ramesh.mule88@okaxis',
  'fastcash.sonu99@ybl',
  'rbi.verification.vault@paytm',
]);

export function getVpaInfo(
  pa: string
): {
  age: string;
  isKnownMule: boolean;
  isKnownSafe: boolean;
} {
  const normalized = (pa || '').trim().toLowerCase();

  if (DEMO_SAFE_VPAS.has(normalized)) {
    return {
      age: 'Not independently verified',
      isKnownMule: false,
      isKnownSafe: true,
    };
  }

  if (DEMO_MULE_VPAS.has(normalized)) {
    return {
      age: 'Not independently verified',
      isKnownMule: true,
      isKnownSafe: false,
    };
  }

  // Never guess account age or mule status from the VPA username.
  return {
    age: 'Unknown',
    isKnownMule: false,
    isKnownSafe: false,
  };
}

/**
 * Synthetic relationship depth for the demo watchlist only.
 * This is not a real transaction-network lookup.
 */
export function getMuleHop(pa: string): number {
  return DEMO_MULE_VPAS.has((pa || '').trim().toLowerCase())
    ? 5
    : 0;
}

export function maskVpa(pa: string): string {
  if (!pa) return '';

  const parts = pa.split('@');

  if (parts.length !== 2) return pa;

  const [handle, provider] = parts;

  if (handle.length <= 4) return pa;

  return `${handle.slice(0, 2)}${'•'.repeat(
    Math.max(2, handle.length - 4)
  )}${handle.slice(-2)}@${provider}`;
}
