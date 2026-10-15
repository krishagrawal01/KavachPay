import { useState } from 'react';
import { Network, Cpu, Trash2 } from 'lucide-react';
import type { ParsedUPI, AdaptedPattern } from '@/lib/types';
import { extractFraudSignature, loadAdaptedPatterns, saveAdaptedPattern, matchAdaptedPatterns } from '@/lib/risk';

interface MuleGraphProps {
  parsed: ParsedUPI | null;
}

interface GraphNode {
  id: string;
  label: string;
  sublabel: string;
  type: 'victim' | 'layer1' | 'layer2' | 'cashout';
  x: number;
  y: number;
}

interface GraphEdge {
  from: string;
  to: string;
  label: string;
  delay: string;
}

const DEFAULT_GRAPH: { nodes: GraphNode[]; edges: GraphEdge[] } = {
  nodes: [
    { id: 'victim', label: 'YOU', sublabel: 'Victim', type: 'victim', x: 60, y: 180 },
    { id: 'mule1', label: 'ramesh.mule88', sublabel: 'Layer 1 Mule @okaxis', type: 'layer1', x: 200, y: 100 },
    { id: 'split1', label: 'split.a92@oksbi', sublabel: 'Layer 2 Split A', type: 'layer2', x: 330, y: 40 },
    { id: 'split2', label: 'cashier.x7@ybl', sublabel: 'Layer 2 Split B', type: 'layer2', x: 330, y: 180 },
    { id: 'split3', label: 'drain.f3@okhdfc', sublabel: 'Layer 2 Split C', type: 'layer2', x: 330, y: 320 },
    { id: 'crypto', label: 'Crypto OTC', sublabel: 'USDT Cashout', type: 'cashout', x: 200, y: 280 },
  ],
  edges: [
    { from: 'victim', to: 'mule1', label: '₹5,000', delay: '0s' },
    { from: 'mule1', to: 'split1', label: '₹1,800', delay: '47s' },
    { from: 'mule1', to: 'split2', label: '₹1,800', delay: '52s' },
    { from: 'mule1', to: 'split3', label: '₹1,400', delay: '58s' },
    { from: 'split1', to: 'crypto', label: '₹1,800', delay: '2m 11s' },
    { from: 'split2', to: 'crypto', label: '₹1,800', delay: '2m 34s' },
    { from: 'split3', to: 'crypto', label: '₹1,400', delay: '3m 02s' },
  ],
};

const NODE_STYLES = {
  victim: { fill: '#FF2A4B', text: '#FFFFFF', ring: '#FF2A4B' },
  layer1: { fill: '#161922', text: '#FFB020', ring: '#FFB020' },
  layer2: { fill: '#161922', text: '#8E95A5', ring: '#FFB020' },
  cashout: { fill: '#161922', text: '#FF2A4B', ring: '#FF2A4B' },
};

export function MuleGraph({ parsed }: MuleGraphProps) {
  const graph = DEFAULT_GRAPH;

  // A UPI QR contains the intended recipient only; it does not reveal
  // downstream transfers. Never graft a scanned account into this example network.
  const displayGraph = graph;

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Network size={16} className="text-amber-warn" />
          <span className="text-xs font-bold tracking-tight text-ink-primary">Illustrative Fund-Flow Network</span>
        </div>
        <div className="text-[10px] font-mono text-ink-muted">Fan-out: {graph.edges.filter(e => e.from === 'mule1').length} accounts</div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
        <strong>SIMULATION — NOT A LIVE MONEY TRAIL.</strong> These nodes, amounts and delays are fictional. A QR/UPI URI cannot reveal where money goes after payment. No bank ledger or downstream transfer API is connected.
        {parsed?.pa && <p className="mt-2 break-all font-medium">Your scanned recipient is <span className="font-mono">{parsed.pa}</span>. No actual transfer path is known for it.</p>}
      </div>

      {/* SVG Graph */}
      <div className="rounded-2xl bg-surface border border-border overflow-hidden">
        <div className="dot-matrix-dense">
          <svg viewBox="0 0 400 360" className="w-full h-auto">
            {/* Edges */}
            {displayGraph.edges.map((e, i) => {
              const from = displayGraph.nodes.find(n => n.id === e.from)!;
              const to = displayGraph.nodes.find(n => n.id === e.to)!;
              const mx = (from.x + to.x) / 2;
              const my = (from.y + to.y) / 2;
              return (
                <g key={i}>
                  <line
                    x1={from.x} y1={from.y}
                    x2={to.x} y2={to.y}
                    stroke="#2A2E3A" strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                  <text
                    x={mx} y={my - 4}
                    fill="#FFB020" fontSize="8"
                    fontFamily="JetBrains Mono" fontWeight="600"
                    textAnchor="middle"
                  >
                    {e.label}
                  </text>
                  <text
                    x={mx} y={my + 6}
                    fill="#5C6270" fontSize="7"
                    fontFamily="JetBrains Mono"
                    textAnchor="middle"
                  >
                    {e.delay}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {displayGraph.nodes.map(n => {
              const style = NODE_STYLES[n.type];
              const r = n.type === 'victim' ? 26 : n.type === 'cashout' ? 22 : 18;
              return (
                <g key={n.id}>
                  {n.type === 'victim' && (
                    <circle cx={n.x} cy={n.y} r={r + 6} fill="none" stroke={style.ring} strokeWidth="1" opacity="0.3" className="animate-pulse" />
                  )}
                  <circle
                    cx={n.x} cy={n.y} r={r}
                    fill={style.fill}
                    stroke={style.ring}
                    strokeWidth={n.type === 'victim' ? '2' : '1.5'}
                  />
                  <text
                    x={n.x} y={n.y + 3}
                    fill={style.text}
                    fontSize="7.5"
                    fontFamily="JetBrains Mono"
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {n.label.length > 14 ? n.label.slice(0, 12) + '..' : n.label}
                  </text>
                  <text
                    x={n.x} y={n.y + r + 12}
                    fill="#8E95A5"
                    fontSize="7"
                    fontFamily="Plus Jakarta Sans"
                    fontWeight="500"
                    textAnchor="middle"
                  >
                    {n.sublabel}
                  </text>
                </g>
              );
            })}

            {/* Flow animation */}
            <circle r="2" fill="#00E599" opacity="0.8">
              <animateMotion dur="3s" repeatCount="indefinite" path="M 60,180 L 200,100" />
            </circle>
            <circle r="2" fill="#FFB020" opacity="0.6">
              <animateMotion dur="2s" begin="1s" repeatCount="indefinite" path="M 200,100 L 330,40" />
            </circle>
            <circle r="2" fill="#FFB020" opacity="0.6">
              <animateMotion dur="2s" begin="1.2s" repeatCount="indefinite" path="M 200,100 L 330,180" />
            </circle>
            <circle r="2" fill="#FF2A4B" opacity="0.6">
              <animateMotion dur="2s" begin="2s" repeatCount="indefinite" path="M 330,40 L 200,280" />
            </circle>
          </svg>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-xl bg-surface border border-border p-3">
        <div className="text-[10px] uppercase tracking-wider font-bold text-ink-muted mb-2">Illustrative Demo Timeline</div>
        <div className="space-y-1.5">
          {[
            { t: '0s', e: 'Victim sends ₹5,000 to ramesh.mule88@okaxis', color: 'text-crimson-fraud' },
            { t: '47s', e: 'Split ₹1,800 → split.a92@oksbi', color: 'text-amber-warn' },
            { t: '52s', e: 'Split ₹1,800 → cashier.x7@ybl', color: 'text-amber-warn' },
            { t: '58s', e: 'Split ₹1,400 → drain.f3@okhdfc', color: 'text-amber-warn' },
            { t: '2m 11s', e: 'Crypto OTC conversion begins (USDT)', color: 'text-crimson-fraud' },
            { t: '<4m', e: 'Example cashout stage (not a verified event)', color: 'text-crimson-fraud' },
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2 text-[10px]">
              <span className="font-mono text-ink-dim w-12 shrink-0 tabular-nums">{step.t}</span>
              <span className={step.color}>{step.e}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface AdaptiveMemoryProps {
  onPatternAdded: () => void;
  onCheckMessage?: (message: string) => void;
}

export function AdaptiveMemory({ onPatternAdded, onCheckMessage }: AdaptiveMemoryProps) {
  const [input, setInput] = useState('');
  const [patterns, setPatterns] = useState<AdaptedPattern[]>(loadAdaptedPatterns());
  const [draft, setDraft] = useState<AdaptedPattern | null>(null);
  const [testMessage, setTestMessage] = useState('');
  const [notice, setNotice] = useState('');
  const matched = testMessage.trim() ? matchAdaptedPatterns(testMessage) : null;

  const prepare = () => {
    if (!input.trim()) return;
    const { keywords, signature } = extractFraudSignature(input);
    const unique = [...new Set(keywords.map(keyword => keyword.toLowerCase().trim()))].filter(Boolean);
    if (unique.length < 2) {
      setNotice('This sample generated fewer than two keywords. Add a distinctive second phrase before creating a rule.');
      setDraft(null);
      return;
    }
    setDraft({
      id: `pat_${Date.now()}`,
      signature,
      keywords: unique,
      addedAt: Date.now(),
      sampleText: input.trim(),
      matchLatency: 'Local heuristic match',
    });
    setNotice('Review the keywords and explicitly approve before this rule becomes active.');
  };

  const approve = () => {
    if (!draft) return;
    const normalized = draft.signature.trim().toLowerCase();
    if (patterns.some(p => p.signature.trim().toLowerCase() === normalized)) {
      setNotice('This signature is already in your browser memory.');
      setDraft(null);
      return;
    }
    saveAdaptedPattern(draft);
    const stored = loadAdaptedPatterns();
    if (!stored.some(p => p.signature.trim().toLowerCase() === normalized)) {
      setNotice('The browser could not save this rule. Check storage permissions.');
      return;
    }
    setPatterns(stored);
    setTestMessage(draft.sampleText);
    setInput('');
    setDraft(null);
    setNotice('Approved locally. Try modifying the test text below to check for false positives.');
    onPatternAdded();
  };

  const handleDelete = (id: string) => {
    const updated = patterns.filter(p => p.id !== id);
    setPatterns(updated);
    try { localStorage.setItem('kavach_adapted_patterns', JSON.stringify(updated)); }
    catch { setNotice('Could not update browser storage.'); }
    onPatternAdded();
  };

  return (
    <div className="space-y-4 px-4 py-3">
      <header>
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><Cpu size={18} className="text-blue-700" /> Scam Pattern Memory</h2>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">{patterns.length} local rules</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-600">Create a candidate rule, review its keywords, then approve it. Approved rules are stored only in this browser, not in Supabase or a bank network. This is keyword matching, not AI training.</p>
      </header>
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <label htmlFor="kavach-pattern-input" className="text-xs font-bold text-slate-800">1. Paste a suspected scam pattern (fictional demo preferred)</label>
        <button type="button" onClick={() => { setInput('Escrow clearance pending. Complete the seller checkpoint before your payout can proceed.'); setDraft(null); setNotice('Example loaded. Generate and review a draft before approval.'); }} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800">Load fictional analyst demo</button>
        <textarea id="kavach-pattern-input" value={input} onChange={e => {setInput(e.target.value);setDraft(null);setNotice('');}}
          placeholder="e.g. Refund verification deposit required immediately" rows={3}
          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900" />
        <button type="button" onClick={prepare} disabled={!input.trim()} className="min-h-11 w-full rounded-xl bg-blue-700 px-4 text-sm font-bold text-white disabled:opacity-40">Generate draft rule</button>
        {draft && (
          <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-extrabold text-amber-900">2. Analyst review required — not active yet</p>
            <p className="break-all text-[11px] text-amber-900">Rule: {draft.signature}</p>
            <div className="flex flex-wrap gap-1">{draft.keywords.map(k => <span key={k} className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-slate-700">{k}</span>)}</div>
            <p className="text-[11px] text-amber-900">At least two distinct keywords must match. Broad keywords can still cause false positives; review before activation.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDraft(null)} className="min-h-10 flex-1 rounded-lg border border-amber-300 px-2 text-xs font-bold text-amber-900">Discard</button>
              <button type="button" onClick={approve} className="min-h-10 flex-1 rounded-lg bg-emerald-700 px-2 text-xs font-bold text-white">Approve local rule</button>
            </div>
          </div>
        )}
        {notice && <p role="status" className="text-xs text-slate-700">{notice}</p>}
      </section>
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <label htmlFor="kavach-pattern-test" className="text-xs font-bold text-slate-800">3. Test a message against approved rules</label>
        <textarea id="kavach-pattern-test" rows={3} value={testMessage} onChange={e => setTestMessage(e.target.value)}
          placeholder="Type a suspicious and then an unrelated message to test false positives"
          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900" />
        {onCheckMessage && testMessage.trim() && (
          <button type="button" onClick={() => onCheckMessage(testMessage.trim())}
            className="min-h-11 w-full rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-bold text-blue-900">Open this message in Check SMS/Link →</button>
        )}
        <div aria-live="polite" className={`rounded-xl p-3 text-xs ${matched ? 'border border-amber-200 bg-amber-50 text-amber-900' : 'border border-slate-200 bg-slate-50 text-slate-600'}`}>
          {matched ? <>Local match: <strong>{matched.signature}</strong>. This is a saved-rule match, not proof of fraud. The same approved rule can contribute to message warning signs in TruthTrace.</>
            : testMessage.trim() ? 'No approved local rule matched. This is not proof the message is genuine.' : 'Enter test text to check locally saved patterns.'}
        </div>
      </section>
      <section className="space-y-2">
        <h3 className="text-xs font-extrabold text-slate-800">Active reviewed signatures (this browser only)</h3>
        {patterns.length ? patterns.map(p => (
          <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="break-words text-xs font-semibold text-slate-900">{p.sampleText}</p>
                <p className="mt-1 break-all font-mono text-[10px] text-slate-600">{p.signature}</p>
              </div>
              <button type="button" onClick={() => handleDelete(p.id)} aria-label={`Remove ${p.signature}`} className="shrink-0 rounded-lg border border-slate-200 p-2 text-rose-700"><Trash2 size={16}/></button>
            </div>
          </div>
        )) : <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">No reviewed rules saved yet.</p>}
      </section>
    </div>
  );
}
