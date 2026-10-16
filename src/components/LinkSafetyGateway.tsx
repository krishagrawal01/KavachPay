import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Search,
  Volume2,
} from 'lucide-react';

import type { ParsedUPI, TelemetryState } from '@/lib/types';
import { KavachMark, LinkSafetyMark, RiskAlertMark } from '@/components/KavachIcons';
import { parseUPI, formatAmount } from '@/lib/upi';
import { useI18n } from '@/lib/i18n';
import { assessRisk } from '@/lib/risk';
import { analyzeTruthTrace, screenMessage, type TraceInput } from '@/lib/truthTrace';
import {
  analyzePaymentWithML,
  type MLAnalysisResult,
  type MLApiRequest,
  type MLDecision,
} from '@/lib/mlApi';

type RiskBand = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNVERIFIED';

interface LinkItem {
  raw: string;
  kind: 'web' | 'upi';
  hostname: string;
  notes: string[];
}

interface Signal {
  id: string;
  title: string;
  detail: string;
  points: number;
}

interface AnalysisResult {
  localScore: number;
  score: number;
  level: RiskBand;
  links: LinkItem[];
  signals: Signal[];
  payment: ParsedUPI | null;
  upiCount: number;
  notes: string[];
  ml: MLAnalysisResult | null;
  apiError: string | null;
  decision: MLDecision | 'UNVERIFIED';
  handoffAllowed: boolean;
  localFallbackAllowed: boolean;
}

interface Props {
  telemetry: TelemetryState;
  initialInput?: string;
  onViewInvestigation?: (input: TraceInput) => void;
}

const URL_PATTERN = /(?:https?:\/\/[^\s<>"'`]+|upi:\/\/pay\?[^\s<>"'`]+)/gi;
const SENSITIVE_HOST_WORDS = /(?:verify|refund|cashback|kyc|bank|payment|secure)/i;

function extractLinks(text: string): string[] {
  const found = new Set<string>();

  function collect(source: string) {
    for (const match of source.matchAll(URL_PATTERN)) {
      const candidate = match[0].replace(/[),\]}>.!?;:'"]+$/g, '');
      if (candidate) found.add(candidate);
    }
  }

  // Preserve percent-encoded spaces in UPI query parameters.
  collect(text);

  // Only try decoding when no supported URL exists in the original message.
  if (found.size === 0) {
    try {
      const decoded = decodeURIComponent(text);
      if (decoded !== text) collect(decoded);
    } catch {
      // Keep original text if percent encoding is malformed.
    }
  }

  const trimmed = text.trim();
  if (
    found.size === 0 &&
    !/\s/.test(trimmed) &&
    /^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?::\d+)?(?:\/[^\s]*)?$/i.test(trimmed)
  ) {
    found.add(`https://${trimmed}`);
  }

  return [...found].slice(0, 10);
}

function riskBandFromScore(score: number, hasWebDestination: boolean): RiskBand {
  if (score >= 70) return 'CRITICAL';
  if (score >= 40) return 'HIGH';
  if (score >= 20) return 'MEDIUM';
  return hasWebDestination ? 'UNVERIFIED' : 'LOW';
}

function decisionFromScore(score: number): MLDecision {
  if (score >= 60) return 'BLOCK';
  if (score >= 35) return 'WARN';
  return 'ALLOW';
}

function decisionRank(decision: MLDecision): number {
  return decision === 'ALLOW' ? 0 : decision === 'WARN' ? 1 : 2;
}

function stricterDecision(first: MLDecision, second: MLDecision): MLDecision {
  return decisionRank(first) >= decisionRank(second) ? first : second;
}

function isValidVpa(value: string): boolean {
  return /^[A-Za-z0-9._-]{2,256}@[A-Za-z0-9.-]{2,64}$/.test((value || '').trim());
}

function isValidAmount(value: string): boolean {
  if (!value) return true;
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0;
}

function analyseInput(text: string, telemetry: TelemetryState): AnalysisResult {
  const candidates = extractLinks(text);
  const links: LinkItem[] = [];
  const signals: Signal[] = [];
  const notes: string[] = [];
  let payment: ParsedUPI | null = null;
  let upiCount = 0;
  let urlPoints = 0;

  function addSignal(id: string, title: string, detail: string, points: number) {
    signals.push({ id, title, detail, points });
    urlPoints += points;
  }

  for (const raw of candidates) {
    if (/^upi:\/\//i.test(raw)) {
      upiCount++;
      const parsed = parseUPI(raw);

      links.push({
        raw,
        kind: 'upi',
        hostname: 'UPI payment request',
        notes: parsed ? ['Payment details read from the supplied UPI link.'] : ['The UPI link could not be parsed.'],
      });

      if (!payment && parsed) payment = parsed;

      if (!parsed) {
        addSignal(
          `upi-invalid-${upiCount}`,
          'Payment link could not be read',
          'The supplied UPI URI could not be parsed reliably.',
          30,
        );
      }
      continue;
    }

    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      links.push({ raw, kind: 'web', hostname: 'Unparsed URL', notes: ['URL structure could not be parsed.'] });
      addSignal(`url-invalid-${links.length}`, 'Invalid link format', 'This text could not be interpreted as a valid URL.', 15);
      continue;
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
      links.push({ raw, kind: 'web', hostname: url.hostname || 'Unknown', notes: ['Unsupported URL protocol.'] });
      addSignal(`url-protocol-${links.length}`, 'Unsupported link type', 'Only HTTP, HTTPS and recognised UPI payment links are supported.', 20);
      continue;
    }

    const hostname = url.hostname.toLowerCase();
    const linkNotes: string[] = [];

    if (url.username || url.password) {
      linkNotes.push('Contains embedded URL credentials.');
      addSignal(`url-credentials-${links.length}`, 'Unusual link structure', 'The URL places credentials before the hostname. This can be suspicious.', 30);
    }

    if (url.protocol === 'http:') {
      linkNotes.push('Does not use HTTPS.');
      addSignal(`url-http-${links.length}`, 'Unencrypted connection', 'The connection does not use HTTPS. This alone does not prove fraud.', 10);
    }

    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname) || /^\[[0-9a-f:]+\]$/i.test(hostname)) {
      linkNotes.push('Uses an IP address instead of a conventional domain.');
      addSignal(`url-ip-${links.length}`, 'Unusual destination', 'The URL points directly to an IP address. Check it carefully.', 20);
    }

    if (hostname.includes('xn--')) {
      linkNotes.push('Contains an internationalised/punycode hostname.');
      addSignal(`url-punycode-${links.length}`, 'Hostname needs review', 'Punycode can be legitimate but is sometimes used for look-alike domains.', 20);
    }

    if (hostname.split('.').length > 5) {
      linkNotes.push('Contains many hostname segments.');
      addSignal(`url-labels-${links.length}`, 'Complex hostname', 'Inspect the registered domain carefully before trusting it.', 10);
    }

    if (hostname.includes('-') && SENSITIVE_HOST_WORDS.test(hostname)) {
      linkNotes.push('Contains payment-related wording with hyphens.');
      addSignal(`url-lookalike-${links.length}`, 'Potentially misleading hostname', 'Payment-related wording and hyphens are a weak warning signal, not proof of impersonation.', 10);
    }

    const shorteners = new Set(['bit.ly', 'tinyurl.com', 't.co', 'cutt.ly', 'rb.gy']);
    if (shorteners.has(hostname)) {
      linkNotes.push('Shortened link; final destination has not been checked.');
      addSignal(`url-shortener-${links.length}`, 'Hidden destination', 'The destination behind this URL shortener has not been resolved.', 5);
    }

    links.push({ raw, kind: 'web', hostname, notes: linkNotes });
  }

  const paymentAssessment = payment
    ? assessRisk(payment, { ...telemetry, chatContext: `${telemetry.chatContext || ''} ${text}` })
    : null;

  let extraPaymentPoints = 0;
  if (payment?.am && (!Number.isFinite(Number(payment.am)) || Number(payment.am) <= 0)) {
    extraPaymentPoints = 25;
    signals.push({
      id: 'upi-invalid-amount',
      title: 'Invalid payment amount',
      detail: 'The payment amount is not a valid positive number.',
      points: extraPaymentPoints,
    });
  }

  if (paymentAssessment) {
    for (const vector of paymentAssessment.vectors) {
      if (!vector.triggered) continue;
      signals.push({ id: `upi-${vector.id}`, title: vector.label, detail: vector.description, points: vector.weight });
    }
  }

  const mentionsReward = /\b(refund|cashback|receive|reward|prize|claim)\b/i.test(text);
  if (mentionsReward && upiCount === 0) {
    notes.push('The message mentions a refund or reward, but no UPI payment link was found to inspect.');
  }
  if (candidates.length === 0) {
    notes.push('No supported link was found. Paste a web URL or UPI payment link.');
  }
  if (links.some((link) => link.kind === 'web')) {
    notes.push('The frontend checks link structure only. It has not inspected the website, confirmed ownership, or checked live domain reputation.');
  }
  if (upiCount > 0 && !payment) {
    notes.push('A UPI link was detected, but its payment details could not be parsed.');
  }
  if (upiCount > 1) {
    notes.push('More than one UPI destination was found. The payment handoff is disabled.');
  }

  const localScore = Math.min(100, (paymentAssessment?.compositeScore ?? 0) + Math.min(45, urlPoints) + extraPaymentPoints);
  const hasWebDestination = links.some((link) => link.kind === 'web');

  return {
    localScore,
    score: localScore,
    level: riskBandFromScore(localScore, hasWebDestination),
    links,
    signals,
    payment,
    upiCount,
    notes,
    ml: null,
    apiError: null,
    decision: 'UNVERIFIED',
    handoffAllowed: false,
    localFallbackAllowed: false,
  };
}

function mergeMLResult(local: AnalysisResult, ml: MLAnalysisResult, telemetry: TelemetryState): AnalysisResult {
  const score = Math.max(local.localScore, ml.riskScore);
  const localDecision = decisionFromScore(local.localScore);
  let decision = stricterDecision(ml.decision, localDecision);

  const activeCallOrScreenShare =
    telemetry.callState === 'ACTIVE_UNKNOWN' || telemetry.displaySecurity === 'SCREEN_CAST_DETECTED';

  if (activeCallOrScreenShare && decision === 'ALLOW') decision = 'WARN';

  const hasWebDestination = local.links.some((link) => link.kind === 'web');
  let level: RiskBand;

  if (decision === 'BLOCK') {
    level = score >= 70 ? 'CRITICAL' : 'HIGH';
  } else if (decision === 'WARN') {
    level = score >= 50 ? 'HIGH' : 'MEDIUM';
  } else if (local.localScore >= 40) {
    level = local.level;
  } else if (hasWebDestination || !local.payment || !ml.canRedirectToUpiApp) {
    level = 'UNVERIFIED';
  } else {
    level = 'LOW';
  }

  const payment = local.payment;
  const handoffAllowed =
    decision === 'ALLOW' &&
    ml.decision === 'ALLOW' &&
    ml.canRedirectToUpiApp &&
    local.localScore < 20 &&
    local.level === 'LOW' &&
    !hasWebDestination &&
    !activeCallOrScreenShare &&
    local.upiCount === 1 &&
    Boolean(payment) &&
    isValidVpa(payment?.pa || '') &&
    isValidAmount(payment?.am || '');

  return { ...local, score, level, ml, apiError: null, decision, handoffAllowed, localFallbackAllowed: false };
}

function makeUnavailableResult(
  local: AnalysisResult,
  error: string,
  telemetry: TelemetryState,
): AnalysisResult {
  const level = local.localScore >= 70
    ? 'CRITICAL'
    : local.localScore >= 40
      ? 'HIGH'
      : local.localScore >= 20
        ? 'MEDIUM'
        : 'UNVERIFIED';

  const hasWebDestination = local.links.some((link) => link.kind === 'web');
  const activeCallOrScreenShare =
    telemetry.callState === 'ACTIVE_UNKNOWN' ||
    telemetry.displaySecurity === 'SCREEN_CAST_DETECTED';
  const payment = local.payment;

  // Limited offline fallback: only for one directly supplied UPI payment URI,
  // low local score, no web destination and no simulated active-call/screen-share
  // warning. This is explicitly not an ML approval.
  const localFallbackAllowed = Boolean(
    !hasWebDestination &&
    local.upiCount === 1 &&
    payment &&
    payment.action.toLowerCase() === 'upi://pay' &&
    isValidVpa(payment.pa) &&
    isValidAmount(payment.am) &&
    local.level === 'LOW' &&
    local.localScore < 20 &&
    !activeCallOrScreenShare
  );

  return {
    ...local,
    score: local.localScore,
    level,
    ml: null,
    apiError: error,
    decision: 'UNVERIFIED',
    handoffAllowed: false,
    localFallbackAllowed,
  };
}

function resultStyle(level: RiskBand): string {
  if (level === 'HIGH' || level === 'CRITICAL') return 'border-crimson-fraud/20 bg-rose-50 text-crimson-fraud';
  if (level === 'MEDIUM' || level === 'UNVERIFIED') return 'border-amber-warn/20 bg-amber-50 text-amber-warn';
  return 'border-npcigreen/20 bg-emerald-50 text-npcigreen';
}

function resultTitle(result: AnalysisResult): string {
  if (result.apiError && result.level === 'UNVERIFIED') return 'Could not verify right now';
  if (result.decision === 'BLOCK') return 'Stop — payment blocked';
  if (result.decision === 'WARN') return 'Pause and review';
  if (result.level === 'UNVERIFIED') return 'Destination not verified';
  if (result.level === 'LOW') return 'No major warning signs found';
  return 'Some warning signs found';
}

export function LinkSafetyGateway({ telemetry, initialInput = '', onViewInvestigation }: Props) {
  const { t } = useI18n();
  const [input, setInput] = useState(initialInput);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [mlLoading, setMlLoading] = useState(false);
  const [userAverageAmount, setUserAverageAmount] = useState('300');
  const [isNewPayee, setIsNewPayee] = useState(false);
  const [expectedPayee, setExpectedPayee] = useState('');

  const lastAutoAnalyzedRef = useRef('');
  const analysisSequenceRef = useRef(0);
  const lastCheckedTextRef = useRef('');
  const hour = new Date().getHours();
  const isOddHour = hour >= 22 || hour < 6;

  const analyseText = useCallback(async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text) {
      setError('Paste a message, website link or UPI payment link first.');
      setResult(null);
      return;
    }

    setError('');
    const sequence = ++analysisSequenceRef.current;
    lastCheckedTextRef.current = text;
    const local = analyseInput(text, telemetry);
    setResult(local.localScore < 20 && local.level === 'LOW' ? { ...local, level: 'UNVERIFIED' } : local);
    setMlLoading(true);

    const average = Number(userAverageAmount);
    const payload: MLApiRequest = {
      message_or_url: text,
      upi_uri: local.payment?.raw || local.links.find((link) => link.kind === 'upi')?.raw || '',
      user_avg_amount: Number.isFinite(average) && average >= 0 ? average : 300,
      is_odd_hour: isOddHour ? 1 : 0,
      is_new_payee: isNewPayee ? 1 : 0,
      call_or_screenshare_active:
        telemetry.callState === 'ACTIVE_UNKNOWN' || telemetry.displaySecurity === 'SCREEN_CAST_DETECTED' ? 1 : 0,
    };

    try {
      const ml = await analyzePaymentWithML(payload);
      if (sequence !== analysisSequenceRef.current) return;
      setResult(mergeMLResult(local, ml, telemetry));
    } catch (requestError: unknown) {
      const message = requestError instanceof Error
        ? requestError.message
        : 'The ML analysis could not be completed.';
      if (sequence !== analysisSequenceRef.current) return;
      setResult(makeUnavailableResult(local, message, telemetry));
    } finally {
      if (sequence === analysisSequenceRef.current) setMlLoading(false);
    }
  }, [input, telemetry, userAverageAmount, isNewPayee, isOddHour]);

  useEffect(() => {
    const text = initialInput.trim();

    if (!text) {
      lastAutoAnalyzedRef.current = '';
      return;
    }

    if (lastAutoAnalyzedRef.current === text) return;

    // QR scans arrive as initialInput. Run the full local + ML check
    // automatically, but still require an explicit tap to open a UPI app.
    lastAutoAnalyzedRef.current = text;
    setInput(text);
    ++analysisSequenceRef.current;
    setResult(null);
    setError('');
    void analyseText(text);
  }, [initialInput, analyseText]);

  function handleAnalyse() {
    void analyseText();
  }

  function continueToUpi() {
    if (!result?.payment || input.trim() !== lastCheckedTextRef.current) return;
    // Client-side intent firewall is additional to, never a substitute for, ML policy.
    const intentCheck = analyzeTruthTrace({ message: input, paymentUri: result.payment.raw, expectedPayee });
    if (intentCheck.blockHandoff || screenMessage(input).status === 'HIGH_CONCERN') return;

    const payment = result.payment;
    const useLocalFallback = Boolean(
      result.apiError &&
      !result.ml &&
      result.localFallbackAllowed
    );

    // Normal handoff is only available after a validated ALLOW from the ML API.
    // The offline alternative is separate, stricter, and requires extra consent.
    if (!result.handoffAllowed && !useLocalFallback) return;

    if (
      !isValidVpa(payment.pa) ||
      !isValidAmount(payment.am) ||
      payment.action.toLowerCase() !== 'upi://pay' ||
      result.upiCount !== 1
    ) return;

    if (!useLocalFallback && (result.level !== 'LOW' || result.decision !== 'ALLOW')) {
      return;
    }

    const confirmationText = useLocalFallback
      ? `The ML safety service is unavailable.\n\n` +
        `Local checks did not reach the configured warning threshold, but this is NOT an ML approval and does NOT prove the payment is safe.\n\n` +
        `Recipient: ${payment.pn || payment.pa}\n` +
        `UPI ID: ${payment.pa}\n` +
        `Amount: ${payment.am ? `₹${formatAmount(payment.am)}` : 'Not specified'}\n` +
        `Local score: ${result.localScore}/100\n\n` +
        `Continue only if you independently trust this recipient. Review the name and amount in your UPI app. Continue with local checks only?`
      : `Review this payment in your UPI app.\n\n` +
        `Recipient: ${payment.pn || payment.pa}\n` +
        `UPI ID: ${payment.pa}\n` +
        `Amount: ${payment.am ? `₹${formatAmount(payment.am)}` : 'Not specified'}\n\n` +
        'Kavach cannot guarantee that a payment is safe. Verify the recipient and amount before authorising it.\n\nContinue?';

    if (window.confirm(confirmationText)) {
      // Use the real UPI URI. Android will offer a compatible installed UPI app.
      window.location.assign(payment.raw);
    }
  }

  function speakWarning() {
    const text = result?.ml?.voiceWarning;
    if (!text || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = 'hi-IN';
    speech.rate = 0.92;
    window.speechSynthesis.speak(speech);
  }

  const smsCheck = result ? screenMessage(input) : null;
  const smsRequiresReview = smsCheck?.status === 'HIGH_CONCERN';
  const intentTrace = result?.payment
    ? analyzeTruthTrace({ message: input, paymentUri: result.payment.raw, expectedPayee })
    : null;
  const firewallBlocked = Boolean(intentTrace?.blockHandoff);
  const canContinue = Boolean(result?.handoffAllowed && result.payment && !firewallBlocked && !smsRequiresReview);
  const canUseLocalFallback = Boolean(
    result?.apiError &&
    !result.ml &&
    result.localFallbackAllowed &&
    result.payment &&
    !firewallBlocked &&
    !smsRequiresReview
  );

  return (
    <div className="space-y-4">
      <header className="mb-1">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-blue">{t("paymentSafety")}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-primary">{t("messageCheckerTitle")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {t("messageCheckerDescription")}
        </p>
      </header>

      <section className="space-y-3 rounded-3xl border border-border bg-surface p-4 shadow-card sm:p-5">
        <label htmlFor="kavach-link-input" className="text-sm font-semibold text-ink-primary">
          {t("messageOrLink")}
        </label>
        <textarea
          id="kavach-link-input"
          value={input}
          onChange={(event) => {
            ++analysisSequenceRef.current;
            setMlLoading(false);
            setInput(event.target.value);
            setResult(null);
            setError('');
          }}
          placeholder={t('messagePlaceholder')}
          rows={5}
          maxLength={12000}
          className="w-full resize-none rounded-2xl border border-border bg-obsidian px-3.5 py-3 text-sm leading-relaxed text-ink-primary outline-none placeholder:text-ink-dim focus:border-brand-blue"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-ink-dim">{input.length}/12000</span>
          <button
            type="button"
            onClick={handleAnalyse}
            disabled={mlLoading}
            className="tactile inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:brightness-105 disabled:opacity-60"
          >
            {mlLoading ? <Loader2 size={17} className="animate-spin" /> : <Search size={17} />}
            {mlLoading ? t('checking') : t('checkForScams')}
          </button>
        </div>
        {error && <p role="alert" className="text-sm text-crimson-fraud">{error}</p>}
        <details className="group border-t border-border pt-3">
          <summary
            className="flex cursor-pointer list-none items-center justify-between gap-3 py-1 text-sm font-semibold text-ink-muted"
          >
            {t("optionalDetails")}
            <ChevronDown size={17} className="transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-3 pb-1 pt-3">
            <div>
              <label htmlFor="kavach-average-amount" className="block text-xs font-semibold text-ink-primary">
                Your usual payment amount (₹)
              </label>
              <input
                id="kavach-average-amount"
                type="number"
                min="0"
                step="1"
                value={userAverageAmount}
                onChange={(event) => setUserAverageAmount(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-obsidian px-3 py-2.5 text-sm text-ink-primary outline-none focus:border-brand-blue"
              />
            </div>
            <div>
              <label htmlFor="kavach-expected-payee" className="block text-xs font-semibold text-ink-primary">Expected recipient UPI ID (optional)</label>
              <input id="kavach-expected-payee" type="text" value={expectedPayee}
                onChange={event => setExpectedPayee(event.target.value)}
                placeholder="From a trusted source, not this message"
                className="mt-1.5 w-full rounded-xl border border-border bg-obsidian px-3 py-2.5 text-sm text-ink-primary outline-none focus:border-brand-blue" />
              <p className="mt-1 text-[11px] leading-relaxed text-ink-dim">TruthTrace compares this reference to the UPI recipient; it cannot verify ownership.</p>
            </div>
            <label className="flex items-start gap-2.5 text-xs leading-relaxed text-ink-muted">
              <input
                type="checkbox"
                checked={isNewPayee}
                onChange={(event) => setIsNewPayee(event.target.checked)}
                className="mt-0.5 accent-blue-600"
              />
              <span>I'm paying this recipient for the first time or can't verify them.</span>
            </label>
            <p className="text-[11px] leading-relaxed text-ink-dim">
              These are user-provided signals, not a bank account-history lookup. Local time is {isOddHour ? 'outside typical daytime hours' : 'within typical daytime hours'}.
            </p>
          </div>
        </details>
      </section>

      {mlLoading && (
        <div className="flex items-center gap-3 rounded-2xl border border-brand-blue/15 bg-brand-pale p-4 text-sm text-brand-navy" role="status">
          <Loader2 size={19} className="animate-spin text-brand-blue" />
          <div>
            <p className="font-semibold">Checking the payment details</p>
            <p className="mt-0.5 text-xs text-brand-navy/75">Local checks and the remote model are running.</p>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <section className={`rounded-3xl border p-4 shadow-card sm:p-5 ${firewallBlocked ? 'border-red-200 bg-red-50 text-red-800' : smsRequiresReview ? 'border-amber-200 bg-amber-50 text-amber-900' : resultStyle(result.level)}`}>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/75">
                {firewallBlocked || result.decision === 'BLOCK' || result.level === 'HIGH' || result.level === 'CRITICAL' ? (
                  <RiskAlertMark size={22} />
                ) : result.decision === 'WARN' || result.level === 'MEDIUM' || result.level === 'UNVERIFIED' ? (
                  <AlertTriangle size={22} />
                ) : (
                  <KavachMark size={22} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-extrabold leading-snug">{firewallBlocked ? 'Payment contradiction — handoff blocked' : smsRequiresReview ? 'Concerning message instructions — review required' : resultTitle(result)}</p>
                <p className="mt-1 text-sm leading-relaxed opacity-90">
                  {firewallBlocked
                    ? 'The payment intent conflicts with the supplied message or trusted recipient reference. Review the TruthTrace evidence below.'
                    : smsRequiresReview
                      ? 'This message contains instructions associated with scams. Do not act on the request before independent verification; payment handoff is disabled.'
                    : result.decision === 'BLOCK'
                    ? 'Do not continue with this payment. Review the reasons below.'
                    : result.decision === 'WARN'
                      ? 'Something needs your attention. Do not pay until you have checked the details.'
                      : result.level === 'UNVERIFIED'
                        ? 'We could not verify the destination. A low local score does not mean the link is safe.'
                        : result.level === 'LOW'
                          ? 'No major payment indicators were found in available evidence. Review SMS warnings separately below.'
                          : 'Review the flagged details before deciding what to do next.'}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {result.ml ? (
                <span className="rounded-full bg-white/75 px-3 py-1.5 text-xs font-bold">
                  Model score: {result.score}/100
                </span>
              ) : (
                <span className="rounded-full bg-white/75 px-3 py-1.5 text-xs font-bold">
                  {result.apiError ? `Local checks: ${result.localScore}/100 · not verified` : result.level === 'UNVERIFIED' ? 'Score unavailable' : `Local score: ${result.localScore}/100`}
                </span>
              )}
              <span className="rounded-full bg-white/75 px-3 py-1.5 text-xs font-bold">
                {result.ml ? `Model: ${result.decision}` : 'Model not connected'}
              </span>
              {firewallBlocked && <span className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-800">TruthTrace: STOP</span>}
            </div>
          </section>

          {smsCheck && input.trim() && (
            <section aria-label="Message warning signs" className="rounded-2xl border border-amber-200 bg-white p-4 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-extrabold text-slate-900">Context-aware SMS review</h2>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${smsCheck.status === 'HIGH_CONCERN' ? 'bg-rose-100 text-rose-800' : smsCheck.status === 'CAUTION' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                  {smsCheck.status === 'HIGH_CONCERN' ? 'CONCERNING TEXT' : smsCheck.status === 'CAUTION' ? 'REVIEW TEXT' : 'NOT VERIFIED'}
                </span>
              </div>
              {smsCheck.indicators.length ? (
                <div className="mt-2 space-y-2">
                  {smsCheck.indicators.slice(0, 3).map(item => (
                    <p key={item.id} className="text-xs leading-relaxed text-slate-700"><strong>{item.title}:</strong> {item.detail}</p>
                  ))}
                </div>
              ) : <p className="mt-2 text-xs leading-relaxed text-slate-600">No obvious text warnings found. This does not prove that the SMS, sender or website is genuine.</p>}
              {smsCheck.contextNotes.length > 0 && (
                <p className="mt-2 rounded-xl bg-slate-50 p-2.5 text-[11px] leading-relaxed text-slate-600">{smsCheck.contextNotes[0]}</p>
              )}
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">Context-aware rules (not sender verification). Website visited: No · Sender verified: No.</p>
            </section>
          )}

          {onViewInvestigation && (
            <button
              type="button"
              onClick={() => onViewInvestigation({
                message: input.trim(),
                paymentUri: result.payment?.raw || '',
                expectedPayee: expectedPayee.trim(),
                expectedDirection: 'unknown',
              })}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-extrabold text-blue-800 shadow-sm hover:bg-blue-100"
            >
              <KavachMark size={17} /> View full TruthTrace investigation <ArrowUpRight size={16} />
            </button>
          )}
          <p className="text-[11px] leading-relaxed text-slate-500">TruthTrace uses the same supplied text and observed UPI request. It does not fetch websites, verify recipient ownership or inherit demonstration data.</p>

          {result.apiError && (
            <section className="rounded-2xl border border-amber-warn/20 bg-amber-50 p-4">
              <div className="flex items-start gap-2.5">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-warn" />
                <div>
                  <p className="text-sm font-bold text-ink-primary">AI check unavailable</p>
                  <p className="mt-1 break-words text-xs leading-relaxed text-ink-muted">{result.apiError}</p>
                  <p className="mt-2 text-xs font-semibold text-amber-warn">No ML-backed payment approval was received.</p>
                </div>
              </div>
              {canUseLocalFallback && (
                <div className="mt-3 space-y-2 border-t border-amber-200 pt-3">
                  <p className="text-xs leading-relaxed text-amber-900">
                    A limited local-only option is available for this direct UPI request. It is not an AI approval. Review the recipient carefully and confirm the amount in your UPI app.
                  </p>
                  <button
                    type="button"
                    onClick={continueToUpi}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-white px-4 py-3 text-sm font-bold text-amber-900 shadow-sm hover:bg-amber-100"
                  >
                    Continue with local checks only <ArrowUpRight size={17} />
                  </button>
                </div>
              )}
            </section>
          )}

          {result.payment && (
            <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
              <p className="text-sm font-bold text-ink-primary">Payment details</p>
              <div className="mt-3 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-xs text-ink-muted">Payee</span>
                  <span className="max-w-[68%] break-all text-right text-sm font-semibold text-ink-primary">
                    {result.payment.pn || 'Name not provided'}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-xs text-ink-muted">UPI ID</span>
                  <span className="max-w-[68%] break-all text-right font-mono text-xs text-ink-primary">
                    {result.payment.pa || 'Not provided'}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-xs text-ink-muted">Amount</span>
                  <span className="text-right text-sm font-bold text-ink-primary">
                    {result.payment.am ? `₹${formatAmount(result.payment.am)}` : 'Not specified'}
                  </span>
                </div>
              </div>
              <p className="mt-3 border-t border-border pt-3 text-[11px] leading-relaxed text-ink-muted">
                Confirm the payee and amount in your UPI app. Kavach does not verify account ownership or confirm that a payment was completed.
              </p>
            </section>
          )}



          {firewallBlocked && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
              Payment handoff disabled: TruthTrace found a contradiction between the supplied claim/reference and the UPI request.
            </div>
          )}

          {canContinue && (
            <button type="button" onClick={continueToUpi}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-blue px-4 py-3 text-sm font-bold text-white shadow-sm hover:brightness-105">
              Continue to UPI app <ArrowUpRight size={18}/>
            </button>
          )}

          {result.links.length > 0 && (
            <details className="group rounded-2xl border border-border bg-surface shadow-card">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-semibold text-ink-primary">
                <span className="flex items-center gap-2"><LinkSafetyMark size={16} className="text-brand-blue" /> Link details ({result.links.length})</span>
                <ChevronDown size={17} className="text-ink-muted transition-transform group-open:rotate-180" />
              </summary>
              <div className="space-y-3 border-t border-border px-4 py-4">
                {result.links.map((link, index) => (
                  <div key={`${link.raw}-${index}`} className="rounded-xl bg-obsidian p-3">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="break-all text-xs font-semibold text-ink-primary">{link.hostname}</p>
                        <p className="mt-1 break-all font-mono text-[11px] leading-relaxed text-ink-muted">{link.raw}</p>
                      </div>
                    </div>
                    {link.notes.map((note, noteIndex) => (
                      <p key={`${note}-${noteIndex}`} className="mt-2 text-[11px] leading-relaxed text-amber-warn">{note}</p>
                    ))}
                  </div>
                ))}
              </div>
            </details>
          )}

          <details className="group rounded-2xl border border-border bg-surface shadow-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-semibold text-ink-primary">
              Why was this flagged?
              <ChevronDown size={17} className="text-ink-muted transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-3 border-t border-border px-4 py-4">
              {result.ml && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-blue">Model explanation</p>
                  {result.ml.xaiBreakdown.length > 0 ? (
                    <div className="space-y-3">
                      {result.ml.xaiBreakdown.map((item, index) => (
                        <div key={`${item.component}-${index}`} className="border-b border-border pb-3 last:border-0 last:pb-0">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-ink-primary">{item.component}</p>
                            <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-warn">+{item.points}</span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-ink-muted">{item.reason}</p>
                        </div>
                      ))}
                    </div>
                  ) : result.ml.xaiReasons.length > 0 ? (
                    <ul className="list-disc space-y-2 pl-5 text-xs leading-relaxed text-ink-muted">
                      {result.ml.xaiReasons.map((reason, index) => <li key={`${reason}-${index}`}>{reason}</li>)}
                    </ul>
                  ) : <p className="text-xs text-ink-muted">No model explanation was returned.</p>}
                </div>
              )}

              {result.signals.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-brand-blue">Local checks</p>
                  {result.signals.map((signal) => (
                    <div key={signal.id} className="rounded-xl bg-obsidian p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs font-semibold text-ink-primary">{signal.title}</p>
                        {signal.points > 0 && <span className="text-[11px] font-bold text-amber-warn">+{signal.points}</span>}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-ink-muted">{signal.detail}</p>
                    </div>
                  ))}
                </div>
              )}

              {result.notes.map((note, index) => (
                <p key={`${note}-${index}`} className="flex gap-2 text-xs leading-relaxed text-ink-muted">
                  <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-warn" />
                  {note}
                </p>
              ))}
            </div>
          </details>

          {result.ml?.voiceWarning && (
            <button
              type="button"
              onClick={speakWarning}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-ink-primary shadow-card hover:bg-obsidian"
            >
              <Volume2 size={17} className="text-brand-blue" />
              Play voice warning
            </button>
          )}

          {canContinue || canUseLocalFallback || firewallBlocked ? null : (
            <div className="flex items-start gap-2 rounded-2xl border border-border bg-surface p-3.5 text-xs leading-relaxed text-ink-muted">
              {result.decision === 'BLOCK' ? <RiskAlertMark size={16} className="mt-0.5 shrink-0 text-crimson-fraud" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-ink-dim" />}
              <span>
                {result.decision === 'BLOCK'
                  ? 'Payment handoff is blocked by the risk decision.'
                  : result.decision === 'WARN'
                    ? 'Review is required. The normal payment handoff is disabled.'
                    : result.apiError
                      ? 'The model could not be reached. Offline handoff is available only for a single low-risk UPI URI, with no web destination or active-call/screen-share signal.'
                      : result.links.some((link) => link.kind === 'web')
                        ? 'This website has not been inspected, so Kavach will not present it as verified safe.'
                        : result.upiCount > 1
                          ? 'More than one payment destination was found. Handoff is disabled.'
                          : 'No approved UPI handoff is available for this input.'}
              </span>
            </div>
          )}
        </div>
      )}

      <p className="px-1 text-[11px] leading-relaxed text-ink-dim">
        {t("privacyDisclaimer")}
      </p>
    </div>
  );
}
