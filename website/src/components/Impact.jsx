export default function Impact({ t }) {
  const rows = [
    { label: t.impact.avgSize, before: t.impact.avgSizeBefore, after: t.impact.avgSizeAfter },
    { label: t.impact.bandwidth, before: t.impact.bandwidthBefore, after: t.impact.bandwidthAfter },
    { label: t.impact.failures, before: t.impact.failuresBefore, after: t.impact.failuresAfter },
    { label: t.impact.serverLoad, before: t.impact.serverLoadBefore, after: t.impact.serverLoadAfter },
    { label: t.impact.confusion, before: t.impact.confusionBefore, after: t.impact.confusionAfter },
  ];

  return (
    <section className="py-20 sm:py-28 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t.impact.title}</h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">{t.impact.subtitle}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="grid grid-cols-3 text-sm font-semibold">
            <div className="px-4 sm:px-6 py-4 bg-gray-50" />
            <div className="px-4 sm:px-6 py-4 bg-red-50 text-red-700 text-center">{t.impact.before}</div>
            <div className="px-4 sm:px-6 py-4 bg-brand-50 text-brand-700 text-center">{t.impact.after}</div>
          </div>

          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-3 text-sm border-t border-gray-100">
              <div className="px-4 sm:px-6 py-4 font-medium text-gray-700">{row.label}</div>
              <div className="px-4 sm:px-6 py-4 text-center text-red-600 bg-red-50/30">{row.before}</div>
              <div className="px-4 sm:px-6 py-4 text-center text-brand-600 bg-brand-50/30 font-medium">{row.after}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
