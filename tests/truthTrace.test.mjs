import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFileSync, writeFileSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = mkdtempSync(join(tmpdir(), 'kavach-trace-'));
try {
  for (const name of ['upi', 'risk', 'truthTrace']) {
    const source = readFileSync(`src/lib/${name}.ts`, 'utf8');
    const result = ts.transpileModule(source, {fileName: `${name}.ts`, compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}});
    writeFileSync(join(dir, `${name}.cjs`), result.outputText.replace("require('./upi')", "require('./upi.cjs')").replace("require(\"./upi\")", "require(\"./upi.cjs\")").replace("require('./risk')", "require('./risk.cjs')").replace("require(\"./risk\")", "require(\"./risk.cjs\")"));
  }
  const { createRequire } = await import('node:module');
  const require = createRequire(pathToFileURL(join(dir, 'truthTrace.cjs')));
  const { analyzeTruthTrace, screenMessage } = require('./truthTrace.cjs');
  const { matchAdaptedPatterns } = require('./risk.cjs');
  await test('refund message + outgoing UPI intent => STOP', () => {
    const r = analyzeTruthTrace({message: 'Claim your Rs 2500 cashback refund now', html: '<a href="upi://pay?pa=scammer@okaxis&amp;am=2500">Pay</a>'});
    assert.equal(r.decision, 'STOP'); assert.ok(r.signals.some(x => x.id === 'direction'));
    assert.equal(r.websiteFetched, false);
  });
  await test('trusted recipient mismatch => STOP', () => {
    const r = analyzeTruthTrace({ message: 'Pay your electric bill', paymentUri:'upi://pay?pa=other@okaxis&am=450', expectedPayee:'billdesk@okaxis', expectedDirection:'pay'});
    assert.equal(r.decision, 'STOP'); assert.ok(r.signals.some(x => x.id === 'recipient'));
  });
  await test('known matching inputs only mean no detected contradiction', () => {
    const r = analyzeTruthTrace({ message: 'Pay your electric bill', paymentUri:'upi://pay?pa=billdesk@okaxis&am=450', expectedPayee:'billdesk@okaxis', expectedAmount:'450', expectedDirection:'pay'});
    assert.equal(r.decision, 'NO_CONTRADICTION'); assert.equal(r.recipientVerified, false); assert.equal(r.blockHandoff, false);
  });
  await test('link without HTML does not fabricate a recipient', () => {
    const r = analyzeTruthTrace({ message: 'Open https://utility.example/bill to pay' });
    assert.equal(r.decision, 'INSUFFICIENT'); assert.equal(r.payment, null); assert.equal(r.websiteFetched, false);
  });
  await test('multiple recipients => STOP', () => {
    const r = analyzeTruthTrace({message:'upi://pay?pa=a@okaxis&am=1\nupi://pay?pa=b@okaxis&am=2'});
    assert.equal(r.decision, 'STOP'); assert.ok(r.signals.some(x => x.id === 'multiple'));
  });
  await test('UPI note with refund alone is not interpreted as human claim', () => {
    const r = analyzeTruthTrace({message:'upi://pay?pa=billdesk@okaxis&am=450&tn=refund%20claim'});
    assert.equal(r.decision, 'NO_CONTRADICTION');
  });
  await test('replay only changes simulated payee', () => {
    const base={message:'Pay bill',paymentUri:'upi://pay?pa=billdesk@okaxis&am=450',expectedPayee:'billdesk@okaxis',expectedDirection:'pay'};
    assert.equal(analyzeTruthTrace(base).decision, 'NO_CONTRADICTION');
    assert.equal(analyzeTruthTrace({...base,simulatedPayee:'unrelated@okaxis'}).decision, 'STOP');
  });

  await test('cashback message with an ordinary URL does not invent a UPI recipient', () => {
    const r = analyzeTruthTrace({ message: 'Achhi khabar! Rs300 cashback payen. Abhi recharge karein: https://i.airtel.in/upto300back_2' });
    assert.equal(r.decision, 'INSUFFICIENT'); assert.equal(r.score, null);
    assert.equal(r.payment, null); assert.equal(r.websiteFetched, false);
    assert.notEqual(r.messageScreening.status, 'HIGH_CONCERN');
  });
  await test('electricity disconnection SMS triggers only a weak message warning with no UPI', () => {
    const r = analyzeTruthTrace({ message: 'Final notice: electricity disconnection today! Pay at https://bill-check.example/pay' });
    assert.equal(r.decision, 'INSUFFICIENT'); assert.equal(r.score, null);
    assert.ok(r.messageScreening.indicators.some(i => i.id === 'time-pressure'));
    assert.equal(r.blockHandoff, false);
  });
  await test('reward asking for processing fee is concerning but not verified fraudulent', () => {
    const r = analyzeTruthTrace({ message: 'Your ₹1000 refund is ready. Pay processing fee of ₹50 to claim it.' });
    assert.equal(r.decision, 'INSUFFICIENT');
    assert.equal(r.messageScreening.status, 'HIGH_CONCERN');
    assert.ok(r.messageScreening.indicators.some(i => i.id === 'advance-fee'));
  });
  await test('SMS asking for OTP submission is concerning', () => {
    const r = analyzeTruthTrace({ message: 'Claim cashback: share your OTP immediately.' });
    assert.equal(r.messageScreening.status, 'HIGH_CONCERN');
    assert.ok(r.messageScreening.indicators.some(i => i.id === 'credential-request'));
  });
  await test('normal security warning never share OTP is not flagged as an OTP request', () => {
    const r = analyzeTruthTrace({ message: 'Security reminder: never share your OTP or UPI PIN with anyone.' });
    assert.ok(!r.messageScreening.indicators.some(i => i.id === 'credential-request'));
    assert.equal(r.decision, 'INSUFFICIENT');
  });
  await test('link shortener triggers review without verifying destination', () => {
    const r = analyzeTruthTrace({ message: 'Check your cashback at https://bit.ly/a-demo-link' });
    assert.ok(r.messageScreening.indicators.some(i => i.id === 'short-link'));
    assert.equal(r.messageScreening.webpageInspected, false);
    assert.equal(r.score, null);
  });
  await test('no obvious text warnings is unverified, not safe', () => {
    const r = analyzeTruthTrace({ message: 'Your bill is ₹1250. View details in your official account.' });
    assert.equal(r.messageScreening.status, 'NO_OBVIOUS_SIGNALS');
    assert.equal(r.decision, 'INSUFFICIENT'); assert.equal(r.score, null);
  });
  await test('QR replacement with a trusted merchant reference triggers recipient mismatch', () => {
    const r = analyzeTruthTrace({message:'Pay ₹450 for coffee at Riverside Cafe', paymentUri:'upi://pay?pa=counter-collector@demo&am=450',expectedPayee:'riverside-cafe@demo',expectedAmount:'450',expectedDirection:'pay'});
    assert.equal(r.decision,'STOP');
    assert.ok(r.signals.some(x=>x.id==='recipient'));
    assert.equal(r.websiteFetched,false);
  });
  await test('marketplace buyer receive claim versus pay URI is a contradiction', () => {
    const r = analyzeTruthTrace({message:'You will RECEIVE ₹8000 for your phone; scan and confirm.',paymentUri:'upi://pay?pa=market-deposit@demo&am=8000', expectedDirection:'receive'});
    assert.equal(r.decision,'STOP'); assert.ok(r.signals.some(x=>x.id==='direction'));
  });
  await test('matching merchant reference stays no contradiction and no ownership proof', () => {
    const r = analyzeTruthTrace({message:'Pay ₹450 for coffee',paymentUri:'upi://pay?pa=riverside-cafe@demo&am=450',expectedPayee:'riverside-cafe@demo',expectedAmount:'450',expectedDirection:'pay'});
    assert.equal(r.decision,'NO_CONTRADICTION'); assert.equal(r.recipientVerified,false);
  });
  await test('analyst-approved local rule requires at least two keyword matches', () => {
    const store = new Map();
    globalThis.localStorage = {getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value),removeItem:key=>store.delete(key)};
    store.set('kavach_adapted_patterns',JSON.stringify([{id:'test1',signature:'refund::deposit',keywords:['refund','deposit'],sampleText:'Refund requires deposit',addedAt:0,matchLatency:'local'}]));
    assert.equal(matchAdaptedPatterns('Your refund has been credited'),null);
    assert.ok(matchAdaptedPatterns('A refund requires a deposit'));
    assert.equal(screenMessage('Your refund has been credited').status,'NO_OBVIOUS_SIGNALS');
    assert.ok(screenMessage('Your refund requires a deposit').indicators.some(i=>i.id==='local-reviewed-pattern'));
    const r=analyzeTruthTrace({message:'Your refund requires a deposit'});
    assert.equal(r.payment,null); assert.equal(r.score,null); assert.equal(r.decision,'INSUFFICIENT');
    store.clear();
    delete globalThis.localStorage;
  });
} finally { rmSync(dir, {recursive:true,force:true}); }
