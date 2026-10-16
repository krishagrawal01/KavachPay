import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const dir=mkdtempSync(join(tmpdir(),'kavach-context-'));
try {
  for(const name of ['upi','messageContext','risk','truthTrace','accuracyLab']) {
    const source=readFileSync(`src/lib/${name}.ts`,'utf8');
    const result=ts.transpileModule(source,{fileName:`${name}.ts`,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
    assert.equal(result.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).length??0,0);
    let output=result.outputText;
    for(const dependency of ['upi','messageContext','risk','truthTrace']) {
      output=output.replaceAll(`require('./${dependency}')`,`require('./${dependency}.cjs')`).replaceAll(`require("./${dependency}")`,`require("./${dependency}.cjs")`);
    }
    writeFileSync(join(dir,`${name}.cjs`),output);
  }
  const require=createRequire(pathToFileURL(join(dir,'accuracyLab.cjs')));
  const {screenMessage,analyzeTruthTrace}=require('./truthTrace.cjs');
  const {evaluateSamples,evaluationFixtures}=require('./accuracyLab.cjs');
  const {matchAdaptedPatterns}=require('./risk.cjs');
  await test('completed KYC is not a suspicious instruction',()=>{
    const r=screenMessage('Your KYC update has been completed successfully. We will not suspend your bank account. No further action is required.',{includeLocalMemory:false});
    assert.equal(r.status,'NO_OBVIOUS_SIGNALS');
    assert.equal(r.indicators.length,0);
  });
  await test('negative OTP advice does not trigger a credential request',()=>{
    const r=screenMessage('Never share your OTP or PIN with anyone. Do not send passwords.',{includeLocalMemory:false});
    assert.ok(!r.indicators.some(x=>x.id==='credential-request'));
  });
  await test('negated clause does not hide a later OTP request',()=>{
    const r=screenMessage('Never share your OTP with strangers. However, send the OTP to our verification agent immediately.',{includeLocalMemory:false});
    assert.ok(r.indicators.some(x=>x.id==='credential-request'));
  });
  await test('OTP submission, advance fee, remote share remain high concern',()=>{
    for(const message of ['Share your OTP with our agent to update KYC.','Pay processing fee to receive your cashback refund.','Download AnyDesk and allow remote access now.']) {
      assert.equal(screenMessage(message,{includeLocalMemory:false}).status,'HIGH_CONCERN',message);
    }
  });
  await test('approved local pattern can match suspicious message but not completed notification',()=>{
    const storage=new Map();
    globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
    storage.set('kavach_adapted_patterns',JSON.stringify([{id:'k',signature:'KYC::update::suspend',keywords:['KYC','update','suspend'],sampleText:'KYC urgent',addedAt:0}]));
    assert.equal(matchAdaptedPatterns('Your KYC update has been completed successfully. We will not suspend your account. No further action is required.'),null);
    assert.ok(matchAdaptedPatterns('Urgent! Update KYC now or we will suspend the account.'));
    delete globalThis.localStorage;
  });
  await test('UPI recipient contradictions remain hard STOP regardless of benign message text',()=>{
    const r=analyzeTruthTrace({message:'Your KYC update was completed successfully.',paymentUri:'upi://pay?pa=unexpected@okaxis&am=249',expectedPayee:'known@okaxis',expectedDirection:'pay'});
    assert.equal(r.decision,'STOP');assert.equal(r.blockHandoff,true);
  });
  await test('SMS without a UPI payment still has an unverified payment destination',()=>{
    const r=analyzeTruthTrace({message:'Urgent: click https://support-check.example/pay to update KYC.'});
    assert.equal(r.score,null);assert.equal(r.decision,'INSUFFICIENT');assert.equal(r.websiteFetched,false);
  });
  await test('accuracy fixture statistics are arithmetically consistent',()=>{
    const r=evaluateSamples(evaluationFixtures);
    assert.equal(evaluationFixtures.length,32);
    assert.equal(r.context.tp+r.context.fp+r.context.tn+r.context.fn,32);
    assert.equal(r.baseline.tp+r.baseline.fp+r.baseline.tn+r.baseline.fn,32);
    assert.ok(r.baseline.falsePositiveRate>=r.context.falsePositiveRate);
    assert.ok(r.context.tp>0 && r.context.tn>0);
  });
} finally { rmSync(dir,{recursive:true,force:true}); }
