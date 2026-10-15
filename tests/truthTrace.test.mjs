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
  for (const name of ['upi', 'truthTrace']) {
    const source = readFileSync(`src/lib/${name}.ts`, 'utf8');
    const result = ts.transpileModule(source, {fileName: `${name}.ts`, compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}});
    writeFileSync(join(dir, `${name}.cjs`), result.outputText.replace("require('./upi')", "require('./upi.cjs')").replace("require(\"./upi\")", "require(\"./upi.cjs\")"));
  }
  const { createRequire } = await import('node:module');
  const require = createRequire(pathToFileURL(join(dir, 'truthTrace.cjs')));
  const { analyzeTruthTrace } = require('./truthTrace.cjs');
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
} finally { rmSync(dir, {recursive:true,force:true}); }
