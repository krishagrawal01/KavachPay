import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDown, CheckCircle2, ChevronDown, GitBranch, Play, RefreshCw, ShieldCheck, ShieldX, Sparkles } from 'lucide-react';
import { analyzeTruthTrace, type EvidenceStep, type TraceInput, type TraceResult } from '@/lib/truthTrace';

type Fixture = { id: string; name: string; hint: string; input: TraceInput; replayPayee: string };

const FIXTURES: Fixture[] = [
  {
    id: 'refund', name: 'Cashback trap', hint: 'Receive vs pay',
    input: {
      message: 'Congratulations! Your ₹2,500 cashback refund is ready. Claim it now: https://claim-reward.example/refund',
      html: '<!doctype html><h1>Claim your refund</h1><a id="pay-now" href="upi://pay?pa=refunddesk@okaxis&amp;pn=Refund+Desk&amp;am=2500&amp;tn=Refund+Claim">Claim refund now</a>',
      expectedDirection: 'receive', expectedAmount: '', expectedPayee: '', claimedBusiness: 'Demo reward message',
    }, replayPayee: 'anotherdesk@okaxis',
  },
  {
    id: 'bill', name: 'Bill impersonation', hint: 'Payee mismatch',
    input: {
      message: 'Northbridge Power: your electricity bill of ₹1,250 is due today. Pay at https://northbridge-billing.example/pay',
      html: '<!doctype html><h1>Electricity bill</h1><a href="upi://pay?pa=collect-payments@okaxis&amp;pn=Billing+Agent&amp;am=1250&amp;tn=Electricity+bill">Pay bill</a>',
      expectedDirection: 'pay', expectedPayee: 'northbridge-bills@okaxis', expectedAmount: '1250', claimedBusiness: 'Northbridge Power (fictional)',
    }, replayPayee: 'northbridge-bills@okaxis',
  },
  {
    id: 'legit', name: 'Matching payment', hint: 'Control case',
    input: {
      message: 'Your Northbridge Power bill is ₹1,250. Check the amount and recipient before paying.',
      html: '<a href="upi://pay?pa=northbridge-bills@okaxis&amp;pn=Northbridge+Power&amp;am=1250">Pay bill</a>',
      expectedDirection: 'pay', expectedPayee: 'northbridge-bills@okaxis', expectedAmount: '1250', claimedBusiness: 'Northbridge Power (fictional)',
    }, replayPayee: 'unrelated-collector@okaxis',
  },
];

function displaySource(source: EvidenceStep['source']): string {
  switch (source) {
    case 'MESSAGE': return 'Observed in text';
    case 'SUPPLIED_HTML': return 'Observed in supplied HTML';
    case 'DIRECT_URI': return 'Provided UPI URI';
    case 'REFERENCE': return 'User reference';
    case 'INFERENCE': return 'Inferred';
    case 'SIMULATION': return 'What-if simulation';
  }
}

function DecisionCard({ result, title }: { result: TraceResult; title?: string }) {
  const severe = result.decision === 'STOP';
  const warning = result.decision === 'REVIEW' || result.decision === 'INSUFFICIENT';
  const tone = severe ? 'border-red-200 bg-red-50 text-red-800' : warning ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800';
  return (
    <section className={`rounded-2xl border p-4 ${tone}`} aria-live="polite">
      {title && <p className="mb-2 text-xs font-bold uppercase tracking-widest opacity-75">{title}</p>}
      <div className="flex items-start gap-2">
        {severe ? <ShieldX size={22} className="mt-0.5 shrink-0" /> : warning ? <AlertTriangle size={22} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={22} className="mt-0.5 shrink-0" />}
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-extrabold">
            {severe ? 'Payment contradiction detected' : result.decision === 'REVIEW' ? 'Review warning signs' :
              result.decision === 'INSUFFICIENT' ? 'Payment destination not observed' : 'No contradiction detected'}
          </h3>
          <p className="mt-1 text-xs leading-relaxed opacity-90">
            {severe ? 'TruthTrace blocks the demonstration handoff. Review the evidence below.' :
              result.decision === 'NO_CONTRADICTION' ? 'The supplied details match, but no bank or merchant identity was verified.' :
                'More evidence is needed before trusting the payment.'}
          </p>
        </div>
        <div className="shrink-0 rounded-xl bg-white/80 px-2.5 py-2 text-center">
          <p className="text-xl font-extrabold tabular-nums">{result.score ?? '—'}</p>
          <p className="text-[10px] font-semibold">/100</p>
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed opacity-90">Rule-based evidence score, separate from the existing ML model. A score of 0 does not prove safety.</p>
    </section>
  );
}

function EvidenceChain({ result }: { result: TraceResult }) {
  return (
    <section className="rounded-2xl border border-border bg-white p-4 shadow-card">
      <div className="mb-4 flex items-center gap-2">
        <GitBranch size={18} className="text-brand-blue" />
        <h3 className="text-sm font-extrabold text-ink-primary">Reconstructed payment journey</h3>
      </div>
      <div className="space-y-1">
        {result.steps.map((step, index) => (
          <div key={step.id}>
            {index > 0 && <div className="flex justify-center py-1"><ArrowDown size={18} className="text-slate-400" /></div>}
            <div className={`rounded-xl border px-3 py-3 ${(step.id === 'decision' || step.id === 'payment') && result.blockHandoff ? 'border-red-200 bg-red-50' : 'border-slate-100 bg-slate-50'}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-extrabold text-slate-800">{index + 1}. {step.label}</p>
                <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[9px] font-bold text-slate-600">{displaySource(step.source)}</span>
              </div>
              <p className="mt-2 break-all text-xs font-semibold leading-relaxed text-slate-800">{step.value}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{step.note}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TruthTraceLab() {
  const [fixture, setFixture] = useState('refund');
  const [form, setForm] = useState<TraceInput>(FIXTURES[0].input);
  const [submitted, setSubmitted] = useState<TraceInput>(FIXTURES[0].input);
  const [replayPayee, setReplayPayee] = useState(FIXTURES[0].replayPayee);
  const [replayOpen, setReplayOpen] = useState(false);
  const [showHtml, setShowHtml] = useState(false);

  const result = useMemo(() => analyzeTruthTrace(submitted), [submitted]);
  const replayResult = useMemo(() => replayOpen ? analyzeTruthTrace({ ...submitted, simulatedPayee: replayPayee }) : null, [submitted, replayPayee, replayOpen]);

  function selectScenario(value: string) {
    const chosen = FIXTURES.find((item) => item.id === value);
    if (!chosen) return;
    setFixture(value); setForm({ ...chosen.input }); setSubmitted({ ...chosen.input });
    setReplayPayee(chosen.replayPayee); setReplayOpen(false);
  }

  function update<K extends keyof TraceInput>(key: K, value: TraceInput[K]) {
    setForm(previous => ({...previous, [key]: value}));
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-5 text-white shadow-card">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-blue-200">
          <Sparkles size={16} /> KavachPay / TruthTrace
        </div>
        <h1 className="mt-3 text-[26px] font-extrabold leading-tight">See the scam behind the payment.</h1>
        <p className="mt-2 text-sm leading-relaxed text-blue-100">Reconstruct the evidence. Compare the promised transaction with the actual UPI intent. Replay a changed destination.</p>
        <span className="mt-4 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold">Interactive, local evidence investigation</span>
      </div>

      <section className="rounded-2xl border border-border bg-white p-4 shadow-card">
        <p className="text-sm font-extrabold text-slate-900">1. Choose a live demo</p>
        <div className="mt-3 grid grid-cols-1 gap-2">
          {FIXTURES.map(item => (
            <button type="button" key={item.id} onClick={() => selectScenario(item.id)}
              className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left ${fixture === item.id ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <span className="text-sm font-bold text-slate-900">{item.name}</span>
              <span className="text-[11px] font-semibold text-slate-500">{item.hint}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">All example people, brands, websites and UPI IDs are fictional test fixtures, not verified accounts.</p>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-white p-4 shadow-card">
        <h2 className="text-sm font-extrabold text-slate-900">2. Investigate the actual evidence</h2>
        <label className="block text-xs font-semibold text-slate-700" htmlFor="trace-merchant">Claimed business (unverified label)</label>
        <input id="trace-merchant" value={form.claimedBusiness || ''} onChange={event => update('claimedBusiness', event.target.value)}
          placeholder="Business mentioned by the message" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-900" />
        <label className="block text-xs font-semibold text-slate-700" htmlFor="trace-message">Message / SMS claim</label>
        <textarea id="trace-message" rows={3} maxLength={30000} value={form.message} onChange={event => update('message', event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-relaxed text-slate-900 focus:border-blue-500 focus:outline-none" />

        <label className="block text-xs font-semibold text-slate-700" htmlFor="trace-uri">Direct UPI URI (optional)</label>
        <input id="trace-uri" value={form.paymentUri || ''} onChange={event => update('paymentUri', event.target.value)} placeholder="upi://pay?pa=recipient@bank&am=1250"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none" />

        <button type="button" onClick={() => setShowHtml(value => !value)} className="flex w-full items-center justify-between border-b border-slate-100 py-2 text-left text-xs font-bold text-blue-700" aria-expanded={showHtml}>
          Checkout HTML supplied for investigation <ChevronDown size={16} className={showHtml ? 'rotate-180' : ''} />
        </button>
        {showHtml && (
          <div>
            <textarea aria-label="Pasted HTML source" rows={5} maxLength={30000} value={form.html || ''} onChange={event => update('html', event.target.value)}
              placeholder="Paste HTML source here — no page is fetched or executed"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-[11px] text-slate-900 focus:border-blue-500 focus:outline-none" />
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">Only supplied markup is scanned as text. A website link by itself is not inspected.</p>
          </div>
        )}

        <label className="block text-xs font-semibold text-slate-700" htmlFor="trace-expect-direction">What payment direction is expected?</label>
        <select id="trace-expect-direction" value={form.expectedDirection || 'unknown'} onChange={event => update('expectedDirection', event.target.value as TraceInput['expectedDirection'])}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900">
          <option value="unknown">Auto-infer from message, or unknown</option>
          <option value="receive">Receive money</option>
          <option value="pay">Send money</option>
        </select>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="trace-payee" className="block text-xs font-semibold text-slate-700">Expected UPI ID (trusted reference)</label>
            <input id="trace-payee" value={form.expectedPayee || ''} onChange={event => update('expectedPayee', event.target.value)} placeholder="Verified independently by you"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-900" />
          </div>
          <div>
            <label htmlFor="trace-amount" className="block text-xs font-semibold text-slate-700">Expected amount (₹)</label>
            <input id="trace-amount" type="number" min="0" step="0.01" value={form.expectedAmount || ''} onChange={event => update('expectedAmount', event.target.value)} placeholder="Optional"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-900" />
          </div>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500">A reference payee is never verified automatically. Use one obtained independently from the real business, not from the suspicious message.</p>
        <button type="button" onClick={() => { setSubmitted({ ...form }); setReplayOpen(false); }}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-extrabold text-white hover:bg-blue-800">
          <Play size={17} /> Reconstruct payment journey
        </button>
      </section>

      <section className="space-y-3" aria-label="TruthTrace investigation result">
        <h2 className="px-1 text-base font-extrabold text-slate-900">3. TruthTrace verdict</h2>
        <DecisionCard result={result} />
        <EvidenceChain result={result} />
        <div className="rounded-2xl border border-border bg-white p-4 shadow-card">
          <h3 className="text-sm font-extrabold text-slate-900">Why this decision?</h3>
          {result.signals.length ? (
            <div className="mt-3 space-y-2">
              {result.signals.map(signal => (
                <div key={signal.id} className={`rounded-xl p-3 ${signal.severe ? 'bg-red-50' : 'bg-amber-50'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold text-slate-900">{signal.title}</p>
                    <span className="shrink-0 text-xs font-extrabold text-slate-700">+{signal.points}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{signal.detail}</p>
                </div>
              ))}
            </div>
          ) : <p className="mt-2 text-xs leading-relaxed text-slate-600">No contradiction was found in the supplied material. This is NOT a merchant verification or a guarantee of safety.</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-4 shadow-card">
        <div className="flex items-start gap-2">
          <RefreshCw size={18} className="mt-0.5 shrink-0 text-brand-blue" />
          <div className="flex-1">
            <h2 className="text-sm font-extrabold text-slate-900">4. Counterfactual fraud replay</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">Change only the destination and compare outcomes. This is a simulation; no bank or UPI request is sent.</p>
          </div>
        </div>
        <label htmlFor="trace-replay-payee" className="mt-3 block text-xs font-semibold text-slate-700">What if the payment recipient were...</label>
        <input id="trace-replay-payee" value={replayPayee} onChange={event => { setReplayPayee(event.target.value); setReplayOpen(false); }}
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-xs text-slate-900" />
        <button type="button" onClick={() => setReplayOpen(true)} disabled={!result.payment || !replayPayee.trim()}
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-blue-300 bg-blue-50 text-sm font-bold text-blue-800 disabled:opacity-40">
          <GitBranch size={17} /> Run what-if replay
        </button>
        {replayResult && (
          <div className="mt-3 space-y-3">
            <DecisionCard result={replayResult} title="After recipient change" />
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-600">Before</p><p className="text-sm font-extrabold text-slate-900">{result.score ?? '—'}/100</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-600">After</p><p className="text-sm font-extrabold text-slate-900">{replayResult.score ?? '—'}/100</p></div>
            </div>
            <p className="text-xs text-slate-600">Changed evidence: <span className="font-semibold">{replayResult.payment?.payee}</span>. The original message and other payment details remain unchanged.</p>
            {replayResult.signals.filter(s => !result.signals.some(old => old.id === s.id)).map(s => <p key={s.id} className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-900">New rule fired: {s.title}</p>)}
            {result.signals.filter(s => !replayResult.signals.some(next => next.id === s.id)).map(s => <p key={s.id} className="rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-900">Rule cleared: {s.title}</p>)}
          </div>
        )}
      </section>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
        <div className="flex items-center gap-2 font-bold text-slate-800"><ShieldCheck size={15} /> Evidence boundaries</div>
        <p className="mt-1">Website fetched: <strong>No</strong> · Recipient ownership verified: <strong>No</strong> · Payment initiated: <strong>No</strong> · ML decision: <strong>Separate</strong>. The sandbox fixtures are synthetic; no payment handoff is available from this lab.</p>
      </div>
    </div>
  );
}

export function TruthTraceCompact({ result }: { result: TraceResult }) {
  if (!result.paymentCount && !result.signals.length) return null;
  const severe = result.blockHandoff;
  return (
    <section className={`rounded-2xl border p-4 shadow-card ${severe ? 'border-red-200 bg-red-50' : 'border-blue-100 bg-blue-50'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><GitBranch size={17} className="text-blue-700"/> TruthTrace firewall</span>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${severe ? 'bg-red-100 text-red-800' : 'bg-white text-blue-800'}`}>{severe ? 'HANDOFF BLOCKED' : 'EVIDENCE CHECK'}</span>
      </div>
      {result.signals.length ? result.signals.map(s => (
        <p key={s.id} className="mt-2 text-xs leading-relaxed text-slate-800"><strong>{s.title}:</strong> {s.detail}</p>
      )) : <p className="mt-2 text-xs leading-relaxed text-slate-700">No direct intent mismatch was identified. Recipient ownership is not verified.</p>}
      <p className="mt-2 text-[11px] text-slate-600">Observed UPI intent: {result.payment?.payee || 'Unavailable'} · Trust checks use provided evidence only.</p>
    </section>
  );
}
