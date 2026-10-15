import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  ChevronDown,
  GitBranch,
  FileText,
  Upload,
  Trash2,
  Play,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  Sparkles,
} from 'lucide-react';
import {
  analyzeTruthTrace,
  type EvidenceStep,
  type TraceInput,
  type TraceResult,
} from '@/lib/truthTrace';

type Fixture = {
  id: string;
  name: string;
  short: string;
  input: TraceInput;
  replayPayee: string;
};

/** Empty evidence. Never preserve synthetic checkout HTML when analysing a real SMS. */
const EMPTY_INPUT: TraceInput = {
  message: '',
  html: '',
  paymentUri: '',
  claimedBusiness: '',
  expectedDirection: 'unknown',
  expectedPayee: '',
  expectedAmount: '',
};

// All test identities, links and recipients are synthetic; the lab initiates no payments.
const FIXTURES: Fixture[] = [
  {
    id: 'refund', name: 'Refund payment trick', short: 'Receive vs send',
    input: {
      message: 'Congratulations! Your ₹2,500 cashback refund is ready. Claim it now: https://claim-reward.example/refund',
      html: '<!doctype html><h1>Claim your refund</h1><a id="pay-now" href="upi://pay?pa=refunddesk@okaxis&amp;pn=Refund+Desk&amp;am=2500&amp;tn=Refund+Claim">Claim refund now</a>',
      expectedDirection: 'receive', expectedAmount: '', expectedPayee: '', claimedBusiness: 'Demo reward message',
    }, replayPayee: 'anotherdesk@okaxis',
  },
  {
    id: 'bill', name: 'Bill payee switch', short: 'Recipient mismatch',
    input: {
      message: 'Northbridge Power: your electricity bill of ₹1,250 is due today. Pay at https://northbridge-billing.example/pay',
      html: '<!doctype html><h1>Electricity bill</h1><a href="upi://pay?pa=collect-payments@okaxis&amp;pn=Billing+Agent&amp;am=1250&amp;tn=Electricity+bill">Pay bill</a>',
      expectedDirection: 'pay', expectedPayee: 'northbridge-bills@okaxis', expectedAmount: '1250', claimedBusiness: 'Northbridge Power (fictional)',
    }, replayPayee: 'northbridge-bills@okaxis',
  },
  {
    id: 'legit', name: 'Matching payment', short: 'Normal control case',
    input: {
      message: 'Your Northbridge Power bill is ₹1,250. Check the amount and recipient before paying.',
      html: '<a href="upi://pay?pa=northbridge-bills@okaxis&amp;pn=Northbridge+Power&amp;am=1250">Pay bill</a>',
      expectedDirection: 'pay', expectedPayee: 'northbridge-bills@okaxis', expectedAmount: '1250', claimedBusiness: 'Northbridge Power (fictional)',
    }, replayPayee: 'unrelated-collector@okaxis',
  },
  {
    id: 'qr', name: 'Tampered shop QR', short: 'Merchant mismatch',
    input: {
      message: 'I am paying ₹450 for coffee at Riverside Cafe. The trusted counter receipt lists riverside-cafe@demo as the merchant UPI ID.',
      paymentUri: 'upi://pay?pa=counter-collector@demo&pn=Riverside%20Cafe&am=450&tn=Coffee',
      expectedDirection: 'pay', expectedPayee: 'riverside-cafe@demo', expectedAmount: '450', claimedBusiness: 'Riverside Cafe (fictional)',
    }, replayPayee: 'riverside-cafe@demo',
  },
  {
    id: 'market', name: 'Buyer payment trick', short: 'Receive vs send',
    input: {
      message: 'Buyer: I am sending you ₹8,000 for your used phone. To RECEIVE the money, scan this payment QR and confirm.',
      paymentUri: 'upi://pay?pa=market-deposit@demo&pn=Buyer%20Verification&am=8000&tn=Phone%20sale',
      expectedDirection: 'receive', expectedPayee: '', expectedAmount: '8000', claimedBusiness: 'Marketplace buyer (fictional)',
    }, replayPayee: 'second-collector@demo',
  },
];

const CHAPTERS = [
  { title: 'The promise', subtitle: 'What the victim was told' },
  { title: 'The destination', subtitle: 'What the UPI request asks' },
  { title: 'The evidence', subtitle: 'Why the verdict changed' },
  { title: 'Live replay', subtitle: 'Change one detail and compare' },
] as const;

function amountLabel(amount: string | undefined): string {
  if (!amount) return 'Not specified';
  const value = Number(amount.replace(/,/g, ''));
  return Number.isFinite(value) && value >= 0
    ? `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : 'Not specified';
}

function claimedAmount(input: TraceInput): string | undefined {
  const textAmount = input.message.match(/(?:₹|\b(?:Rs\.?|INR)\s*)\s*([\d,]+(?:\.\d{1,2})?)/i);
  return textAmount?.[1]?.replace(/,/g, '') || input.expectedAmount || undefined;
}

function sourceLabel(source: EvidenceStep['source']): string {
  switch (source) {
    case 'MESSAGE': return 'Text supplied';
    case 'SUPPLIED_HTML': return 'Pasted HTML';
    case 'DIRECT_URI': return 'Direct URI';
    case 'REFERENCE': return 'User reference';
    case 'INFERENCE': return 'Inferred';
    case 'SIMULATION': return 'What-if only';
  }
}

function verdictLabel(result: TraceResult): string {
  if (result.decision === 'STOP') return 'Payment contradiction detected';
  if (result.decision === 'REVIEW') return 'Review warning signs';
  if (result.decision === 'INSUFFICIENT') return result.messageScreening.status === 'HIGH_CONCERN'
    ? 'Concerning SMS instructions · not verified'
    : result.messageScreening.status === 'CAUTION'
      ? 'SMS has warning signs · payment unverified'
      : 'Payment destination not observed';
  return 'No contradiction detected';
}

function verdictTone(result: TraceResult): string {
  if (result.decision === 'STOP') return 'border-rose-200 bg-rose-50 text-rose-900';
  if (result.decision === 'REVIEW' || result.decision === 'INSUFFICIENT') return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-emerald-200 bg-emerald-50 text-emerald-900';
}

function VerdictPill({ result }: { result: TraceResult }) {
  const blocked = result.decision === 'STOP';
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${verdictTone(result)}`}>
      {blocked ? <ShieldX size={13} /> : result.decision === 'NO_CONTRADICTION' ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
      {blocked ? 'STOP' : result.decision === 'NO_CONTRADICTION' ? 'NO MISMATCH' : result.decision}
    </div>
  );
}

function EvidenceChain({ result }: { result: TraceResult }) {
  return (
    <ol className="space-y-1">
      {result.steps.map((step, index) => (
        <li key={step.id}>
          {index > 0 && <div className="flex justify-center py-1"><ArrowDown size={16} className="text-slate-400" /></div>}
          <div className={`rounded-xl border p-3 ${result.blockHandoff && (step.id === 'payment' || step.id === 'decision') ? 'border-rose-200 bg-rose-50' : 'border-slate-100 bg-slate-50'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800">{index + 1}. {step.label}</span>
              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-500">{sourceLabel(step.source)}</span>
            </div>
            <p className="mt-1.5 break-all text-xs font-semibold leading-relaxed text-slate-800">{step.value}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{step.note}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

interface CardProps { result: TraceResult; label: string; highlighted?: boolean; }
function ReplayCard({ result, label, highlighted = false }: CardProps) {
  return (
    <div className={`min-w-0 rounded-2xl border p-3 ${highlighted ? 'border-blue-200 bg-blue-50/70' : 'border-slate-200 bg-slate-50'}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-1">
        <span className="text-2xl font-extrabold tabular-nums text-slate-900">{result.score ?? '—'}</span>
        <span className="text-[10px] font-semibold text-slate-500">/ 100</span>
      </div>
      <div className="mt-2"><VerdictPill result={result} /></div>
      <p className="mt-3 text-[10px] font-medium text-slate-500">Payment recipient</p>
      <p className="mt-0.5 break-all font-mono text-[11px] font-bold text-slate-900">{result.payment?.payee || 'Not observed'}</p>
    </div>
  );
}

/** A self-contained investigation lab; never opens a payment app. */
export function TruthTraceLab({ initialInput }: { initialInput?: TraceInput }) {
  const [fixture, setFixture] = useState(initialInput ? 'custom' : 'qr');
  const [form, setForm] = useState<TraceInput>(initialInput ? { ...EMPTY_INPUT, ...initialInput } : { ...FIXTURES[3].input });
  const [submitted, setSubmitted] = useState<TraceInput>(initialInput ? { ...EMPTY_INPUT, ...initialInput } : { ...FIXTURES[3].input });
  const [replayPayee, setReplayPayee] = useState(initialInput ? '' : FIXTURES[3].replayPayee);
  const [showReplay, setShowReplay] = useState(false);
  const [chapter, setChapter] = useState(0);
  const [showEvidence, setShowEvidence] = useState(false);
  const [hasAnalysed, setHasAnalysed] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [showHtml, setShowHtml] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const editorRef = useRef<HTMLElement>(null);
  const result = useMemo(() => analyzeTruthTrace(submitted), [submitted]);
  const replayResult = useMemo(
    () => showReplay ? analyzeTruthTrace({ ...submitted, simulatedPayee: replayPayee.trim() }) : null,
    [submitted, replayPayee, showReplay],
  );
  const leadSignal = result.signals.find(signal => signal.severe) || result.signals[0];
  const originalAmount = claimedAmount(submitted);
  const promiseType = result.expectedDirection === 'receive' ? 'Receive money' : result.expectedDirection === 'pay' ? 'Send money' : 'Not established';
  const edited = JSON.stringify(form) !== JSON.stringify(submitted);

  // Opening a blank investigation should also reveal the otherwise-collapsed editor.
  // The scroll margin leaves room for the sticky app header.
  useEffect(() => {
    if (showEditor && fixture === 'custom') {
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showEditor, fixture]);

  function showMatchingReplay() {
    // A counterfactual demonstration: not a payment and not verification of account ownership.
    selectScenario('qr');
    setReplayPayee('riverside-cafe@demo');
    setShowReplay(true);
    setChapter(3);
  }

  function startOwnMessage() {
    setHasAnalysed(false);
    const empty = { ...EMPTY_INPUT };
    setFixture('custom');
    setForm(empty);
    setSubmitted(empty);
    setReplayPayee('');
    setShowReplay(false);
    setChapter(0);
    setShowEditor(true);
    setShowHtml(false);
    setShowEvidence(false);
    setUploadError('');
  }

  async function loadMessageFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (!/\.(txt|md)$/i.test(file.name) && !file.type.startsWith('text/')) {
      setUploadError('Only plain-text .txt or .md messages are supported here. For screenshots, copy the text first.');
      return;
    }
    if (file.size > 100_000) {
      setUploadError('File is too large. Upload a message under 100 KB.');
      return;
    }
    try {
      const message = (await file.text()).trim();
      if (!message) {
        setUploadError('The selected text file is empty.');
        return;
      }
      if (message.length > 30_000) {
        setUploadError('Message is too long (maximum 30,000 characters).');
        return;
      }
      // Important: importing real text must discard the old fictional UPI/HTML evidence.
      setHasAnalysed(false);
      const next = { ...EMPTY_INPUT, message };
      setFixture('custom');
      setForm(next);
      setSubmitted({ ...EMPTY_INPUT });
      setReplayPayee('');
      setShowReplay(false);
      setChapter(0);
      setShowEditor(true);
      setShowHtml(false);
      setShowEvidence(false);
      setUploadError('');
    } catch {
      setUploadError('Could not read this file. Try copying and pasting its text instead.');
    }
  }

  function selectScenario(id: string) {
    setHasAnalysed(true);
    const next = FIXTURES.find(item => item.id === id);
    if (!next) return;
    setFixture(id);
    setForm({ ...next.input });
    setSubmitted({ ...next.input });
    setReplayPayee(next.replayPayee);
    setShowReplay(false);
    setChapter(0);
    setShowEditor(false);
    setShowHtml(false);
    setShowEvidence(false);
    setUploadError('');
  }

  function update<K extends keyof TraceInput>(key: K, value: TraceInput[K]) {
    setHasAnalysed(false);
    // A user replacing a fictional message must NEVER inherit the sample checkout,
    // hidden UPI URI, merchant label, expected amount or expected recipient.
    if (key === 'message' && fixture !== 'custom') {
      setFixture('custom');
      setForm({ ...EMPTY_INPUT, message: String(value) });
      setSubmitted({ ...EMPTY_INPUT });
      setReplayPayee('');
      setShowReplay(false);
      setChapter(0);
      setShowHtml(false);
      setShowEvidence(false);
      setUploadError('');
      return;
    }

    setForm(previous => ({ ...previous, [key]: value }));
    // Until the next explicit analysis, do not show a verdict computed from a
    // previously submitted message. Otherwise the old result appears to describe
    // the new evidence, which is misleading.
    setSubmitted({ ...EMPTY_INPUT });
    setShowReplay(false);
    setShowEvidence(false);
    setChapter(0);
  }

  function investigate() {
    setHasAnalysed(true);
    setSubmitted({ ...form });
    setShowReplay(false);
    setChapter(0);
    setShowEditor(false);
    setFixture('custom');
  }

  function restart() {
    setChapter(0);
    setShowReplay(false);
  }

  const chapterBody = chapter === 0 ? (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">1 · Claimed transaction</p>
      <p className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-800">{submitted.message || 'No message supplied'}</p>
      <p className="text-xs text-slate-600"><strong>Claimed business:</strong> {submitted.claimedBusiness || 'Not specified'}</p>
      <p className="text-[11px] text-slate-500">Observed in supplied text only; sender and brand identity are not verified.</p>
    </div>
  ) : chapter === 1 ? (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">2 · Extracted payment destination</p>
      {result.payment ? (
        <>
          <p className="text-2xl font-extrabold text-slate-900">PAY {amountLabel(result.payment.amount)}</p>
          <p className="break-all rounded-xl bg-slate-50 px-3 py-2.5 font-mono text-xs text-slate-900">{result.payment.payee || 'No recipient in URI'}</p>
          <p className="text-[11px] text-slate-500">Source: {sourceLabel(result.payment.source)}. A `upi://pay` URI requests an outgoing payment; no account ownership has been checked.</p>
        </>
      ) : <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">No payment URI was observed in the supplied evidence. No recipient is inferred from a webpage URL alone.</p>}
      {result.paymentCount > 1 && <p className="text-xs font-bold text-rose-700">Multiple payment URIs found — handoff cannot be trusted.</p>}
    </div>
  ) : chapter === 2 ? (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">3 · Decision evidence</p>
      {result.signals.length ? result.signals.map(signal => (
        <div key={signal.id} className={`rounded-xl border p-3 ${signal.severe ? 'border-rose-100 bg-rose-50' : 'border-amber-100 bg-amber-50'}`}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-extrabold text-slate-900">{signal.title}</p>
            <span className="text-xs font-extrabold text-slate-800">+{signal.points}</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-700">{signal.detail}</p>
        </div>
      )) : result.messageScreening.indicators.length ? result.messageScreening.indicators.map(item => (
        <div key={item.id} className="rounded-xl bg-amber-50 p-3">
          <p className="text-xs font-bold text-amber-950">{item.title}</p>
          <p className="mt-1 text-xs text-amber-900">{item.detail}</p>
        </div>
      )) : <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700">No obvious text-only indicators were found; neither the sender nor website is verified.</p>}
      <button type="button" onClick={() => setShowEvidence(true)} className="text-xs font-bold text-blue-700 underline underline-offset-2">Inspect the complete evidence chain below</button>
    </div>
  ) : (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">4 · Counterfactual replay</p>
      <p className="text-xs leading-relaxed text-slate-600">Change just the payee to see how the rules respond. Original message, amount and merchant reference stay unchanged.</p>
      <label htmlFor="tt-replay-payee" className="block text-xs font-bold text-slate-700">Try a different UPI ID</label>
      <input id="tt-replay-payee" value={replayPayee} onChange={event => { setReplayPayee(event.target.value); setShowReplay(false); }}
        spellCheck={false} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-xs text-slate-900 focus:border-blue-500 focus:outline-none" />
      <button type="button" onClick={() => setShowReplay(true)} disabled={!result.payment || !replayPayee.trim()}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40">
        <RefreshCw size={16} /> Run what-if replay
      </button>
      {replayResult && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <ReplayCard result={result} label="Original" />
            <ReplayCard result={replayResult} label="Changed recipient" highlighted />
          </div>
          {replayResult.score !== null && result.score !== null && (
            <p className="rounded-xl bg-slate-100 p-3 text-xs font-bold text-slate-800">
              Score change: {replayResult.score - result.score > 0 ? '+' : ''}{replayResult.score - result.score} points. {verdictLabel(replayResult)}.
            </p>
          )}
          {result.signals.filter(s => !replayResult.signals.some(next => next.id === s.id)).map(s => (
            <p key={s.id} className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-900">Rule cleared: {s.title}</p>
          ))}
          {replayResult.signals.filter(s => !result.signals.some(old => old.id === s.id)).map(s => (
            <p key={s.id} className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-900">Rule triggered: {s.title}</p>
          ))}
          <p className="text-[11px] text-slate-500">This is a simulation only. No UPI transaction or external request is made.</p>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-3 pb-6">
      <header className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 px-4 py-4 text-white shadow-card">
        <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-blue-200"><Sparkles size={15} /> KAVACHPAY / TRUTHTRACE 3.1 — INVESTIGATION REPORT</div>
        <h1 className="mt-2 text-xl font-extrabold leading-tight">Explain what the payment actually requests.</h1>
        <p className="mt-1 text-xs leading-relaxed text-blue-100">A detailed evidence report linked to your main checker, plus one tampered-QR demonstration with a one-click replay.</p>
      </header>

      {fixture === 'custom' && (
        <section aria-label="Imported check" className="rounded-2xl border border-blue-200 bg-blue-50 p-3.5 shadow-card">
          <p className="flex items-center gap-2 text-sm font-extrabold text-blue-950"><FileText size={16} /> Your investigation report</p>
          <p className="mt-1 text-xs leading-relaxed text-blue-800">This view uses only the evidence you supplied. No sample checkout, account or payment recipient was copied into this investigation.</p>
          <button type="button" onClick={() => setShowEditor(true)} className="mt-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-800">Edit evidence and trusted reference</button>
        </section>
      )}
      {fixture === 'qr' && (
        <section aria-label="Featured demonstration" className="rounded-2xl border border-border bg-white p-4 shadow-card">
          <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-blue-700" /><h2 className="text-sm font-extrabold text-slate-900">One featured demo · Tampered shop QR</h2></div>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">A fictional café displays a legitimate-looking merchant name but the scanned payment URI points to a different UPI ID. The “trusted” reference is supplied for this demo, not verified by any bank.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="min-w-0 rounded-xl bg-slate-50 p-2.5"><p className="text-[10px] font-bold text-slate-500">Expected recipient</p><p className="mt-1 break-all font-mono text-[11px] font-bold text-slate-900">riverside-cafe@demo</p></div>
            <div className="min-w-0 rounded-xl bg-rose-50 p-2.5"><p className="text-[10px] font-bold text-rose-700">QR destination</p><p className="mt-1 break-all font-mono text-[11px] font-bold text-rose-900">counter-collector@demo</p></div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => selectScenario('qr')} className="min-h-12 rounded-xl border border-blue-200 bg-blue-50 px-2 py-2 text-xs font-extrabold text-blue-900">Reset fraudulent case</button>
            <button type="button" onClick={showMatchingReplay} className="min-h-12 rounded-xl bg-blue-700 px-2 py-2 text-xs font-extrabold text-white">Show corrected payment ↗</button>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">The corrected side is a what-if simulation. It does not initiate a transaction or establish who owns an account.</p>
        </section>
      )}
      {fixture !== 'custom' && fixture !== 'qr' && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
          <strong>Optional regression test active:</strong> {FIXTURES.find(item => item.id === fixture)?.name}. This is not the featured teacher demonstration.
          <button type="button" onClick={() => selectScenario('qr')} className="mt-2 block font-bold text-blue-800 underline">Return to featured tampered-QR demo</button>
        </section>
      )}
      <details className="group rounded-2xl border border-border bg-white shadow-card">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold text-slate-700">
          More regression examples (optional)
          <ChevronDown size={16} className="text-slate-500 transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-2 border-t border-slate-100 p-3">
          <p className="text-[11px] text-slate-500">These extra fictional cases are for testing only. The café QR flow above is the main presentation demo.</p>
          <div className="grid grid-cols-2 gap-2">
            {FIXTURES.filter(item => item.id !== 'qr').map(item => (
              <button key={item.id} type="button" onClick={() => selectScenario(item.id)}
                className={`min-h-12 rounded-xl border px-2 py-2 text-left text-xs font-bold ${fixture === item.id ? 'border-blue-300 bg-blue-50 text-blue-900' : 'border-slate-200 text-slate-700'}`}>
                {item.name}
                <span className="mt-0.5 block text-[10px] font-normal text-slate-500">{item.short}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={startOwnMessage} className="mt-1 w-full rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-bold text-blue-900">Open a blank advanced investigation</button>
        </div>
      </details>

      {fixture === 'custom' && (
        <section aria-label="Own message mode" className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-xs text-blue-900">
          <p className="font-extrabold">Own-message investigation · Example evidence cleared</p>
          <p className="mt-1 leading-relaxed">Only your current form values will be submitted. A website URL alone does not reveal a UPI recipient; the linked webpage is not fetched.</p>
          <button type="button" onClick={startOwnMessage} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 font-bold text-blue-800 border border-blue-200">
            <Trash2 size={14} /> Clear everything and start again
          </button>
        </section>
      )}
      {edited && (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs font-semibold leading-relaxed text-amber-900">
          Changes have not been analysed yet. The previous verdict has been cleared. Open “Edit investigation evidence (advanced)” and press “Run TruthTrace analysis” to evaluate your current message and supplied payment information.
        </div>
      )}
      {!hasAnalysed && (
        <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <strong>Not analysed yet.</strong> Finish entering your evidence and press “Run TruthTrace analysis” below. No previous verdict is being shown for this draft.
        </div>
      )}
      {hasAnalysed && !edited && (
        <>
      {/* Always-visible result: no need to scroll through the form to see the contradiction. */}
      <section aria-label="Quick verdict" className={`rounded-2xl border p-3.5 shadow-card ${verdictTone(result)}`}>
        <div className="flex items-start gap-2">
          <div className="mt-0.5 shrink-0">{result.decision === 'STOP' ? <ShieldX size={21} /> : result.decision === 'NO_CONTRADICTION' ? <CheckCircle2 size={21} /> : <AlertTriangle size={21} />}</div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">TruthTrace quick verdict</p>
            <h2 className="mt-0.5 text-base font-extrabold leading-tight">{verdictLabel(result)}</h2>
            <p className="mt-1 text-[11px] leading-relaxed opacity-85">{leadSignal?.detail || (result.decision === 'INSUFFICIENT'
              ? result.messageScreening.indicators[0]?.detail || 'No outgoing UPI payment was observed. The website and sender are not verified; message text alone cannot confirm legitimacy.'
              : 'The supplied details have no detected contradiction; recipient identity remains unverified.')}</p>
          </div>
          <div className="shrink-0 rounded-xl bg-white/80 px-2.5 py-2 text-center text-slate-900">
            <p className="text-xl font-extrabold tabular-nums">{result.score ?? '—'}</p>
            <p className="text-[10px] font-bold">/100</p>
          </div>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed opacity-70">{result.score === null
          ? 'Payment score unavailable: no UPI intent observed. Message warnings shown separately below.'
          : 'Rule-based payment evidence score • Not a bank verification or the existing ML score'}</p>
      </section>

      {!edited && Boolean(submitted.message.trim()) && (
        <section aria-label="SMS-only warning signs" className="rounded-2xl border border-amber-200 bg-white p-3.5 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><FileText size={17} className="text-amber-700" /> Message warning signs</h2>
            <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${result.messageScreening.status === 'HIGH_CONCERN' ? 'bg-rose-100 text-rose-800' : result.messageScreening.status === 'CAUTION' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
              {result.messageScreening.status === 'HIGH_CONCERN' ? 'CONCERNING' : result.messageScreening.status === 'CAUTION' ? 'REVIEW' : 'UNVERIFIED'}
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-700">
            {result.messageScreening.status === 'HIGH_CONCERN'
              ? 'The SMS contains concerning instructions. Do not follow them until independently verified.'
              : result.messageScreening.status === 'CAUTION'
                ? 'Potential warning signs were found, but these also occur in legitimate messages.'
                : 'No obvious warning words were found. This DOES NOT mean the message or link is genuine.'}
          </p>
          {result.messageScreening.indicators.length > 0 && (
            <div className="mt-3 space-y-2">
              {result.messageScreening.indicators.map(item => (
                <div key={item.id} className={`rounded-xl border p-2.5 ${item.strength === 'strong' ? 'border-rose-100 bg-rose-50' : 'border-amber-100 bg-amber-50'}`}>
                  <p className="text-xs font-bold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-700">{item.detail}</p>
                </div>
              ))}
            </div>
          )}
          {result.messageScreening.urls.length > 0 && (
            <div className="mt-3 rounded-xl bg-slate-50 p-2.5">
              <p className="text-[11px] font-bold text-slate-800">Link in the message (not inspected)</p>
              {result.messageScreening.urls.map(url => <p key={url} className="mt-1 break-all font-mono text-[10px] text-slate-600">{url}</p>)}
            </div>
          )}
          <p className="mt-2 text-[11px] leading-relaxed text-slate-600">Sender authenticated: No · Webpage opened: No · Recipient verified: No. Verify through the official app or a number you find independently; do not rely on the SMS link.</p>
        </section>
      )}

      <section aria-label="Claim versus actual payment" className="rounded-2xl border border-border bg-white p-3 shadow-card">
        <div className="mb-2 flex items-center gap-2"><ArrowRightLeft size={16} className="text-blue-700" /><h2 className="text-xs font-extrabold text-slate-900">Promise vs actual payment</h2></div>
        <div className="grid grid-cols-2 gap-2">
          <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">What was expected</p>
            <p className="mt-2 text-[13px] font-extrabold text-slate-900">{promiseType}</p>
            <p className="mt-1 text-xl font-extrabold text-emerald-700">{result.expectedDirection === 'receive' ? '+' : result.expectedDirection === 'pay' ? '−' : ''}{amountLabel(originalAmount)}</p>
            <p className="mt-1 text-[10px] text-slate-500">From supplied message / user expectation</p>
          </div>
          <div className={`min-w-0 rounded-xl border p-3 ${result.blockHandoff ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">What the URI requests</p>
            <p className="mt-2 text-[13px] font-extrabold text-slate-900">{result.payment ? 'Send money' : 'Not observed'}</p>
            <p className={`mt-1 text-xl font-extrabold ${result.blockHandoff ? 'text-rose-700' : 'text-slate-800'}`}>{result.payment ? '−' : ''}{amountLabel(result.payment?.amount)}</p>
            <p className="mt-1 break-all font-mono text-[10px] text-slate-600">{result.payment?.payee || 'No extracted recipient'}</p>
          </div>
        </div>
      </section>

      <section aria-label="Guided demonstration" className="rounded-2xl border border-border bg-white p-4 shadow-card">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">Guided live demonstration</p>
            <h2 className="mt-0.5 text-base font-extrabold text-slate-900">{CHAPTERS[chapter].title}</h2>
            <p className="text-xs text-slate-500">{CHAPTERS[chapter].subtitle}</p>
          </div>
          <span className="rounded-full bg-blue-50 px-2.5 py-1.5 text-[10px] font-extrabold text-blue-700">{chapter + 1} / 4</span>
        </div>
        <div className="mt-3 flex gap-1" aria-label="Presentation progress">
          {CHAPTERS.map((item, i) => (
            <button type="button" key={item.title} title={item.title} aria-label={`Go to ${item.title}`} aria-current={chapter === i ? 'step' : undefined} onClick={() => setChapter(i)}
              className={`h-2 min-w-0 flex-1 rounded-full ${i <= chapter ? 'bg-blue-600' : 'bg-slate-200'}`} />
          ))}
        </div>
        <div className="mt-4 min-h-[132px]">{chapterBody}</div>
        <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
          {chapter > 0 ? (
            <button type="button" onClick={() => setChapter(i => Math.max(0, i - 1))} className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 text-sm font-bold text-slate-700"><ArrowLeft size={15} /> Back</button>
          ) : (
            <button type="button" onClick={restart} className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 text-sm font-bold text-slate-700"><RefreshCw size={15} /> Restart</button>
          )}
          {chapter < CHAPTERS.length - 1 ? (
            <button type="button" onClick={() => setChapter(i => Math.min(CHAPTERS.length - 1, i + 1))} className="flex min-h-11 flex-[1.4] items-center justify-center gap-1 rounded-xl bg-blue-700 px-3 text-sm font-extrabold text-white">Next step <ArrowRight size={16} /></button>
          ) : (
            <button type="button" onClick={restart} className="flex min-h-11 flex-[1.4] items-center justify-center gap-1 rounded-xl bg-blue-700 px-3 text-sm font-extrabold text-white">Restart demo <RefreshCw size={16} /></button>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
        <button type="button" onClick={() => setShowEvidence(v => !v)} aria-expanded={showEvidence} className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left">
          <span className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><GitBranch size={17} className="text-blue-700" /> Full evidence chain <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-600">{result.steps.length} steps</span></span>
          <ChevronDown size={17} className={`text-slate-500 transition-transform ${showEvidence ? 'rotate-180' : ''}`} />
        </button>
        {showEvidence && <div className="border-t border-slate-100 p-3"><EvidenceChain result={result} /></div>}
      </section>

        </>
      )}

      <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] leading-relaxed text-blue-900">
        <strong>One shared checker, one detailed report:</strong> run Check SMS/Link or Scan QR first and open TruthTrace to explain its evidence. The featured demo demonstrates a QR recipient substitution and a corrected what-if case. A matching payment is not proof of account ownership.
      </p>

      <section ref={editorRef} style={{ scrollMarginTop: '5.5rem' }} className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
        <button type="button" onClick={() => setShowEditor(v => !v)} aria-expanded={showEditor} className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left">
          <span className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><Play size={16} className="text-blue-700" /> Edit investigation evidence (advanced)</span>
          <ChevronDown size={17} className={`text-slate-500 transition-transform ${showEditor ? 'rotate-180' : ''}`} />
        </button>
        {showEditor && (
          <form onSubmit={event => { event.preventDefault(); investigate(); }} className="space-y-3 border-t border-slate-100 p-4">
            <div className="flex items-start justify-between gap-2 rounded-xl bg-blue-50 p-3">
              <div>
                <p className="text-xs font-extrabold text-blue-900">Use a real message</p>
                <p className="mt-1 text-[11px] leading-relaxed text-blue-800">Paste the SMS below, or choose a .txt file. A screenshot needs to be converted to text first.</p>
              </div>
              <button type="button" onClick={startOwnMessage} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-2.5 py-2 text-[11px] font-bold text-blue-800" title="Remove the old scenario, including hidden HTML and payment references">
                <Trash2 size={13} /> Clear all
              </button>
            </div>
            <div>
              <label htmlFor="tt-upload-message" className="mb-1 flex items-center gap-2 text-xs font-bold text-slate-700"><Upload size={15} /> Load message from a text file (.txt, .md)</label>
              <input id="tt-upload-message" type="file" accept=".txt,.md,text/plain,text/markdown" onChange={loadMessageFile}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-100 file:px-3 file:py-2 file:text-xs file:font-bold file:text-blue-900" />
              {uploadError && <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">{uploadError}</p>}
            </div>
            <div>
              <label htmlFor="tt-business" className="mb-1 block text-xs font-bold text-slate-700">Claimed business (unverified)</label>
              <input id="tt-business" value={form.claimedBusiness || ''} onChange={event => update('claimedBusiness', event.target.value)} placeholder="Business mentioned by the message" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-900" />
            </div>
            <div>
              <label htmlFor="tt-message" className="mb-1 block text-xs font-bold text-slate-700">Message or SMS</label>
              <textarea id="tt-message" rows={4} maxLength={30000} value={form.message} onChange={event => update('message', event.target.value)} placeholder="Paste your real SMS or WhatsApp message here (copy the text, not a screenshot)."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-relaxed text-slate-900" />
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <p className="text-[10px] text-slate-500">This field is editable. Choose “Clear all” to remove the whole sample, including hidden payment evidence.</p>
                <button type="button" onClick={() => update('message', '')} className="shrink-0 text-xs font-bold text-blue-700 underline underline-offset-2">Clear message</button>
              </div>
            </div>
            <div>
              <label htmlFor="tt-uri" className="mb-1 block text-xs font-bold text-slate-700">Direct UPI URI (optional)</label>
              <input id="tt-uri" value={form.paymentUri || ''} onChange={event => update('paymentUri', event.target.value)} placeholder="upi://pay?pa=recipient@bank&am=1250" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-xs text-slate-900" />
            </div>
            <button type="button" onClick={() => setShowHtml(v => !v)} aria-expanded={showHtml} className="flex w-full items-center justify-between text-left text-xs font-bold text-blue-700">Supplied checkout HTML <ChevronDown size={16} className={showHtml ? 'rotate-180' : ''} /></button>
            {showHtml && <div><textarea rows={4} maxLength={30000} aria-label="Pasted HTML source" value={form.html || ''} onChange={event => update('html', event.target.value)} placeholder="Paste HTML as plain text" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-[11px] text-slate-900" /><p className="mt-1 text-[11px] text-slate-500">HTML is read as text; no scripts run and no website is fetched.</p></div>}
            <div>
              <label htmlFor="tt-direction" className="mb-1 block text-xs font-bold text-slate-700">Expected direction</label>
              <select id="tt-direction" value={form.expectedDirection || 'unknown'} onChange={event => update('expectedDirection', event.target.value as TraceInput['expectedDirection'])} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900">
                <option value="unknown">Infer from message / unknown</option><option value="receive">Receive money</option><option value="pay">Send money</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label htmlFor="tt-payee" className="mb-1 block text-xs font-bold text-slate-700">Expected UPI ID</label><input id="tt-payee" value={form.expectedPayee || ''} onChange={event => update('expectedPayee', event.target.value)} placeholder="Independent reference" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2.5 text-xs text-slate-900" /></div>
              <div><label htmlFor="tt-amount" className="mb-1 block text-xs font-bold text-slate-700">Expected amount (₹)</label><input id="tt-amount" type="number" min="0" step="0.01" value={form.expectedAmount || ''} onChange={event => update('expectedAmount', event.target.value)} placeholder="Optional" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2.5 text-xs text-slate-900" /></div>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">Use a recipient reference obtained independently. TruthTrace cannot verify bank ownership.</p>
            {edited && <p className="text-xs font-semibold text-amber-800">You have edits that are not yet analysed.</p>}
            <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 text-sm font-extrabold text-white"><Play size={16} /> Run TruthTrace analysis</button>
          </form>
        )}
      </section>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
        <p className="flex items-center gap-2 font-bold text-slate-800"><ShieldCheck size={15} /> Evidence boundaries</p>
        <p className="mt-1">Website fetched: <strong>No</strong> · Recipient ownership verified: <strong>No</strong> · Payment initiated: <strong>No</strong> · ML decision: <strong>Separate</strong>.</p>
      </div>
    </div>
  );
}

/** Compact indicator used by the existing Link Safety Gateway. */
export function TruthTraceCompact({ result }: { result: TraceResult }) {
  if (!result.paymentCount && !result.signals.length) return null;
  const severe = result.blockHandoff;
  return (
    <section className={`rounded-2xl border p-4 shadow-card ${severe ? 'border-rose-200 bg-rose-50' : 'border-blue-100 bg-blue-50'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><GitBranch size={17} className="text-blue-700" /> TruthTrace firewall</span>
        <span className={`rounded-full px-2 py-1 text-[11px] font-extrabold ${severe ? 'bg-rose-100 text-rose-800' : 'bg-white text-blue-800'}`}>{severe ? 'HANDOFF BLOCKED' : 'EVIDENCE CHECK'}</span>
      </div>
      {result.signals.length ? result.signals.map(signal => (
        <p key={signal.id} className="mt-2 text-xs leading-relaxed text-slate-800"><strong>{signal.title}:</strong> {signal.detail}</p>
      )) : <p className="mt-2 text-xs leading-relaxed text-slate-700">No direct intent mismatch was identified. Recipient ownership is not verified.</p>}
      <p className="mt-2 break-all text-[11px] text-slate-600">Observed UPI intent: {result.payment?.payee || 'Unavailable'} · Trust checks use provided evidence only.</p>
    </section>
  );
}
