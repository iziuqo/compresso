import { useEffect, useState } from 'react';
import { useI18n, T } from '../i18n';
import { useTrailingLight } from './primitives';

/**
 * A phone has no cursor to drop with and no ⌘V to paste from, so the empty
 * state doesn't describe gestures the device can't perform. `pointer: coarse`
 * is the honest test — it asks about the input, not about the screen width, so
 * a small window on a laptop still gets the desktop copy and a tablet doesn't.
 */
function useCoarsePointer() {
  const [coarse, setCoarse] = useState(
    () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
  );
  useEffect(() => {
    const mq = matchMedia('(pointer: coarse)');
    const on = () => setCoarse(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return coarse;
}

export function Empty({
  onFiles, dragging,
}: { onFiles: (files: File[]) => void; dragging: boolean }) {
  const { t } = useI18n();
  const stage = useTrailingLight<HTMLDivElement>(true);
  const touch = useCoarsePointer();
  const isMac = typeof navigator !== 'undefined' && /Mac|iP(hone|ad)/.test(navigator.platform);

  return (
    <div className={`empty ${dragging ? 'is-over' : ''}`} ref={stage}>
      <span className="empty__light" aria-hidden="true" />
      <span className="empty__edge" aria-hidden="true" />

      <div className="empty__body">
        <h1 className="empty__title"><T k="empty.title" /></h1>
        <p className="empty__lede"><T k={touch ? 'empty.ledeTouch' : 'empty.lede'} /></p>

        <label className="pill pill--lg">
          <T k={touch ? 'empty.ctaTouch' : 'empty.cta'} />
          <input
            type="file" multiple accept="image/*,.heic,.heif" className="sr"
            onChange={(e) => { onFiles([...(e.target.files ?? [])]); e.target.value = ''; }}
          />
        </label>

        <p className="empty__hint label">
          {touch
            ? <T k="empty.hintTouch" />
            : <T k="empty.hint" vars={{ key: isMac ? '⌘V' : 'Ctrl+V' }} />}
        </p>
      </div>

      <p className="empty__formats mono" aria-label={t('empty.formats')}>
        <T k="empty.formats" />
      </p>
    </div>
  );
}
