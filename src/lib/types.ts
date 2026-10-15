export type CallState = 'IDLE' | 'ACTIVE_UNKNOWN';
export type DisplayState = 'SECURE' | 'SCREEN_CAST_DETECTED';
export type RiskLevel = 'SAFE' | 'WARNING' | 'CRITICAL';

export interface TelemetryState {
  callState: CallState;
  displaySecurity: DisplayState;
  chatContext: string;
  shopSignboard: string;
}

export interface ParsedUPI {
  action: string;
  pa: string;
  pn: string;
  am: string;
  cu: string;
  tn: string;
  mc: string;
  mode: string;
  raw: string;
  params: Record<string, string>;
}

export interface RiskVector {
  id: string;
  label: string;
  description: string;
  weight: number;
  triggered: boolean;
}

export interface RiskAssessment {
  compositeScore: number;
  level: RiskLevel;
  vectors: RiskVector[];
  latencyMs: number;
  deceptiveKeywords: string[];
  vpaAge: string;
  muleHop: number;
  isDebit: boolean;
}

export interface Scenario {
  id: string;
  label: string;
  tag: 'SAFE' | 'SCAM';
  tagNumber: number;
  title: string;
  uri: string;
  telemetry: TelemetryState;
  description: string;
}

export interface MuleNode {
  id: string;
  label: string;
  type: 'victim' | 'layer1' | 'layer2' | 'cashout';
  x: number;
  y: number;
  vpa?: string;
  badge?: string;
}

export interface MuleEdge {
  from: string;
  to: string;
  amount: string;
  delay: string;
}

export interface AdaptedPattern {
  id: string;
  signature: string;
  keywords: string[];
  addedAt: number;
  sampleText: string;
  matchLatency: string;
}

/** Main customer tabs plus advanced demo views. */
export type TabKey = 'scanner' | 'links' | 'tools' | 'mule' | 'adaptive';
