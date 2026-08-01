export default function Proof({ t }) {
  const stats = [
    { value: t.proof.oneValue, label: t.proof.oneLabel, detail: t.proof.oneDetail },
    { value: t.proof.twoValue, label: t.proof.twoLabel, detail: t.proof.twoDetail },
    { value: t.proof.threeValue, label: t.proof.threeLabel, detail: t.proof.threeDetail },
  ];
  return (
    <section className="mk-section mk-section--flush" id="why">
      <div className="mk-wrap">
        <div className="mk-section__head">
          <p className="mk-label">{t.proof.label}</p>
          <h2 className="mk-section__title">{t.proof.title}</h2>
          <p className="mk-section__lede">{t.proof.lede}</p>
        </div>
        <dl className="mk-stats">
          {stats.map((s) => (
            <div className="mk-stat" key={s.label}>
              <dt className="mk-stat__value">{s.value}</dt>
              <dd>
                <p className="mk-label mk-stat__label">{s.label}</p>
                <p className="mk-stat__detail">{s.detail}</p>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
