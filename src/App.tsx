import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  FlaskConical,
  Sparkles,
} from 'lucide-react';

import { PhoneShell, JudgePanel } from '@/components/PhoneShell';
import { AppHeader } from '@/components/AppHeader';
import { AccuracyMark, FundFlowMark, KavachMark, PatternMemoryMark, TruthTraceMark } from '@/components/KavachIcons';
import { QRScanner } from '@/components/QRScanner';
import { UPIDissector } from '@/components/UPIDissector';
import { InterceptionShield } from '@/components/InterceptionShield';
import { TabBar } from '@/components/TabBar';
import { JudgeControls } from '@/components/JudgeControls';
import { MuleGraph, AdaptiveMemory } from '@/components/MuleGraph';
import { WhatsAppPopup } from '@/components/WhatsAppPopup';
import { LinkSafetyGateway } from '@/components/LinkSafetyGateway';
import { TruthTraceLab } from '@/components/TruthTraceLab';
import { AccuracyLab } from '@/components/AccuracyLab';

import { parseUPI, formatAmount } from '@/lib/upi';
import { assessRisk } from '@/lib/risk';
import { analyzeShopImage, type ShopAnalysisResult } from '@/lib/gemini';
import { SCENARIO_MAP, URL_TRIGGER_MAP, SCENARIOS } from '@/lib/scenarios';
import {
  playWarningChime,
  playSafeChime,
  triggerHaptics,
  speakWarning,
} from '@/lib/audio';
import {
  broadcastSync,
  onSyncUpdate,
  onStorageSyncUpdate,
  getLastSync,
  type SyncPayload,
} from '@/lib/sync';
import type { TraceInput } from '@/lib/truthTrace';
import { useI18n } from '@/lib/i18n';
import type {
  ParsedUPI,
  RiskAssessment,
  TelemetryState,
  Scenario,
  TabKey,
} from '@/lib/types';

const DEFAULT_TELEMETRY: TelemetryState = {
  callState: 'IDLE',
  displaySecurity: 'SECURE',
  chatContext: 'None',
  shopSignboard: '',
};

function App() {
  const { t } = useI18n();
  const [telemetry, setTelemetry] = useState<TelemetryState>(DEFAULT_TELEMETRY);
  const [rawUri, setRawUri] = useState('');
  const [parsed, setParsed] = useState<ParsedUPI | null>(null);
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [showShield, setShowShield] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showJudgePanel, setShowJudgePanel] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('scanner');
  const [geminiKey, setGeminiKey] = useState('');
  const [shopAnalysis, setShopAnalysis] = useState<ShopAnalysisResult | null>(null);
  const [analyzingShop, setAnalyzingShop] = useState(false);
  const [adaptedVersion, setAdaptedVersion] = useState(0);
  const [investigationDraft, setInvestigationDraft] = useState<TraceInput | undefined>(undefined);
  const [investigationReturnTab, setInvestigationReturnTab] = useState<'links' | 'tools'>('tools');
  const [investigationVersion, setInvestigationVersion] = useState(0);
  const [whatsappPopup, setWhatsappPopup] = useState<{ sender: string; message: string } | null>(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const applySync = (payload: SyncPayload) => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;

      const scenario = payload.scenarioId
        ? SCENARIO_MAP[payload.scenarioId]
        : null;

      if (scenario) {
        setActiveScenarioId(scenario.id);
        setTelemetry(scenario.telemetry);
      } else {
        setActiveScenarioId(null);
        setTelemetry({
          callState: payload.telemetry.callState as 'IDLE' | 'ACTIVE_UNKNOWN',
          displaySecurity: payload.telemetry.displaySecurity as 'SECURE' | 'SCREEN_CAST_DETECTED',
          chatContext: 'None',
          shopSignboard: '',
        });
      }

      setActiveTab('scanner');
      setRawUri(payload.rawUri);
      const nextParsed = parseUPI(payload.rawUri);

      if (nextParsed) {
        setParsed(nextParsed);
        setAssessment(assessRisk(nextParsed, {
          callState: payload.telemetry.callState as 'IDLE' | 'ACTIVE_UNKNOWN',
          displaySecurity: payload.telemetry.displaySecurity as 'SECURE' | 'SCREEN_CAST_DETECTED',
          chatContext: 'None',
          shopSignboard: '',
        }));
      } else {
        setParsed(null);
        setAssessment(null);
      }

      setShowShield(payload.assessment?.level === 'CRITICAL');
      window.setTimeout(() => {
        isSyncingRef.current = false;
      }, 100);
    };

    const last = getLastSync();
    if (last && Date.now() - last.timestamp < 60000) {
      applySync(last);
    }

    const unbindBroadcast = onSyncUpdate(applySync);
    const unbindStorage = onStorageSyncUpdate(applySync);

    return () => {
      unbindBroadcast();
      unbindStorage();
    };
  }, []);

  const computeAssessment = useCallback((uri: string, currentTelemetry: TelemetryState) => {
    const nextParsed = parseUPI(uri);

    if (!nextParsed) {
      setParsed(null);
      setAssessment(null);
      broadcastSync({
        rawUri: uri,
        parsed: null,
        assessment: null,
        telemetry: {
          callState: currentTelemetry.callState,
          displaySecurity: currentTelemetry.displaySecurity,
        },
        scenarioId: null,
      });
      return;
    }

    setParsed(nextParsed);
    const nextAssessment = assessRisk(nextParsed, currentTelemetry);
    setAssessment(nextAssessment);

    broadcastSync({
      rawUri: uri,
      parsed: {
        pa: nextParsed.pa,
        pn: nextParsed.pn,
        am: nextParsed.am,
        tn: nextParsed.tn,
        mc: nextParsed.mc,
      },
      assessment: {
        compositeScore: nextAssessment.compositeScore,
        level: nextAssessment.level,
        latencyMs: nextAssessment.latencyMs,
        vectors: nextAssessment.vectors.map((vector) => ({
          id: vector.id,
          label: vector.label,
          weight: vector.weight,
          triggered: vector.triggered,
        })),
      },
      telemetry: {
        callState: currentTelemetry.callState,
        displaySecurity: currentTelemetry.displaySecurity,
      },
      scenarioId: null,
    });

    if (nextAssessment.level === 'CRITICAL') {
      setShowShield(true);
      playWarningChime();
      triggerHaptics([300, 100, 300, 100, 500]);
      speakWarning(formatAmount(nextParsed.am), muted);
    } else {
      setShowShield(false);
      if (nextAssessment.level === 'SAFE') playSafeChime();
    }
  }, [muted]);

  const resetScan = useCallback(() => {
    setRawUri('');
    setParsed(null);
    setAssessment(null);
    setActiveScenarioId(null);
    setShowShield(false);
    setShopAnalysis(null);
    setActiveTab('scanner');
    broadcastSync({
      rawUri: '',
      parsed: null,
      assessment: null,
      telemetry: {
        callState: telemetry.callState,
        displaySecurity: telemetry.displaySecurity,
      },
      scenarioId: null,
    });
  }, [telemetry]);

  const loadScenario = useCallback((scenario: Scenario) => {
    setActiveTab('scanner');
    setActiveScenarioId(scenario.id);
    setTelemetry(scenario.telemetry);
    setRawUri(scenario.uri);
    setShopAnalysis(null);
    computeAssessment(scenario.uri, scenario.telemetry);

    const scenarioParsed = parseUPI(scenario.uri);
    const scenarioAssessment = scenarioParsed
      ? assessRisk(scenarioParsed, scenario.telemetry)
      : null;

    broadcastSync({
      rawUri: scenario.uri,
      parsed: scenarioParsed
        ? {
            pa: scenarioParsed.pa,
            pn: scenarioParsed.pn,
            am: scenarioParsed.am,
            tn: scenarioParsed.tn,
            mc: scenarioParsed.mc,
          }
        : null,
      assessment: scenarioAssessment
        ? {
            compositeScore: scenarioAssessment.compositeScore,
            level: scenarioAssessment.level,
            latencyMs: scenarioAssessment.latencyMs,
            vectors: scenarioAssessment.vectors.map((vector) => ({
              id: vector.id,
              label: vector.label,
              weight: vector.weight,
              triggered: vector.triggered,
            })),
          }
        : null,
      telemetry: {
        callState: scenario.telemetry.callState,
        displaySecurity: scenario.telemetry.displaySecurity,
      },
      scenarioId: scenario.id,
    });
  }, [computeAssessment]);

  const handleScanResult = useCallback((text: string) => {
    setRawUri(text);
    setActiveScenarioId(null);

    // Every scanned result must pass through the ML-backed safety check.
    // A recognised UPI URI is not treated as safe merely because it parses.
    computeAssessment(text, telemetry);
    setShowShield(false);
    setActiveTab('links');
  }, [telemetry, computeAssessment]);

  const handleTelemetryChange = useCallback((nextTelemetry: TelemetryState) => {
    setTelemetry(nextTelemetry);
    if (rawUri) computeAssessment(rawUri, nextTelemetry);
  }, [rawUri, computeAssessment]);

  const handleShopImage = useCallback(async (dataUrl: string) => {
    setAnalyzingShop(true);
    setShopAnalysis(null);
    const payeeName = parsed?.pn || undefined;

    try {
      const result = await analyzeShopImage(dataUrl, geminiKey, payeeName);
      setShopAnalysis(result);

      if (result.printedShopName) {
        setTelemetry((previous) => {
          const updated = { ...previous, shopSignboard: result.printedShopName };
          if (rawUri) computeAssessment(rawUri, updated);
          return updated;
        });
      }
    } catch {
      setShopAnalysis({
        printedShopName: 'Analysis failed',
        matchesQrPayee: false,
        explanation: 'Could not analyze image.',
        isMerchant: false,
        confidence: 0,
        risks: ['Could not analyze image.'],
      });
    } finally {
      setAnalyzingShop(false);
    }
  }, [geminiKey, rawUri, computeAssessment, parsed]);

  const handleBlock = useCallback(() => {
    setShowShield(false);
    resetScan();
  }, [resetScan]);

  const handleOverride = useCallback(() => {
    // Do not bypass the safety policy or show a simulated PIN pad.
    // Open the full ML-backed review instead; a BLOCK still stays blocked.
    setShowShield(false);
    setActiveTab('links');
  }, []);

  const handleDismissShield = useCallback(() => {
    setShowShield(false);
  }, []);

  const handleProceedToPin = useCallback(() => {
    // The primary action is a safety review, not a fake PIN screen.
    setActiveTab('links');
  }, []);

  const openInvestigation = useCallback((input: TraceInput) => {
    setInvestigationDraft(input);
    setInvestigationReturnTab('links');
    setInvestigationVersion(version => version + 1);
    setActiveTab('truthtrace');
  }, []);

  const openInvestigationExamples = useCallback(() => {
    setInvestigationDraft(undefined);
    setInvestigationReturnTab('tools');
    setInvestigationVersion(version => version + 1);
    setActiveTab('truthtrace');
  }, []);

  const openPatternInChecker = useCallback((message: string) => {
    setRawUri(message);
    setActiveTab('links');
  }, []);

  const handlePatternAdded = useCallback(() => {
    setAdaptedVersion((version) => version + 1);
  }, []);

  const handleSimulateWhatsApp = useCallback(() => {
    setWhatsappPopup({
      sender: 'OLX Buyer',
      message: 'Bro scan this QR to receive Rs 5,000 advance',
    });
    setShowJudgePanel(false);
  }, []);

  const handleWhatsAppTapToScan = useCallback(() => {
    setWhatsappPopup(null);
    const scamScenario = SCENARIOS.find((scenario) => scenario.id === 'refund_trap');
    if (scamScenario) loadScenario(scamScenario);
  }, [loadScenario]);

  useEffect(() => {
    if (rawUri && adaptedVersion > 0) {
      computeAssessment(rawUri, telemetry);
    }
  }, [adaptedVersion]); // Intentionally re-run only when the local pattern set changes.

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scenarioKey = params.get('scenario');
    const scenarioId = scenarioKey ? URL_TRIGGER_MAP[scenarioKey] : undefined;
    const scenario = scenarioId ? SCENARIO_MAP[scenarioId] : undefined;

    if (scenario) {
      const timeout = window.setTimeout(() => loadScenario(scenario), 300);
      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, []); // URL-triggered demo runs once on initial load.

  const callActive = telemetry.callState === 'ACTIVE_UNKNOWN';
  const screenShareActive = telemetry.displaySecurity === 'SCREEN_CAST_DETECTED';

  return (
    <PhoneShell callActive={callActive} screenShareActive={screenShareActive}>
      <AppHeader
        muted={muted}
        onToggleMute={() => setMuted((value) => !value)}
        onToggleJudgePanel={() => setShowJudgePanel(true)}
      />

      {whatsappPopup && (
        <WhatsAppPopup
          sender={whatsappPopup.sender}
          message={whatsappPopup.message}
          onTapToScan={handleWhatsAppTapToScan}
          onDismiss={() => setWhatsappPopup(null)}
        />
      )}

      <main className="flex-1 min-h-0 overflow-y-auto scroll-hide bg-obsidian">
        {activeTab === 'scanner' && (
          <>
            {!parsed && (
              <section className="px-5 pb-3 pt-5 sm:px-6">
                <div className="max-w-md">
                  <div className="kavach-section-label flex items-center gap-2">
                    <KavachMark size={16} />
                    {t("paymentSafety")}
                  </div>
                  <h1 className="mt-2.5 max-w-[330px] text-[27px] font-bold leading-[1.12] tracking-[-0.035em] text-ink-primary">
                    {t("homeTitle")}
                  </h1>
                  <p className="mt-2 max-w-[340px] text-[14px] leading-6 text-ink-muted">
                    {t("homeDescription")}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[12px] font-medium text-ink-muted">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-npcigreen" />
                    {t("localChecksAi")}
                  </div>
                </div>
              </section>
            )}


            {parsed && assessment ? (
              <section className="px-4 pt-4 sm:px-5">
                <button
                  type="button"
                  onClick={resetScan}
                  className="mb-3 inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-brand-blue hover:bg-brand-pale"
                >
                  <ArrowLeft size={17} />
                  Check another payment
                </button>
                <UPIDissector
                  parsed={parsed}
                  assessment={assessment}
                  onReviewPayment={handleProceedToPin}
                />
              </section>
            ) : (
              <QRScanner
                onResult={handleScanResult}
                onShopImage={handleShopImage}
                shopAnalysis={shopAnalysis}
                analyzingShop={analyzingShop}
                geminiKey={geminiKey}
                qrPayeeName={parsed?.pn}
              />
            )}

            {activeScenarioId && (
              <div className="mx-4 mb-4 rounded-xl border border-brand-blue/15 bg-brand-pale px-3 py-2.5 text-xs text-brand-navy sm:mx-5">
                <span className="font-semibold">Demo loaded:</span>{' '}
                {SCENARIO_MAP[activeScenarioId]?.label || 'Scenario'}
                <button
                  type="button"
                  onClick={resetScan}
                  className="ml-2 font-bold text-brand-blue underline underline-offset-2"
                >
                  Reset
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 'links' && (
          <div className="px-5 py-5 sm:px-6">
            <LinkSafetyGateway telemetry={telemetry} initialInput={rawUri} onViewInvestigation={openInvestigation} />
          </div>
        )}

        {activeTab === 'tools' && (
          <section className="space-y-5 px-5 py-5 sm:px-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-blue">
                {t("toolsEyebrow")}
              </p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-primary">
                {t("toolsTitle")}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {t("toolsDescription")}
              </p>
            </div>

            <button
              type="button"
              onClick={openInvestigationExamples}
              className="tactile flex w-full items-center gap-4 rounded-xl border border-border bg-white p-4 text-left transition-colors hover:border-blue-300"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-blue text-white">
                <TruthTraceMark size={24} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-extrabold text-ink-primary">{t("truthTraceReport")} <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700">{t("demo")}</span></span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-muted">{t("truthTraceDescription")}</span>
              </span>
              <ChevronRight size={19} className="shrink-0 text-ink-dim" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('adaptive')}
              className="tactile flex w-full items-center gap-4 rounded-xl border border-border bg-white p-4 text-left transition-colors hover:border-brand-blue/40"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-npcigreen">
                <PatternMemoryMark size={24} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-ink-primary">{t("patternMemory")}</span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-muted">{t("patternMemoryDescription")}</span>
              </span>
              <ChevronRight size={19} className="shrink-0 text-ink-dim" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('accuracy')}
              className="tactile flex w-full items-center gap-4 rounded-2xl border border-border bg-surface p-4 text-left shadow-card hover:border-brand-blue/30"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><AccuracyMark size={24}/></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-ink-primary">{t("accuracyLab")} <span className="ml-1 text-[10px] text-violet-700">{t("new")}</span></span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-muted">{t("accuracyLabDescription")}</span>
              </span>
              <ChevronRight size={19} className="shrink-0 text-ink-dim" />
            </button>

            <details className="group rounded-xl border border-border bg-white">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-ink-primary">
                {t("additionalVisualisations")}
                <ChevronRight size={17} className="text-ink-muted transition-transform group-open:rotate-90" />
              </summary>
              <div className="border-t border-border p-2">
            <button
              type="button"
              onClick={() => setActiveTab('mule')}
              className="tactile flex w-full items-center gap-4 rounded-2xl border border-border bg-surface p-4 text-left shadow-card hover:border-brand-blue/30"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-pale text-brand-blue">
                <FundFlowMark size={24} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-ink-primary">{t("fundFlowNetwork")}</span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-muted">{t("fundFlowDescription")}</span>
              </span>
              <ChevronRight size={19} className="shrink-0 text-ink-dim" />
            </button>

              </div>
            </details>

            <div className="rounded-xl border border-border bg-white p-4">
              <div className="flex items-start gap-3">
                <FlaskConical size={18} className="mt-0.5 text-brand-blue" />
                <div>
                  <p className="text-sm font-bold text-ink-primary">{t("hackathonDemoMode")}</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                    Use the settings button above for prepared scam scenarios and simulated device signals. These are demo controls, not live Android system detection.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowJudgePanel(true)}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand-blue px-3.5 py-2.5 text-xs font-bold text-white hover:brightness-105"
                  >
                    <Sparkles size={14} />
                    {t("openDemoControls")}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'truthtrace' && (
          <section className="px-4 py-5 sm:px-5">
            <button type="button" onClick={() => setActiveTab(investigationReturnTab)}
              className="mb-3 inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-brand-blue hover:bg-brand-pale">
              <ArrowLeft size={17} /> {investigationReturnTab === 'links' ? 'Back to message check' : 'Back to tools'}
            </button>
            <TruthTraceLab key={investigationVersion} initialInput={investigationDraft} />
          </section>
        )}

        {activeTab === 'accuracy' && (
          <section className="px-4 py-5 sm:px-5">
            <AccuracyLab onBack={() => setActiveTab('tools')} />
          </section>
        )}

        {(activeTab === 'mule' || activeTab === 'adaptive') && (
          <section className="px-4 py-5 sm:px-5">
            <button
              type="button"
              onClick={() => setActiveTab('tools')}
              className="mb-3 inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-brand-blue hover:bg-brand-pale"
            >
              <ArrowLeft size={17} />
              Back to tools
            </button>

            {activeTab === 'mule' && <MuleGraph parsed={parsed} />}
            {activeTab === 'adaptive' && (
              <AdaptiveMemory onPatternAdded={handlePatternAdded} onCheckMessage={openPatternInChecker} />
            )}
          </section>
        )}
      </main>

      <TabBar active={activeTab} onChange={setActiveTab} />

      {showShield && parsed && assessment && assessment.level === 'CRITICAL' && (
        <InterceptionShield
          parsed={parsed}
          assessment={assessment}
          muted={muted}
          onToggleMute={() => setMuted((value) => !value)}
          onBlock={handleBlock}
          onOverride={handleOverride}
          onDismiss={handleDismissShield}
        />
      )}

      <JudgePanel open={showJudgePanel} onClose={() => setShowJudgePanel(false)}>
        <JudgeControls
          geminiKey={geminiKey}
          onGeminiKeyChange={setGeminiKey}
          onSelectScenario={(scenario) => {
            loadScenario(scenario);
            setShowJudgePanel(false);
          }}
          activeScenarioId={activeScenarioId}
          telemetry={telemetry}
          onTelemetryChange={handleTelemetryChange}
          onSimulateWhatsApp={handleSimulateWhatsApp}
        />
      </JudgePanel>
    </PhoneShell>
  );
}

export default App;
