import {
  useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode,
} from 'react';

/* ------------------------------------------------------------------ odometer */

/**
 * Digits roll; everything else stays put. Only the digits that actually changed
 * move, because only their transform changed — the rightmost leads and each one
 * to its left follows a beat later, the way a mechanical counter settles.
 *
 * Tabular figures are non-negotiable: without them the readout reflows on every
 * tick and the effect reads as a glitch rather than a mechanism.
 */
export function Odometer({ value, className = '' }: { value: string; className?: string }) {
  const chars = [...value];
  const n = chars.length;
  return (
    <span className={`odo ${className}`} aria-label={value}>
      {chars.map((ch, i) =>
        /\d/.test(ch) ? (
          <span className="odo__win" key={i} aria-hidden="true">
            <span
              className="odo__reel"
              style={{
                transform: `translateY(${-Number(ch) * 10}%)`,
                transitionDelay: `${(n - 1 - i) * 16}ms`,
              }}
            >
              {'0123456789'.split('').map((d) => <span key={d}>{d}</span>)}
            </span>
          </span>
        ) : (
          <span className="odo__fixed" key={i} aria-hidden="true">{ch}</span>
        )
      )}
    </span>
  );
}

/* -------------------------------------------------------------------- slider */

/**
 * The signature control.
 *
 * A hairline that runs the full width, a knob big enough to look reachable, and
 * the value floating directly above it — which means your eye never leaves the
 * thing you're dragging. A tick marks the default so you can feel your way back
 * to it without the control snapping and making the decision for you.
 *
 * Grabbing it dims the track, grows the knob, and lifts the value. Nothing
 * bounces; it all settles.
 */
export function Slider({
  label, value, min, max, step, display, detent, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  display: string; detent?: number; onChange: (v: number) => void;
}) {
  const [live, setLive] = useState(false);
  const [hit, setHit] = useState(false);
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  const detentPct = detent != null ? ((detent - min) / (max - min)) * 100 : null;

  /**
   * The tick answers when you land on it. Fired on the *crossing* — comparing
   * against the previous value — because reacting to "near the detent" would
   * buzz on every frame of a slow drag.
   */
  const prev = useRef(value);
  useEffect(() => {
    if (detent == null) { prev.current = value; return; }
    const was = prev.current;
    prev.current = value;
    const crossed = (was - detent) * (value - detent) <= 0 && was !== value;
    if (!crossed) return;
    setHit(true);
    try { navigator.vibrate?.(4); } catch { /* unsupported */ }
    const t = window.setTimeout(() => setHit(false), 260);
    return () => window.clearTimeout(t);
  }, [value, detent]);

  return (
    <div className={`sl ${live ? 'is-live' : ''} ${hit ? 'is-hit' : ''}`} style={{ ['--p' as string]: `${pct}%` }}>
      <span className="sl__value mono" aria-hidden="true">{display}</span>
      <div className="sl__lane">
        <span className="sl__track" />
        {detentPct != null && (
          <span className="sl__detent" style={{ left: `${detentPct}%` }} aria-hidden="true" />
        )}
        <span className="sl__knob" />
        <input
          id={id}
          className="sl__input"
          type="range"
          min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onPointerDown={() => setLive(true)}
          onPointerUp={() => setLive(false)}
          onPointerCancel={() => setLive(false)}
          onFocus={() => setLive(true)}
          onBlur={() => setLive(false)}
          aria-label={label}
          aria-valuetext={display}
        />
      </div>
      <span className="sl__name label">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------- tabs */

export type Option<T extends string> = { value: T; label: string };

/**
 * A row of plain labels with one white pill riding beneath the active one. The
 * pill travels rather than reappearing, and the label it lands on inverts in
 * place — the paper-coloured copy is clipped to exactly the pill, so the wipe
 * happens *during* the move instead of snapping at the end of it.
 */
export function Tabs<T extends string>({
  options, value, onChange, label,
}: { options: Option<T>[]; value: T; onChange: (v: T) => void; label: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ left: 0, width: 0, host: 0 });

  const measure = useCallback(() => {
    const el = wrap.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>('.tabs__hit[data-active="true"]');
    if (!active) return;
    const host = el.getBoundingClientRect();
    const hit = active.getBoundingClientRect();
    setBox({ left: hit.left - host.left, width: hit.width, host: host.width });
  }, []);

  useLayoutEffect(measure, [measure, value, options.length]);
  useEffect(() => {
    const ro = new ResizeObserver(measure);
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [measure]);

  const clip = `inset(0 ${Math.max(0, box.host - (box.left + box.width))}px 0 ${box.left}px)`;
  const labels = () =>
    options.map((o) => <span className="tabs__label" key={o.value}>{o.label}</span>);

  return (
    <div className="tabs" ref={wrap} role="radiogroup" aria-label={label}>
      <span
        className="tabs__pill"
        style={{ transform: `translateX(${box.left}px)`, width: box.width }}
        aria-hidden="true"
      />
      <span className="tabs__layer" aria-hidden="true">{labels()}</span>
      <span className="tabs__layer tabs__layer--inv" style={{ clipPath: clip }} aria-hidden="true">
        {labels()}
      </span>
      <span className="tabs__hits">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            data-active={o.value === value}
            className="tabs__hit"
            onClick={() => onChange(o.value)}
          >
            <span className="sr">{o.label}</span>
          </button>
        ))}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------- number field */

export function NumberField({
  label, value, placeholder, suffix, onChange,
}: {
  label: string; value: number | null; placeholder: string; suffix?: string;
  onChange: (v: number | null) => void;
}) {
  const id = useId();
  return (
    <div className="nf">
      <label className="nf__label label" htmlFor={id}>{label}</label>
      <span className="nf__box">
        <input
          id={id}
          className="nf__input mono"
          inputMode="numeric"
          value={value ?? ''}
          placeholder={placeholder}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^\d.]/g, '');
            onChange(raw === '' ? null : Number(raw));
          }}
        />
        {suffix && <span className="nf__suffix mono">{suffix}</span>}
      </span>
    </div>
  );
}

export function Group({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <section className="group">
      {label && <h2 className="group__label label">{label}</h2>}
      {children}
    </section>
  );
}

/** A warm light that trails the pointer. The lag is the point — it reads as a
 *  lamp over a bench rather than a cursor effect stapled to the mouse. */
export function useTrailingLight<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);
  const target = useRef({ x: 50, y: 50 });
  const current = useRef({ x: 50, y: 50 });

  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      target.current = {
        x: ((e.clientX - r.left) / r.width) * 100,
        y: ((e.clientY - r.top) / r.height) * 100,
      };
    };
    const tick = () => {
      current.current.x += (target.current.x - current.current.x) * 0.12;
      current.current.y += (target.current.y - current.current.y) * 0.12;
      el.style.setProperty('--lx', `${current.current.x.toFixed(2)}%`);
      el.style.setProperty('--ly', `${current.current.y.toFixed(2)}%`);
      raf = requestAnimationFrame(tick);
    };
    el.addEventListener('pointermove', onMove);
    raf = requestAnimationFrame(tick);
    return () => { el.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf); };
  }, [active]);

  return ref;
}
