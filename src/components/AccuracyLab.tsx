import { useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, CheckCircle2, FlaskConical, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import { evaluateSamples, evaluationFixtures, type EvaluationExample, type EvaluationMetrics, type ExampleLabel } from '@/lib/accuracyLab';
import { useI18n } from '@/lib/i18n';

type Category = 'all' | 'mistakes' | 'ordinary' | 'suspicious';
function fmt(value: number|null) { return value === null ? 'N/A' : `${(value * 100).toFixed(1)}%`; }
function Metric({ label, value, hint }: {label:string;value:string;hint:string}) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-3">
    <p className="text-[11px] font-bold text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{value}</p>
    <p className="mt-1 text-[11px] leading-snug text-slate-500">{hint}</p>
  </div>;
}
function Matrix({data}:{data:EvaluationMetrics}) {
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3">
    <p className="mb-2 text-sm font-extrabold text-slate-900">Confusion matrix — context rule alert threshold</p>
    <div className="grid grid-cols-2 gap-2 text-center">
      <div className="rounded-xl bg-emerald-50 p-3"><p className="text-[10px] font-bold text-emerald-700">Suspicious correctly flagged</p><p className="text-2xl font-extrabold text-emerald-900">{data.tp}</p><p className="text-[10px] text-emerald-800">True positives</p></div>
      <div className="rounded-xl bg-rose-50 p-3"><p className="text-[10px] font-bold text-rose-700">Ordinary incorrectly flagged</p><p className="text-2xl font-extrabold text-rose-900">{data.fp}</p><p className="text-[10px] text-rose-800">False positives</p></div>
      <div className="rounded-xl bg-amber-50 p-3"><p className="text-[10px] font-bold text-amber-700">Suspicious missed</p><p className="text-2xl font-extrabold text-amber-900">{data.fn}</p><p className="text-[10px] text-amber-800">False negatives</p></div>
      <div className="rounded-xl bg-blue-50 p-3"><p className="text-[10px] font-bold text-blue-700">Ordinary not flagged</p><p className="text-2xl font-extrabold text-blue-900">{data.tn}</p><p className="text-[10px] text-blue-800">True negatives</p></div>
    </div>
  </div>;
}

export function AccuracyLab({onBack}:{onBack:()=>void}) {
  const { t } = useI18n();
  const [custom,setCustom]=useState<EvaluationExample[]>([]);
  const [message,setMessage]=useState('');
  const [label,setLabel]=useState<ExampleLabel>('ordinary');
  const [filter,setFilter]=useState<Category>('mistakes');
  const [showAll,setShowAll]=useState(false);
  const all = useMemo(()=>[...evaluationFixtures,...custom],[custom]);
  const report = useMemo(()=>evaluateSamples(all),[all]);
  const viewed = report.predictions.filter(example => filter==='all' ||
    (filter==='mistakes' ? (example.detected !== (example.label==='suspicious')) : example.label===filter));
  const addCustom = () => {
    const text=message.trim();
    if (!text || custom.length >= 50) return;
    setCustom(items => [...items,{id:`custom-${items.length + 1}`,text,label,category:'Manually labeled — this session'}]);
    setMessage('');
    setFilter('all');
    setShowAll(true);
  };
  return <div className="space-y-4 pb-5">
    <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50"><ArrowLeft size={17}/> {t("backToTools")}</button>
    <header className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-blue-700"><BarChart3 size={17}/> Accuracy Lab · Development benchmark</div>
      <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{t('accuracyHeadline')}</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">Compare a deliberately simple keyword baseline with KavachPay's context-aware SMS warning rules. Metrics are recalculated locally from labeled examples.</p>
    </header>
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
      <strong>Important limitation:</strong> These {evaluationFixtures.length} built-in messages are <strong>handcrafted synthetic development fixtures</strong>, not an independent test set or evidence of real-world fraud-detection accuracy. The baseline below is a deliberately simple keyword comparator, <strong>not</strong> a previously measured KavachPay model. No ML backend or website inspection is tested here. An actual accuracy claim needs separately collected, consented, independently reviewed cases.
    </div>
    <div className="grid grid-cols-2 gap-2">
      <Metric label="Context precision" value={fmt(report.context.precision)} hint="Of alerts, how many labeled suspicious"/>
      <Metric label="Context recall" value={fmt(report.context.recall)} hint="Of suspicious cases, how many alerted"/>
      <Metric label="False-positive rate" value={fmt(report.context.falsePositiveRate)} hint="Of ordinary cases, how many alerted"/>
      <Metric label="Overall test accuracy" value={fmt(report.context.accuracy)} hint={`${all.length} labeled development examples`}/>
    </div>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <h2 className="text-base font-extrabold text-slate-900">{t('keywordBaseline')}</h2>
      <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold text-slate-700">
        <div>Metric</div><div className="text-right">Keyword only</div><div className="text-right">Context-aware</div>
      </div>
      {[['Precision','precision'],['Recall','recall'],['False-positive rate','falsePositiveRate'],['Accuracy','accuracy']].map(([name,key])=><div key={key} className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-2 text-xs text-slate-800">
        <span>{name}</span><span className="text-right tabular-nums">{fmt(report.baseline[key as keyof EvaluationMetrics] as number|null)}</span><span className="text-right font-extrabold tabular-nums">{fmt(report.context[key as keyof EvaluationMetrics] as number|null)}</span>
      </div>)}
      <p className="text-[11px] text-slate-500">A positive prediction means HIGH_CONCERN. CAUTION is not counted as a fraud alert. Neither outcome proves legitimacy or fraud.</p>
    </section>
    <Matrix data={report.context}/>
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2"><FlaskConical size={18} className="text-blue-700"/><h2 className="text-base font-extrabold text-slate-900">{t('tryOwnMessage')}</h2></div>
      <p className="text-xs leading-relaxed text-slate-600">Add a message with your expected label to see if the alert system agrees. No message is uploaded; added examples disappear when you reload. Remove phone numbers, OTPs and other private information first.</p>
      <label className="block text-xs font-bold text-slate-700" htmlFor="accuracy-message">SMS text</label>
      <textarea id="accuracy-message" value={message} onChange={e=>setMessage(e.target.value)} rows={3} maxLength={3000} placeholder="Paste a fictional or de-identified SMS" className="w-full resize-y rounded-xl border border-slate-300 p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <label className="block text-xs font-bold text-slate-700" htmlFor="accuracy-label">Your manually reviewed label</label>
      <select id="accuracy-label" value={label} onChange={e=>setLabel(e.target.value as ExampleLabel)} className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900"><option value="ordinary">Ordinary / non-scam scenario</option><option value="suspicious">Suspicious / scam scenario</option></select>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={addCustom} disabled={!message.trim() || custom.length >= 50} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-40"><Plus size={17}/> Add and evaluate</button>
        {custom.length>0 && <button type="button" onClick={()=>{setCustom([]);setFilter('mistakes');}} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"><Trash2 size={15}/> Reset ({custom.length})</button>}
      </div>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-extrabold text-slate-900">{t('testCaseReview')}</h2><span className="text-[11px] text-slate-500">{viewed.length} cases</span></div>
      <div className="flex flex-wrap gap-1.5">
        {([['mistakes','Mistakes'],['all','All'],['suspicious','Labeled suspicious'],['ordinary','Labeled ordinary']] as const).map(([value,text])=><button key={value} type="button" onClick={()=>{setFilter(value);setShowAll(value==='mistakes');}} className={`rounded-full px-3 py-2 text-[11px] font-bold ${filter===value?'bg-blue-700 text-white':'bg-slate-100 text-slate-700'}`}>{text}</button>)}
      </div>
      {viewed.length===0 && <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800"><CheckCircle2 size={15} className="mr-1 inline"/> No mistakes in this selected synthetic subset. This does not establish real-world accuracy.</p>}
      {(showAll?viewed:viewed.slice(0,6)).map(item=><div key={item.id} className="rounded-xl border border-slate-200 p-3 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-xs text-slate-800">{item.category}</strong><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.detected===(item.label==='suspicious')?'bg-emerald-50 text-emerald-800':'bg-rose-50 text-rose-800'}`}>{item.detected===(item.label==='suspicious')?'Correct on fixture':'Misclassified on fixture'}</span></div>
        <p className="break-words text-xs leading-relaxed text-slate-700">{item.text}</p>
        <p className="text-[11px] text-slate-500">Label: {item.label} · Prediction: {item.detected?'Concern alert':'No concern alert'}{item.signals.length?` · ${item.signals.slice(0,2).join(', ')}`:''}</p>
      </div>)}
      {!showAll&&viewed.length>6&&<button onClick={()=>setShowAll(true)} className="min-h-10 w-full rounded-xl bg-slate-100 text-xs font-bold text-slate-700">Show all {viewed.length} cases</button>}
      <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600"><ShieldAlert size={15} className="mt-0.5 shrink-0"/> A local signature saved in Scam Pattern Memory is intentionally disabled during this benchmark so different users can reproduce the same fixture results.</div>
    </section>
  </div>;
}
