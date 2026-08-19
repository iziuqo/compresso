import { useCallback, useEffect, useRef, useState } from 'react';
import { T, useI18n } from '../i18n';
import { Odometer } from './primitives';
import { Drag } from './icons';
import type { Job } from '../state/queue';

/* -------------------------------------------------------------------- compare */

/**
 * The picture, and the seam through it.
 *
 * There is no snap at the midpoint — a snap is a decision the interface makes
 * for you. The handle *decelerates* into the centre instead: within the last few
 * percent, movement compresses so it takes more travel to cross. You can still
 * put it anywhere; the middle just has a little weight, the way a detent does on
 * a well-made dial.
 */
export function Compare({ job }: { job: Job }) {
  const { t } = useI18n();
  const wrap = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(50);
  const [dragging, setDragging] = useState(false);

  const position = useCallback((clientX: number) => {
    const el = wrap.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const raw = Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100));
    const d = raw - 50;
    const pull = 7;
    setX(Math.abs(d) < pull ? 50 + Math.sign(d) * pull * Math.pow(Math.abs(d) / pull, 1.55) : raw);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => position(e.clientX);
    const up = () => setDragging(false);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [dragging, position]);

  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === 'ArrowLeft') { setX((v) => Math.max(0, v - step)); e.preventDefault(); }
    if (e.key === 'ArrowRight') { setX((v) => Math.min(100, v + step)); e.preventDefault(); }
    if (e.key === 'Home') { setX(0); e.preventDefault(); }
    if (e.key === 'End') { setX(100); e.preventDefault(); }
  };

  const ready = !!(job.out && job.previewUrl);

  return (
    <div
      className={`cmp ${dragging ? 'is-dragging' : ''} ${ready ? 'is-ready' : ''}`}
      ref={wrap}
      style={{
        ['--x' as string]: `${x}%`,
        // The frame takes the photograph's own proportions, so it is letterboxed
        // by the black around it rather than cropped by a box we chose.
        ['--ar' as string]: job.out ? `${job.out.originalWidth} / ${job.out.originalHeight}` : '3 / 2',
      }}
      onPointerDown={(e) => { setDragging(true); position(e.clientX); }}
    >
      <div className="cmp__stage">
        {job.previewUrl && (
          <img className="cmp__img" src={job.previewUrl} alt={t('view.before')} draggable={false} />
        )}
        {job.out && job.previewUrl && (
          <div className="cmp__after">
            <img className="cmp__img" src={job.out.url} alt={t('view.after')} draggable={false} />
          </div>
        )}
      </div>

      <div className="cmp__seam" aria-hidden="true" />
      <button
        type="button"
        className="cmp__handle"
        onKeyDown={onKey}
        role="slider"
        aria-label={t('view.compare')}
        aria-valuenow={Math.round(x)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* the glyph says "pull me", then gets out of the way once you are */}
        <span className="cmp__grip" aria-hidden="true"><Drag size={13} /></span>
      </button>

      <span className="cmp__tag cmp__tag--l label"><T k="view.before" /></span>
      <span className="cmp__tag cmp__tag--r label"><T k="view.after" /></span>
    </div>
  );
}

/* ---------------------------------------------------------------------- tile */

/**
 * Status without colour.
 *
 * Queued is dim. Running *develops* — the blur resolving as progress climbs is
 * the progress indicator; there is no bar. Done is full strength with a white
 * rule beneath it. Failed is struck through with one diagonal hairline. Not a
 * single coloured chip anywhere.
 */
export function Tile({
  job, selected, onSelect, onRemove, onRetry,
}: {
  job: Job; selected: boolean;
  onSelect: () => void; onRemove: () => void; onRetry: () => void;
}) {
  const { t, percent, count } = useI18n();
  const grew = job.out ? job.out.savings < 0 : false;
  const label = t(`status.${job.status}` as 'status.done');

  /* Past a point a percentage stops being information: "+2,719%" is a number
     nobody can picture, where "×28" is instant. */
  const figure = (() => {
    if (!job.out) return null;
    const { savings, originalSize, compressedSize } = job.out;
    if (savings < -150 && originalSize > 0) return `×${count(Math.round(compressedSize / originalSize))}`;
    return (grew ? '+' : '−') + percent(Math.abs(savings) / 100);
  })();

  return (
    <div
      className={`tile tile--${job.status} ${selected ? 'is-selected' : ''} ${grew ? 'is-grew' : ''}`}
      style={{ ['--p' as string]: job.status === 'done' ? 1 : job.progress }}
    >
      <button
        type="button" className="tile__hit" onClick={onSelect} aria-pressed={selected}
        tabIndex={selected ? 0 : -1}
      >
        <span className="tile__frame">
          {job.previewUrl && <img className="tile__img" src={job.previewUrl} alt="" draggable={false} />}
          {job.status === 'failed' && <span className="tile__strike" aria-hidden="true" />}
          <span className="tile__mark" aria-hidden="true" />
        </span>
        <span className="tile__figure mono">
          {figure ? <Odometer className={grew ? 'is-grew' : ''} value={figure} />
                  : <span className="tile__status label">{label}</span>}
        </span>
      </button>

      {job.status === 'failed' ? (
        <button type="button" className="tile__retry label" onClick={onRetry}><T k="action.retry" /></button>
      ) : (
        <button type="button" className="tile__x" onClick={onRemove}>
          <span className="sr">{t('action.remove')}</span>
          <svg width="9" height="9" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.4" fill="none" />
          </svg>
        </button>
      )}
      <span className="sr" aria-live="polite">{job.file.name}: {label}</span>
    </div>
  );
}

/* -------------------------------------------------------------------- result */

/**
 * The one loud thing. Everything else on screen is set at label scale so this
 * figure can carry the hierarchy by itself — no badge, no colour, no celebration
 * graphic. It's set light rather than heavy: at this size, weight would shout
 * where scale already speaks.
 */
export function Result({
  saved, fraction, from, to, settled,
}: { saved: number; fraction: number; from: number; to: number; settled: boolean }) {
  const { bytes, percent } = useI18n();
  const grew = saved < 0;

  return (
    <div className={`result ${settled ? 'is-settled' : ''} ${grew ? 'is-grew' : ''}`}>
      <p className={`result__figure ${grew ? 'is-grew' : ''}`} aria-live="polite">
        <Odometer value={grew ? `+${bytes(Math.abs(saved))}` : percent(Math.abs(fraction))} />
      </p>
      <p className="result__detail mono">
        {bytes(from)} <span aria-hidden="true">→</span> {bytes(to)}
        <span className="result__label label"><T k={grew ? 'result.grew' : 'result.saved'} /></span>
      </p>
    </div>
  );
}
