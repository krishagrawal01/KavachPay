import { useState } from 'react';
import {
  ArrowDownRight,
  ChevronDown,
} from 'lucide-react';

import type { ParsedUPI, RiskAssessment } from '@/lib/types';
import { formatAmount, maskVpa } from '@/lib/upi';
import { KavachMark, MerchantMark, PaymentCardMark, RiskAlertMark } from '@/components/KavachIcons';
import { useI18n } from '@/lib/i18n';

interface UPIDissectorProps {
  parsed: ParsedUPI;
  assessment: RiskAssessment;
  onReviewPayment: () => void;
}

export function UPIDissector({
  parsed,
  assessment,
  onReviewPayment,
}: UPIDissectorProps) {
  const { t } = useI18n();
  const [showDetails, setShowDetails] = useState(false);

  const isMerchantCodePresent = Boolean(
    parsed.mc && parsed.mc !== '0000'
  );

  const isLocalSafe = assessment.level === 'SAFE';
  const isCritical = assessment.level === 'CRITICAL';

  const tone = isCritical
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : isLocalSafe
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-amber-200 bg-amber-50 text-amber-800';

  return (
    <div className="space-y-4 pb-5">
      <button
        type="button"
        onClick={onReviewPayment}
        className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-brand-blue hover:bg-brand-pale"
      >
        <ArrowDownRight size={17} />
        {t('backSafetyReview')}
      </button>

      <section className={`rounded-3xl border p-4 shadow-card ${tone}`}>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/80">
            {isCritical ? (
              <RiskAlertMark size={24} />
            ) : (
              <KavachMark size={24} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-base font-extrabold">
              {isCritical
                ? t('highRiskDetails')
                : isLocalSafe
                  ? t('noMajorWarnings')
                  : t('reviewCarefully')}
            </p>

            <p className="mt-1 text-sm leading-relaxed opacity-90">
              {t("preliminaryChecks")}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3 rounded-2xl bg-white/70 p-3">
          <div>
            <p className="text-xs font-semibold opacity-75">
              {t("localRiskScore")}
            </p>

            <p className="mt-0.5 text-2xl font-extrabold tabular-nums">
              {assessment.compositeScore}
              <span className="text-sm font-semibold">/100</span>
            </p>
          </div>

          <span className="rounded-full border border-current/20 px-3 py-1.5 text-xs font-bold">
            {isCritical
              ? t('highRisk')
              : isLocalSafe
                ? t('lowIndicators')
                : t('review')}
          </span>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-white p-4 shadow-card">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              isMerchantCodePresent
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {isMerchantCodePresent ? (
              <MerchantMark size={23} />
            ) : (
              <PaymentCardMark size={23} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-500">{t("paying")}</p>

            <p className="mt-0.5 break-words text-base font-bold text-slate-900">
              {parsed.pn || t('recipientMissing')}
            </p>

            <p className="mt-1 break-all font-mono text-xs text-slate-500">
              {maskVpa(parsed.pa) || 'UPI ID not provided'}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-xs font-medium text-slate-500">Amount</p>

            <p className="mt-0.5 text-xl font-extrabold tabular-nums text-slate-900">
              ₹{formatAmount(parsed.am)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
          <ArrowDownRight size={16} className="shrink-0 text-slate-500" />
          <span>
            This request asks you to send money. A QR code alone does not
            verify who receives it.
          </span>
        </div>

        <button
          type="button"
          onClick={onReviewPayment}
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-blue px-4 py-3 text-sm font-bold text-white shadow-sm hover:brightness-105"
        >
          <ShieldCheck size={18} />
          Check before continuing
        </button>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-white">
        <button
          type="button"
          onClick={() => setShowDetails((value) => !value)}
          aria-expanded={showDetails}
          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-semibold text-slate-800"
        >
          <span>Technical payment details</span>

          <ChevronDown
            size={17}
            className={`text-slate-500 transition-transform ${
              showDetails ? 'rotate-180' : ''
            }`}
          />
        </button>

        {showDetails && (
          <div className="space-y-3 border-t border-slate-100 px-4 py-4">
            {[
              ['UPI ID', parsed.pa || 'Not provided'],
              ['Payment note', parsed.tn || 'Not provided'],
              ['Merchant category', parsed.mc || 'Not supplied'],
              ['Currency', parsed.cu || 'INR'],
              ['Payment action', parsed.action || 'Not supplied'],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-start justify-between gap-4"
              >
                <span className="text-xs text-slate-500">{label}</span>

                <span className="max-w-[65%] break-all text-right font-mono text-xs text-slate-800">
                  {value}
                </span>
              </div>
            ))}

            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-800">
                Local risk indicators
              </p>

              <div className="mt-2 space-y-2">
                {assessment.vectors.filter((vector) => vector.triggered)
                  .length === 0 ? (
                  <p className="text-xs leading-relaxed text-slate-500">
                    No local rule was triggered. This is not proof of safety.
                  </p>
                ) : (
                  assessment.vectors
                    .filter((vector) => vector.triggered)
                    .map((vector) => (
                      <div
                        key={vector.id}
                        className="rounded-xl bg-amber-50 p-3"
                      >
                        <p className="text-xs font-bold text-amber-900">
                          {vector.label}
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-amber-800">
                          {vector.description}
                        </p>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}