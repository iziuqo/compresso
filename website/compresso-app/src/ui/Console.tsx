import { useState } from 'react';
import { T, useI18n } from '../i18n';
import { NumberField, Slider, Tabs, type Option } from './primitives';
import { Chevron } from './icons';
import { CAPPED_MAX_DIMENSION, type Caps, type Format, type Params, type Job } from '../state/queue';

const HINT_SEEN_KEY = 'compresso.dimensionsHintSeen';

function readHintSeen(): boolean {
  try { return localStorage.getItem(HINT_SEEN_KEY) === '1'; } catch { return false; }
}

/**
 * The console: everything you can change, in one band under the picture.
 *
 * There is no inspector rail. A rail turns the picture into a thumbnail beside
 * a form, and the picture is the whole point — so the controls sit below it, in
 * the order you'd reach for them, and the image keeps the room.
 */
export function Console({
  params, setParams, caps, selected, autoCapped,
}: { params: Params; setParams: (p: Params) => void; caps: Caps; selected: Job | null; autoCapped: boolean }) {
  const { t, percent, bytes } = useI18n();

  const formats: Option<Format>[] = [
    { value: 'auto', label: t('rail.auto') },
    ...(caps.avif ? [{ value: 'avif' as Format, label: 'AVIF' }] : []),
    { value: 'webp', label: 'WebP' },
    { value: 'jpeg', label: 'JPEG' },
    { value: 'png', label: 'PNG' },
  ];

  const [open, setOpen] = useState(false);
  const [hintSeen, setHintSeen] = useState(readHintSeen);
  const out = selected?.out ?? null;
  const grew = out ? out.savings < 0 : false;
  const set = <K extends keyof Params>(k: K, v: Params[K]) => setParams({ ...params, [k]: v });
  // A limit the user actually changed can never be hidden behind a fold —
  // but a cap applied only because the device/image warranted it (see
  // queue.ts's isLikelyLowEndAndroid/isLargeImage) is still a default, not
  // an edit, so it doesn't count as "set" for this purpose either.
  const sessionDefaultDim = autoCapped ? CAPPED_MAX_DIMENSION : null;
  const hasLimits = params.maxWidth !== sessionDefaultDim
    || params.maxHeight !== sessionDefaultDim
    || params.maxSizeMB != null;
  // An auto-applied default the user hasn't looked at yet gets a small hint
  // so it doesn't sit silently behind the fold; looking once is enough.
  const showHint = autoCapped && !hintSeen;

  const toggleOpen = () => {
    setOpen((v) => !v);
    if (!hintSeen) {
      setHintSeen(true);
      try { localStorage.setItem(HINT_SEEN_KEY, '1'); } catch { /* private mode */ }
    }
  };

  return (
    <div className="console">
      <Slider
        label={t('rail.quality')}
        value={params.quality}
        min={0.3} max={1} step={0.01}
        detent={0.8}
        display={percent(params.quality)}
        onChange={(v) => set('quality', v)}
      />

      <div className="console__row">
        <Tabs options={formats} value={params.format} onChange={(v) => set('format', v)} label={t('rail.format')} />
      </div>

      <div className="console__row">
        <button
          type="button"
          className="fold__toggle label"
          aria-expanded={open || hasLimits}
          onClick={toggleOpen}
        >
          <T k="rail.dimensions" />
          {showHint && (
            <>
              <span className="sr">{t('rail.dimensionsHint')}</span>
              <span className="fold__badge" aria-hidden="true" />
            </>
          )}
          <Chevron size={11} className="fold__caret" />
        </button>
      </div>

      {/* Size limits are the tool you reach for occasionally, so they stay folded
          away — one thing on screen at a time. The row expands rather than
          appearing, so nothing below it jumps. */}
      <div className={`fold ${open || hasLimits ? 'is-open' : ''}`}>
        <div className="fold__inner">
          <div className="console__row console__row--fields">
            <NumberField
              label={t('rail.maxWidth')} value={params.maxWidth}
              placeholder={t('rail.unset')} suffix="px" onChange={(v) => set('maxWidth', v)}
            />
            <NumberField
              label={t('rail.maxHeight')} value={params.maxHeight}
              placeholder={t('rail.unset')} suffix="px" onChange={(v) => set('maxHeight', v)}
            />
            <NumberField
              label={t('rail.maxSize')} value={params.maxSizeMB}
              placeholder={t('rail.unset')} suffix="MB" onChange={(v) => set('maxSizeMB', v)}
            />
          </div>
          {params.maxSizeMB != null && (
            <p className="fold__hint label"><T k="rail.maxSizeHint" /></p>
          )}
        </div>
      </div>

      {out && (
        <p className="console__readout mono">
          {params.format === 'auto' && <><span className="console__k">{out.format.toUpperCase()}</span> · </>}
          {out.width}×{out.height} · {bytes(out.compressedSize)}
        </p>
      )}

      {/* The one condition that gets the alert colour, anywhere in the app. */}
      {grew && params.format === 'png' && (
        <div className="alert" role="alert">
          <p className="alert__text"><T k="warn.inflated" /></p>
          <button type="button" className="alert__act" onClick={() => set('format', 'webp')}>
            <T k="warn.switchWebp" />
          </button>
        </div>
      )}
    </div>
  );
}
