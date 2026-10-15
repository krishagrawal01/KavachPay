export type MLDecision = 'ALLOW' | 'WARN' | 'BLOCK';

export interface MLApiRequest {
  message_or_url: string;
  upi_uri: string;
  user_avg_amount: number;
  is_odd_hour: 0 | 1;
  is_new_payee: 0 | 1;
  call_or_screenshare_active: 0 | 1;
}

export interface MLXaiContribution {
  component: string;
  points: number;
  reason: string;
}

export interface MLParsedUPI {
  pa: string;
  pn: string;
  am: string | number;
  tn: string;
  mc: string;
}

export interface MLAnalysisResult {
  riskScore: number;
  decision: MLDecision;
  canRedirectToUpiApp: boolean;
  parsedUpi: MLParsedUPI | null;
  xaiBreakdown: MLXaiContribution[];
  xaiReasons: string[];
  voiceWarning: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeDecision(value: unknown): MLDecision | null {
  if (typeof value !== 'string') return null;

  const decision = value.trim().toUpperCase();

  if (decision === 'ALLOW' || decision === 'WARN' || decision === 'BLOCK') {
    return decision;
  }

  return null;
}

function decisionFromScore(score: number): MLDecision {
  if (score >= 60) return 'BLOCK';
  if (score >= 35) return 'WARN';
  return 'ALLOW';
}

function parseXaiBreakdown(value: unknown): MLXaiContribution[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item): MLXaiContribution[] => {
    if (!isRecord(item)) return [];

    const component =
      typeof item.component === 'string' ? item.component : '';
    const reason =
      typeof item.reason === 'string' ? item.reason : '';
    const points = Number(item.points);

    if (
      !component ||
      !reason ||
      !Number.isFinite(points) ||
      points < 0
    ) {
      return [];
    }

    return [{ component, points, reason }];
  });
}

function parseXaiReasons(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (reason): reason is string =>
      typeof reason === 'string' && reason.trim().length > 0
  );
}

function parseServerUpi(value: unknown): MLParsedUPI | null {
  if (!isRecord(value)) return null;

  const pa = typeof value.pa === 'string' ? value.pa : '';
  const pn = typeof value.pn === 'string' ? value.pn : '';
  const am =
    typeof value.am === 'string' || typeof value.am === 'number'
      ? value.am
      : '';
  const tn = typeof value.tn === 'string' ? value.tn : '';
  const mc = typeof value.mc === 'string' ? value.mc : '';

  if (!pa && !pn && !am && !tn && !mc) return null;

  return { pa, pn, am, tn, mc };
}

function getEndpoint(): string {
  const configured =
    typeof import.meta.env.VITE_ML_API_URL === 'string'
      ? import.meta.env.VITE_ML_API_URL.trim()
      : '';

  if (!configured) {
    throw new Error(
      'ML API URL is not configured. Add VITE_ML_API_URL with the current Colab/Cloudflare endpoint, then restart Vite and rebuild before deploying.'
    );
  }

  return configured;
}

export async function analyzePaymentWithML(
  payload: MLApiRequest
): Promise<MLAnalysisResult> {
  let endpoint: URL;

  try {
    endpoint = new URL(getEndpoint());
  } catch {
    throw new Error('The ML API endpoint URL is invalid.');
  }

  if (endpoint.protocol !== 'https:') {
    throw new Error('The ML API endpoint must use HTTPS.');
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    15000
  );

  let response: Response;

  try {
    response = await fetch(endpoint.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      mode: 'cors',
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('The ML API timed out after 15 seconds.');
    }

    throw new Error(
      'The browser could not reach the ML API. Check whether the Colab server and Cloudflare tunnel are running and whether the backend allows your website origin through CORS.'
    );
  } finally {
    window.clearTimeout(timeoutId);
  }

  const responseText = await response.text();
  let body: unknown;

  try {
    body = JSON.parse(responseText);
  } catch {
    throw new Error(
      `The ML API returned invalid JSON (HTTP ${response.status}).`
    );
  }

  if (!isRecord(body)) {
    throw new Error('The ML API response has an unexpected format.');
  }

  if (!response.ok) {
    const detail =
      typeof body.detail === 'string'
        ? body.detail
        : typeof body.error === 'string'
          ? body.error
          : `HTTP ${response.status}`;

    throw new Error(`ML API request failed: ${detail}`);
  }

  // Require the revised response contract. This deliberately rejects
  // stale responses from the previous, inconsistent model version.
  if (body.status !== 'success') {
    throw new Error(
      'The ML API did not return status="success". Confirm that the updated model endpoint is running.'
    );
  }

  if (
    body.error !== null &&
    body.error !== undefined &&
    body.error !== ''
  ) {
    throw new Error(
      typeof body.error === 'string'
        ? body.error
        : 'The ML API reported an analysis error.'
    );
  }

  const riskScore = Number(body.risk_score);
  const reportedDecision = normalizeDecision(body.decision);

  if (
    !Number.isFinite(riskScore) ||
    riskScore < 0 ||
    riskScore > 100 ||
    !reportedDecision
  ) {
    throw new Error(
      'The ML API is missing a valid risk_score or decision.'
    );
  }

  if (typeof body.can_redirect_to_upi_app !== 'boolean') {
    throw new Error(
      'The ML API is missing the can_redirect_to_upi_app boolean.'
    );
  }

  if (!Array.isArray(body.xai_breakdown)) {
    throw new Error(
      'The ML API omitted xai_breakdown. Update the backend before connecting this version.'
    );
  }

  if (!Array.isArray(body.xai_reasons)) {
    throw new Error(
      'The ML API omitted xai_reasons.'
    );
  }

  const xaiBreakdown = parseXaiBreakdown(body.xai_breakdown);

  if (
    body.xai_breakdown.length > 0 &&
    xaiBreakdown.length !== body.xai_breakdown.length
  ) {
    throw new Error(
      'The ML API returned an invalid XAI contribution.'
    );
  }

  // Check the central scoring contract:
  // risk_score must equal min(100, sum of XAI contributions).
  const contributionSum = xaiBreakdown.reduce(
    (sum, item) => sum + item.points,
    0
  );

  const reconstructedScore = Math.min(100, contributionSum);

  if (Math.abs(reconstructedScore - Math.round(riskScore)) > 0.001) {
    throw new Error(
      `The model score (${riskScore}) does not match the XAI contribution total (${reconstructedScore}). The backend response was rejected.`
    );
  }

  const scoreDecision = decisionFromScore(riskScore);
  const activeCallOrScreenShare =
    payload.call_or_screenshare_active === 1;

  // An active-call guardrail may elevate ALLOW to WARN even below 35.
  const permittedGuardrailWarning =
    activeCallOrScreenShare &&
    scoreDecision === 'ALLOW' &&
    reportedDecision === 'WARN';

  if (
    reportedDecision !== scoreDecision &&
    !permittedGuardrailWarning
  ) {
    throw new Error(
      'The model decision contradicts its risk score and configured thresholds.'
    );
  }

  if (
    body.can_redirect_to_upi_app === true &&
    reportedDecision !== 'ALLOW'
  ) {
    throw new Error(
      'The model allowed a payment handoff while its decision was not ALLOW.'
    );
  }

  let decision = reportedDecision;

  // Independent client-side guardrail.
  if (activeCallOrScreenShare && decision === 'ALLOW') {
    decision = 'WARN';
  }

  const canRedirectToUpiApp =
    body.can_redirect_to_upi_app === true &&
    decision === 'ALLOW' &&
    riskScore <= 34 &&
    !activeCallOrScreenShare;

  return {
    riskScore: Math.round(riskScore),
    decision,
    canRedirectToUpiApp,
    parsedUpi: parseServerUpi(body.parsed_upi),
    xaiBreakdown,
    xaiReasons: parseXaiReasons(body.xai_reasons),
    voiceWarning:
      typeof body.voice_warning_hindi === 'string'
        ? body.voice_warning_hindi
        : '',
  };
}
