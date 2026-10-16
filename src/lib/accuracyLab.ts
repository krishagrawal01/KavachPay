import { screenMessage } from './truthTrace';

/**
 * SMALL HAND-WRITTEN DEVELOPMENT FIXTURES — not independently collected test data.
 * Synthetic labels describe scenario intent and are NOT verified reports of real fraud.
 * Only the SMS language screen is evaluated, not the payment firewall, remote ML, URL
 * reputation, sender verification or merchant ownership.
 */
export type ExampleLabel = 'suspicious' | 'ordinary';
export interface EvaluationExample { id: string; label: ExampleLabel; text: string; category: string }
export interface ExamplePrediction extends EvaluationExample { detected: boolean; signals: string[] }
export interface EvaluationMetrics { tp: number; fp: number; tn: number; fn: number; count: number;
  accuracy: number | null; precision: number | null; recall: number | null; falsePositiveRate: number | null; f1: number | null }

const suspicious = [
  ['s01','OTP coercion','URGENT: Update your KYC immediately and share your OTP with the verification agent.'],
  ['s02','Advance fee','Your refund is ready. Pay a processing fee of Rs 49 to release your cashback.'],
  ['s03','Remote access','Download AnyDesk and allow remote access to fix the failed UPI payment.'],
  ['s04','UPI PIN request','Send your UPI PIN to complete the security verification.'],
  ['s05','Prize deposit','You have won a reward! Pay a verification deposit before claiming it.'],
  ['s06','Lottery activation','Your lottery prize is waiting. Pay an activation charge to receive the money.'],
  ['s07','Hinglish OTP','Apna OTP bhejo, account verification turant complete karenge.'],
  ['s08','Hinglish refund','Refund lene ke liye pehle payment karo, phir amount milega.'],
  ['s09','Screen sharing','Install TeamViewer and share your screen so the technician can receive your payment.'],
  ['s10','CVV request','Provide your card CVV to the caller to restore access.'],
  ['s11','Password request','Reply with your password and we will unlock your account.'],
  ['s12','Cashback fee','Claim Rs 5000 cashback. Send a processing fee first.'],
  ['s13','Refund deposit','To release your refund deposit Rs 25 into this payment account.'],
  ['s14','UPI PIN phishing','To accept your money, enter your UPI PIN and share it with our agent.'],
  ['s15','Remote assistance','Install Quick Support and grant remote access for bank account recovery.'],
  ['s16','Threat-only link','Your KYC will expire today. Visit https://security-check.example/kyc to avoid suspension.'],
] as const;

const ordinary = [
  ['b01','Completed KYC','Your KYC update was completed successfully. We will not suspend your account. No further action is required.'],
  ['b02','Security guidance','Security reminder: Never share your OTP or UPI PIN with anyone.'],
  ['b03','Cashback credited','Your Rs 300 cashback refund has been credited to your wallet. No action needed.'],
  ['b04','Statement notice','Your monthly bank account statement is available in the official app.'],
  ['b05','Bill reminder','Your electricity bill is Rs 1250, due on the 25th. View it in the official app.'],
  ['b06','Parcel delivery','Your order has been packed and is scheduled for delivery tomorrow.'],
  ['b07','Disconnection negation','Your electricity payment was received. Service will not be disconnected.'],
  ['b08','Login OTP','Your OTP for signing in is 456789. Do not share this code with anyone.'],
  ['b09','Verified KYC','Your KYC verification was completed successfully. Thank you.'],
  ['b10','Savings notice','Your savings account interest was credited today.'],
  ['b11','No fee notice','No processing fee is required to receive an eligible refund.'],
  ['b12','Remote access guidance','For security, never install AnyDesk or grant remote access to strangers.'],
  ['b13','Password advice','Do not send your password to anyone, including customer support.'],
  ['b14','Payment confirmed','Your purchase payment of Rs 249 was received successfully.'],
  ['b15','Account not blocked','Your account will not be blocked. No further action is needed.'],
  ['b16','Reward already credited','Congratulations, you have already received your cashback reward in the app.'],
] as const;

export const evaluationFixtures: EvaluationExample[] = [
  ...suspicious.map(([id,category,text]) => ({ id,category,text,label:'suspicious' as const })),
  ...ordinary.map(([id,category,text]) => ({ id,category,text,label:'ordinary' as const })),
];

/** Intentionally weak, transparent keyword-only comparator, NOT a measured old app/model. */
export function naiveKeywordFlag(text: string): boolean {
  return /\b(?:kyc|otp|pin|cvv|password|refund|cashback|reward|prize|lottery|urgent|deposit|processing\s+fee|suspend|disconnected|anydesk|teamviewer|remote\s+access)\b/i.test(text);
}

/** HIGH_CONCERN is the alert threshold. CAUTION is reported to users but is not a positive here. */
export function contextualFlag(text: string): boolean {
  return screenMessage(text, { includeLocalMemory: false }).status === 'HIGH_CONCERN';
}

export function classifyExample(example: EvaluationExample, model: 'context'|'keyword'): ExamplePrediction {
  const check = model === 'context' ? screenMessage(example.text, { includeLocalMemory: false }) : null;
  return { ...example,
    detected: model === 'context' ? check!.status === 'HIGH_CONCERN' : naiveKeywordFlag(example.text),
    signals: check ? check.indicators.map(x => x.title) : (naiveKeywordFlag(example.text) ? ['Keyword present'] : []),
  };
}

function ratio(top: number, bottom: number): number | null { return bottom ? top / bottom : null; }
export function measurePredictions(predictions: ExamplePrediction[]): EvaluationMetrics {
  let tp=0, fp=0, tn=0, fn=0;
  for (const item of predictions) {
    if (item.label === 'suspicious') { if (item.detected) tp++; else fn++; }
    else { if (item.detected) fp++; else tn++; }
  }
  const precision=ratio(tp,tp+fp);
  const recall=ratio(tp,tp+fn);
  return {tp,fp,tn,fn,count:predictions.length,accuracy:ratio(tp+tn,predictions.length),precision,recall,
    falsePositiveRate:ratio(fp,fp+tn),f1:precision !== null && recall !== null ? ratio(2*precision*recall,precision+recall) : null};
}

export function evaluateSamples(examples: EvaluationExample[]) {
  const baseline = examples.map(example => classifyExample(example,'keyword'));
  const context = examples.map(example => classifyExample(example,'context'));
  return { baseline:measurePredictions(baseline), context:measurePredictions(context), predictions:context };
}
