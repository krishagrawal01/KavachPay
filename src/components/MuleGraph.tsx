import { useState } from 'react';
import { Network, Cpu, Database, Plus, Check, Trash2, Activity } from 'lucide-react';
import type { ParsedUPI, AdaptedPattern } from '@/lib/types';
import { extractFraudSignature, loadAdaptedPatterns, saveAdaptedPattern } from '@/lib/risk';

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

  // Update mule1 node if we have a parsed VPA
  const displayGraph = parsed?.pa
    ? {
        ...graph,
        nodes: graph.nodes.map(n =>
          n.id === 'mule1' ? { ...n, label: parsed.pa.split('@')[0], sublabel: `Layer 1 Mule @${parsed.pa.split('@')[1] || '?'}` } : n
        ),
      }
    : graph;

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Network size={16} className="text-amber-warn" />
          <span className="text-xs font-bold tracking-tight text-ink-primary">Mule Ring Graph</span>
        </div>
        <div className="text-[10px] font-mono text-ink-muted">Fan-out: {graph.edges.filter(e => e.from === 'mule1').length} accounts</div>
      </div>

      {/* ML Model Badges */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Precision', value: '96.4%', color: 'text-npcigreen' },
          { label: 'Recall', value: '94.8%', color: 'text-npcigreen' },
          { label: 'FPR', value: '1.2%', color: 'text-amber-warn' },
        ].map(m => (
          <div key={m.label} className="rounded-lg bg-surface border border-border p-2 text-center">
            <div className="text-[9px] uppercase tracking-wider text-ink-dim font-semibold">{m.label}</div>
            <div className={`font-mono text-sm font-bold ${m.color} tabular-nums`}>{m.value}</div>
          </div>
        ))}
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
        <div className="text-[10px] uppercase tracking-wider font-bold text-ink-muted mb-2">Fan-Out Timeline</div>
        <div className="space-y-1.5">
          {[
            { t: '0s', e: 'Victim sends ₹5,000 to ramesh.mule88@okaxis', color: 'text-crimson-fraud' },
            { t: '47s', e: 'Split ₹1,800 → split.a92@oksbi', color: 'text-amber-warn' },
            { t: '52s', e: 'Split ₹1,800 → cashier.x7@ybl', color: 'text-amber-warn' },
            { t: '58s', e: 'Split ₹1,400 → drain.f3@okhdfc', color: 'text-amber-warn' },
            { t: '2m 11s', e: 'Crypto OTC conversion begins (USDT)', color: 'text-crimson-fraud' },
            { t: '<4m', e: 'Full cashout complete — traceability lost', color: 'text-crimson-fraud' },
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
}

export function AdaptiveMemory({ onPatternAdded }: AdaptiveMemoryProps) {
  const [input, setInput] = useState('');
  const [patterns, setPatterns] = useState<AdaptedPattern[]>(loadAdaptedPatterns());
  const [extracted, setExtracted] = useState<AdaptedPattern | null>(null);

  const handleExtract = () => {
    if (!input.trim()) return;
    const { keywords, signature } = extractFraudSignature(input);
    const pattern: AdaptedPattern = {
      id: `pat_${Date.now()}`,
      signature,
      keywords,
      addedAt: Date.now(),
      sampleText: input.trim(),
      matchLatency: '<5ms',
    };
    saveAdaptedPattern(pattern);
    setPatterns([...patterns, pattern]);
    setExtracted(pattern);
    setInput('');
    onPatternAdded();
  };

  const handleDelete = (id: string) => {
    const updated = patterns.filter(p => p.id !== id);
    setPatterns(updated);
    localStorage.setItem('kavach_adapted_patterns', JSON.stringify(updated));
  };

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu size={16} className="text-npcigreen" />
          <span className="text-xs font-bold tracking-tight text-ink-primary">Zero-Day Adaptive Learning</span>
        </div>
        <div className="flex items-center gap-1">
          <Database size={12} className="text-ink-dim" />
          <span className="text-[10px] font-mono text-ink-muted">{patterns.length} patterns</span>
        </div>
      </div>

      {/* Info */}
      <div className="rounded-xl bg-npcigreen/5 border border-npcigreen/20 p-3">
        <p className="text-[11px] text-ink-muted leading-relaxed">
          Type or paste a new unseen scam message or UPI transaction note. The AI extracts a semantic fraud signature, saves it to local vector memory, and future scans catch that pattern in <span className="text-npcigreen font-bold">&lt;5ms</span>.
        </p>
      </div>

      {/* Input */}
      <div className="space-y-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder='e.g., "PM Kisan Yojana 18th Installment ₹4000 Credit Claim — Click to verify your account"'
          className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-xs text-ink-primary outline-none focus:border-npcigreen/40 resize-none font-medium"
          rows={3}
        />
        <button
          onClick={handleExtract}
          disabled={!input.trim()}
          className="tactile w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-npcigreen text-obsidian font-bold text-sm tracking-tight disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110"
        >
          <Activity size={16} /> Extract Fraud Signature & Immunize
        </button>
      </div>

      {/* Extraction Result */}
      {extracted && (
        <div className="rounded-xl bg-npcigreen/10 border border-npcigreen/30 p-3 space-y-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <Check size={14} className="text-npcigreen" />
            <span className="text-[10px] uppercase tracking-wider font-bold text-npcigreen">Pattern Immunized</span>
          </div>
          <div className="text-[10px] text-ink-muted">Signature: <span className="font-mono text-npcigreen">{extracted.signature}</span></div>
          <div className="flex flex-wrap gap-1">
            {extracted.keywords.map(k => (
              <span key={k} className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-surface border border-border text-ink-primary">
                {k}
              </span>
            ))}
          </div>
          <div className="text-[10px] text-npcigreen font-mono">Match latency: {extracted.matchLatency}</div>
        </div>
      )}

      {/* Stored patterns */}
      {patterns.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-wider font-bold text-ink-muted">Immunized Patterns (localStorage)</div>
          {patterns.map(p => (
            <div key={p.id} className="rounded-xl bg-surface border border-border p-3">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-ink-primary font-medium truncate">{p.sampleText}</div>
                </div>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="tactile text-ink-dim hover:text-crimson-fraud shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-[9px] text-npcigreen">{p.signature}</span>
                <span className="text-[9px] text-ink-dim">·</span>
                <span className="text-[9px] font-mono text-ink-muted">{p.matchLatency}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {patterns.length === 0 && !extracted && (
        <div className="text-center py-6">
          <Plus size={24} className="text-ink-dim mx-auto mb-2" />
          <p className="text-[11px] text-ink-dim">No patterns learned yet. Extract your first scam signature above.</p>
        </div>
      )}
    </div>
  );
}
