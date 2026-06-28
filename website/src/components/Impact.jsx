'use client';

import { useState, useMemo } from 'react';

function fmt(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return n.toFixed(n < 10 && n > 0 ? 1 : 0);
}
function fmtBytes(gb) {
  if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`;
  if (gb < 0.01) return `${(gb * 1024).toFixed(0)} MB`;
  return `${gb.toFixed(gb < 10 ? 1 : 0)} GB`;
}
function fmtMoney(n) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  if (n < 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(0)}`;
}
function fmtTime(sec) {
  if (sec < 1) return `${Math.round(sec * 1000)}ms`;
  if (sec < 60) return `${sec.toFixed(1)}s`;
  return `${(sec / 60).toFixed(1)}min`;
}

export default function Impact({ t }) {
  const [uploads, setUploads] = useState(100000);
  const [avgSizeMB, setAvgSizeMB] = useState(4.2);
  const [uploadLimitMB, setUploadLimitMB] = useState(2);

  const d = useMemo(() => {
    const ratio = 0.905;
    const compMB = avgSizeMB * (1 - ratio);
    const failRate = avgSizeMB > uploadLimitMB ? Math.min(0.12 + (avgSizeMB - uploadLimitMB) * 0.04, 0.40) : 0;

    const bwBeforeGB = (uploads * avgSizeMB) / 1024;
    const bwAfterGB = (uploads * compMB) / 1024;
    const bwSavedGB = bwBeforeGB - bwAfterGB;

    const bandwidthCostPerGB = 0.085;
    const processingCostPerImg = 0.00015;
    const storageCostPerGBMonth = 0.023;
    const supportTicketCost = 12;

    const failedUploads = Math.round(uploads * failRate);
    const retryAttempts = Math.round(failedUploads * 1.8);
    const supportTickets = Math.round(failedUploads * 0.25);
    const abandonments = Math.round(failedUploads * 0.35);

    const costBandwidthBefore = bwBeforeGB * bandwidthCostPerGB;
    const costBandwidthAfter = bwAfterGB * bandwidthCostPerGB;
    const costProcessingBefore = uploads * processingCostPerImg;
    const costStorageBefore = bwBeforeGB * storageCostPerGBMonth;
    const costStorageAfter = bwAfterGB * storageCostPerGBMonth;
    const costSupportBefore = supportTickets * supportTicketCost;
    const costRetryBandwidth = (retryAttempts * avgSizeMB) / 1024 * bandwidthCostPerGB;

    const totalBefore = costBandwidthBefore + costProcessingBefore + costStorageBefore + costSupportBefore + costRetryBandwidth;
    const totalAfter = costBandwidthAfter + costStorageAfter;
    const monthlySaved = totalBefore - totalAfter;

    const uploadSpeedKbps = 500;
    const uploadTimeBefore = (avgSizeMB * 1024) / uploadSpeedKbps;
    const uploadTimeAfter = (compMB * 1024) / uploadSpeedKbps;
    const totalTimeSavedHours = (uploads * (uploadTimeBefore - uploadTimeAfter)) / 3600;

    return {
      compMB: compMB.toFixed(1), ratio: Math.round(ratio * 100),
      bwBeforeGB, bwAfterGB, bwSavedGB,
      failRate, failedUploads, retryAttempts, supportTickets, abandonments,
      costBandwidthBefore, costBandwidthAfter, costProcessingBefore,
      costStorageBefore, costStorageAfter, costSupportBefore,
      totalBefore, totalAfter, monthlySaved, annualSaved: monthlySaved * 12,
      uploadTimeBefore, uploadTimeAfter, totalTimeSavedHours,
    };
  }, [uploads, avgSizeMB, uploadLimitMB]);

  return (
    <section className="py-20 sm:py-28 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t.impact.title}</h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">{t.impact.subtitle}</p>
        </div>

        {/* Sliders */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-8 shadow-sm mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            <SliderInput label={t.impact.calcUploads || 'Monthly uploads'} value={uploads} min={1000} max={2000000} step={1000} display={fmt(uploads)} onChange={setUploads} />
            <SliderInput label={t.impact.calcAvgSize || 'Avg. photo size'} value={avgSizeMB} min={0.5} max={20} step={0.5} display={`${avgSizeMB} MB`} onChange={setAvgSizeMB} />
            <SliderInput label={t.impact.calcLimit || 'System upload limit'} value={uploadLimitMB} min={0.5} max={10} step={0.5} display={`${uploadLimitMB} MB`} onChange={setUploadLimitMB} />
          </div>
        </div>

        {/* Hero metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <HeroMetric value={fmtMoney(d.annualSaved)} label={t.impact.calcAnnual || 'Annual savings'} sub={`${fmtMoney(d.monthlySaved)}/mo`} accent />
          <HeroMetric value={fmtBytes(d.bwSavedGB)} label={t.impact.calcBandwidth || 'Bandwidth saved/mo'} sub={`${fmtBytes(d.bwBeforeGB)} → ${fmtBytes(d.bwAfterGB)}`} accent />
          <HeroMetric value={fmt(d.failedUploads)} label={t.impact.calcFailures || 'Failures eliminated'} sub={`${Math.round(d.failRate * 100)}% → 0%`} />
          <HeroMetric value={`${Math.round(d.totalTimeSavedHours)}h`} label={t.impact.calcTimeSaved || 'User time saved/mo'} sub={`${fmtTime(d.uploadTimeBefore)} → ${fmtTime(d.uploadTimeAfter)} per file`} />
        </div>

        {/* Cost breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">{t.impact.calcCostBreakdown || 'Monthly cost breakdown'}</h3>
            <div className="space-y-2.5">
              <CostRow label={t.impact.bandwidth || 'Bandwidth'} before={fmtMoney(d.costBandwidthBefore)} after={fmtMoney(d.costBandwidthAfter)} />
              <CostRow label={t.impact.calcProcessing || 'Server processing'} before={fmtMoney(d.costProcessingBefore)} after={fmtMoney(0)} />
              <CostRow label={t.impact.calcStorage || 'Storage'} before={fmtMoney(d.costStorageBefore)} after={fmtMoney(d.costStorageAfter)} />
              <CostRow label={t.impact.calcSupport || 'Support tickets'} before={fmtMoney(d.costSupportBefore)} after={fmtMoney(0)} />
              <div className="pt-2 border-t border-gray-100">
                <CostRow label="Total" before={fmtMoney(d.totalBefore)} after={fmtMoney(d.totalAfter)} bold />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">{t.impact.calcUserImpact || 'User experience impact'}</h3>
            <div className="space-y-2.5">
              <ImpactRow label={t.impact.calcUploadSpeed || 'Upload time per file'} before={fmtTime(d.uploadTimeBefore)} after={fmtTime(d.uploadTimeAfter)} />
              <ImpactRow label={t.impact.calcRetries || 'Retry attempts'} before={fmt(d.retryAttempts)} after="0" />
              <ImpactRow label={t.impact.calcAbandoned || 'Abandoned submissions'} before={fmt(d.abandonments)} after="0" />
              <ImpactRow label={t.impact.calcTickets || 'Support tickets'} before={fmt(d.supportTickets)} after="0" />
              <ImpactRow label={t.impact.calcInternet || 'Requires internet'} before={t.impact.yes || 'Yes'} after={t.impact.no || 'No'} />
              <ImpactRow label={t.impact.confusion || 'User confusion'} before={t.impact.confusionBefore || 'High'} after={t.impact.confusionAfter || 'None'} />
            </div>
          </div>
        </div>

        <p className="text-[10px] text-gray-400 text-center max-w-2xl mx-auto leading-relaxed">
          {t.impact.calcDisclaimer || 'Based on: 90.5% avg. JPEG compression ratio, 500 Kbps upload speed, $0.085/GB bandwidth (AWS), $0.023/GB/mo storage (S3), $0.00015/img processing (Lambda), $12/ticket support cost. Failure rate assumes users lack tools to resize/convert. Actual results vary.'}
        </p>
      </div>
    </section>
  );
}

function SliderInput({ label, value, min, max, step, display, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-2">{label}</label>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-brand-500 h-1.5" />
      <div className="text-center text-lg font-bold text-brand-600 mt-1.5">{display}</div>
    </div>
  );
}

function HeroMetric({ value, label, sub, accent }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
      <div className={`text-xl sm:text-2xl font-bold ${accent ? 'text-brand-600' : 'text-gray-900'}`}>{value}</div>
      <div className="text-[0.65rem] text-gray-500 mt-1 font-medium">{label}</div>
      <div className="text-[0.55rem] sm:text-[0.6rem] text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}

function CostRow({ label, before, after, bold }) {
  return (
    <div className={`flex items-center justify-between text-xs ${bold ? 'font-semibold' : ''}`}>
      <span className="text-gray-600">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-red-500/70 line-through">{before}</span>
        <span className="text-brand-600 font-medium">{after}</span>
      </div>
    </div>
  );
}

function ImpactRow({ label, before, after }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-gray-400">{before}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        <span className="text-brand-600 font-medium">{after}</span>
      </div>
    </div>
  );
}
