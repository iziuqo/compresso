'use client';

import { useState, useMemo } from 'react';

function fmt(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return n.toFixed(n < 10 ? 1 : 0);
}
function fmtBytes(gb) {
  if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`;
  return `${gb.toFixed(gb < 10 ? 1 : 0)} GB`;
}
function fmtMoney(n) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
function fmtTime(sec) {
  if (sec < 1) return `${Math.round(sec * 1000)}ms`;
  return `${sec.toFixed(1)}s`;
}

export default function Impact({ t }) {
  const [uploads, setUploads] = useState(100000);
  const [avgSizeMB, setAvgSizeMB] = useState(4.2);
  const [uploadLimitMB, setUploadLimitMB] = useState(2);

  const data = useMemo(() => {
    const compressedMB = avgSizeMB * 0.1;
    const compressionRatio = 1 - compressedMB / avgSizeMB;
    const failRate = avgSizeMB > uploadLimitMB ? 0.15 + (avgSizeMB - uploadLimitMB) * 0.03 : 0;
    const failRateCapped = Math.min(failRate, 0.45);
    const bandwidthBeforeGB = (uploads * avgSizeMB) / 1024;
    const bandwidthAfterGB = (uploads * compressedMB) / 1024;
    const bandwidthSavedGB = bandwidthBeforeGB - bandwidthAfterGB;
    const serverCostPerGB = 0.09;
    const processingCostPerImage = 0.0002;
    const costBefore = bandwidthBeforeGB * serverCostPerGB + uploads * processingCostPerImage;
    const costAfter = bandwidthAfterGB * serverCostPerGB;
    const costSaved = costBefore - costAfter;
    const uploadTimeBefore = (avgSizeMB * 1024) / 500;
    const uploadTimeAfter = (compressedMB * 1024) / 500;
    const failedUploads = Math.round(uploads * failRateCapped);
    const supportTicketsAvoided = Math.round(failedUploads * 0.3);

    return {
      compressionRatio: Math.round(compressionRatio * 100),
      compressedMB: compressedMB.toFixed(1),
      bandwidthBeforeGB, bandwidthAfterGB, bandwidthSavedGB,
      costBefore, costAfter, costSaved,
      uploadTimeBefore, uploadTimeAfter,
      failRateBefore: failRateCapped,
      failedUploads,
      supportTicketsAvoided,
    };
  }, [uploads, avgSizeMB, uploadLimitMB]);

  return (
    <section className="py-20 sm:py-28 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t.impact.title}</h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">{t.impact.subtitle}</p>
        </div>

        {/* Calculator inputs */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-8 shadow-sm mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.impact.calcUploads || 'Monthly uploads'}
              </label>
              <input
                type="range"
                min="1000"
                max="1000000"
                step="1000"
                value={uploads}
                onChange={(e) => setUploads(Number(e.target.value))}
                className="w-full accent-brand-500"
              />
              <div className="text-center text-lg font-bold text-brand-600 mt-1">{fmt(uploads)}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.impact.calcAvgSize || 'Avg. photo size'}
              </label>
              <input
                type="range"
                min="1"
                max="15"
                step="0.5"
                value={avgSizeMB}
                onChange={(e) => setAvgSizeMB(Number(e.target.value))}
                className="w-full accent-brand-500"
              />
              <div className="text-center text-lg font-bold text-brand-600 mt-1">{avgSizeMB} MB</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.impact.calcLimit || 'Upload limit'}
              </label>
              <input
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                value={uploadLimitMB}
                onChange={(e) => setUploadLimitMB(Number(e.target.value))}
                className="w-full accent-brand-500"
              />
              <div className="text-center text-lg font-bold text-brand-600 mt-1">{uploadLimitMB} MB</div>
            </div>
          </div>
        </div>

        {/* Results grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <ResultCard
            label={t.impact.calcBandwidth || 'Bandwidth saved'}
            value={fmtBytes(data.bandwidthSavedGB)}
            detail={`${fmtBytes(data.bandwidthBeforeGB)} → ${fmtBytes(data.bandwidthAfterGB)}`}
            accent
          />
          <ResultCard
            label={t.impact.calcCost || 'Monthly savings'}
            value={fmtMoney(data.costSaved)}
            detail={`${fmtMoney(data.costBefore)} → ${fmtMoney(data.costAfter)}`}
            accent
          />
          <ResultCard
            label={t.impact.calcFailures || 'Upload failures avoided'}
            value={fmt(data.failedUploads)}
            detail={`${Math.round(data.failRateBefore * 100)}% → 0%`}
          />
          <ResultCard
            label={t.impact.calcSpeed || 'Upload time per file'}
            value={fmtTime(data.uploadTimeAfter)}
            detail={`${fmtTime(data.uploadTimeBefore)} → ${fmtTime(data.uploadTimeAfter)}`}
          />
        </div>

        {/* Comparison table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="grid grid-cols-3 text-sm font-semibold">
            <div className="px-4 sm:px-6 py-3 bg-gray-50" />
            <div className="px-4 sm:px-6 py-3 bg-red-50 text-red-700 text-center">{t.impact.before}</div>
            <div className="px-4 sm:px-6 py-3 bg-brand-50 text-brand-700 text-center">{t.impact.after}</div>
          </div>
          <Row label={t.impact.avgSize} before={`${avgSizeMB} MB`} after={`${data.compressedMB} MB`} />
          <Row label={t.impact.bandwidth} before={fmtBytes(data.bandwidthBeforeGB)} after={fmtBytes(data.bandwidthAfterGB)} />
          <Row label={t.impact.failures} before={`~${Math.round(data.failRateBefore * 100)}%`} after="~0%" />
          <Row label={t.impact.calcProcessing || 'Server processing'} before={t.impact.serverLoadBefore || 'Required'} after={t.impact.serverLoadAfter || 'None'} />
          <Row label={t.impact.calcInternet || 'Internet required'} before={t.impact.yes || 'Yes'} after={t.impact.no || 'No (offline)'} />
          <Row label={t.impact.calcStorage || 'Storage'} before={fmtBytes(data.bandwidthBeforeGB)} after={fmtBytes(data.bandwidthAfterGB)} />
          <Row label={t.impact.confusion} before={t.impact.confusionBefore} after={t.impact.confusionAfter} />
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          {t.impact.calcDisclaimer || 'Estimates based on typical JPEG compression ratios, 500 Kbps avg. upload speed, and $0.09/GB bandwidth cost. Actual results vary by image content and network conditions.'}
        </p>
      </div>
    </section>
  );
}

function ResultCard({ label, value, detail, accent }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
      <div className={`text-xl sm:text-2xl font-bold ${accent ? 'text-brand-600' : 'text-gray-900'}`}>{value}</div>
      <div className="text-[0.65rem] sm:text-xs text-gray-500 mt-1 font-medium">{label}</div>
      <div className="text-[0.6rem] sm:text-[0.65rem] text-gray-400 mt-0.5">{detail}</div>
    </div>
  );
}

function Row({ label, before, after }) {
  return (
    <div className="grid grid-cols-3 text-sm border-t border-gray-100">
      <div className="px-4 sm:px-6 py-3 font-medium text-gray-700">{label}</div>
      <div className="px-4 sm:px-6 py-3 text-center text-red-600/70 bg-red-50/20">{before}</div>
      <div className="px-4 sm:px-6 py-3 text-center text-brand-600 bg-brand-50/20 font-medium">{after}</div>
    </div>
  );
}
