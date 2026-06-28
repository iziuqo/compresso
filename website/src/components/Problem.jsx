export default function Problem({ t }) {
  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t.problem.title}</h2>
          <p className="text-gray-600 text-lg max-w-3xl mx-auto">{t.problem.subtitle}</p>
        </div>

        <div className="grid grid-cols-3 gap-6 sm:gap-8 max-w-2xl mx-auto mb-16">
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-red-500">{t.problem.stat1Value}</div>
            <div className="text-sm text-gray-500 mt-2">{t.problem.stat1}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-amber-500">{t.problem.stat2Value}</div>
            <div className="text-sm text-gray-500 mt-2">{t.problem.stat2}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-orange-500">{t.problem.stat3Value}</div>
            <div className="text-sm text-gray-500 mt-2">{t.problem.stat3}</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg text-red-900">{t.problem.card1Title}</h3>
            </div>
            <p className="text-red-800/80 leading-relaxed italic">{t.problem.card1Text}</p>
          </div>

          <div className="bg-brand-50 border border-brand-100 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg text-brand-900">{t.problem.card2Title}</h3>
            </div>
            <p className="text-brand-800/80 leading-relaxed">{t.problem.card2Text}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
