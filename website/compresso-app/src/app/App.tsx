import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { zipSync } from 'fflate';
import { T, useI18n } from '../i18n';
import { useQueue, isImage, type Job } from '../state/queue';
import { Grain, LangMenu, StatusBar, UpdateBar, Wordmark, useInstall, InstallChip } from '../ui/Chrome';
import { Empty } from '../ui/Empty';
import { Console } from '../ui/Console';
import { Compare, Result, Tile } from '../ui/Workspace';
import { Check, Close, Plus, Share } from '../ui/icons';

const extFor = (format: string) => (format === 'jpeg' ? 'jpg' : format);
const baseName = (name: string) => name.replace(/\.[^.]+$/, '');
const outName = (job: Job) => `${baseName(job.file.name)}.${extFor(job.out!.format)}`;

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A short, quiet haptic where the platform has one. iOS PWAs don't — and a
 *  simulated one is worse than none, so nothing is faked. */
const tap = (ms = 8) => { try { navigator.vibrate?.(ms); } catch { /* unsupported */ } };

export default function App() {
  const q = useQueue();
  const { t } = useI18n();
  const [dragging, setDragging] = useState(false);
  const [offline, setOffline] = useState(() => !navigator.onLine);
  const [updateReady, setUpdateReady] = useState(false);
  // idle → packing (zip work, which can take seconds) → done (briefly) → idle.
  // The pill carries all three, so feedback lives on the control you pressed.
  const [saveState, setSaveState] = useState<'idle' | 'packing' | 'done'>('idle');
  const [settleRun, setSettleRun] = useState(0);
  const stripRef = useRef<HTMLDivElement>(null);
  const install = useInstall();
  const dragDepth = useRef(0);
  const lastOver = useRef(0);

  /* -- global input: drop anywhere, paste anywhere ----------------------- */
  useEffect(() => {
    const over = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
      dragDepth.current++;
      lastOver.current = performance.now();
      setDragging(true);
    };
    const leave = (e: DragEvent) => {
      e.preventDefault();
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    };
    const move = (e: DragEvent) => { e.preventDefault(); lastOver.current = performance.now(); };
    const end = () => { dragDepth.current = 0; setDragging(false); };
    const drop = (e: DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      const files = [...(e.dataTransfer?.files ?? [])].filter(isImage);
      if (files.length) { tap(); void q.add(files); }
    };
    const paste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.items ?? [])]
        .filter((i) => i.kind === 'file' && i.type.startsWith('image/'))
        .map((i) => i.getAsFile())
        .filter((f): f is File => !!f);
      if (files.length) { e.preventDefault(); void q.add(files); }
    };
    /**
     * Drag state is not reliably closed by the browser: release the file outside
     * the window, or drag back out of it, and neither `drop` nor a final
     * `dragleave` necessarily arrives — leaving the veil up with no way to
     * dismiss it. `dragover` fires continuously while a drag is live, so a gap
     * in it is the only trustworthy signal that the drag is over.
     */
    const sweep = window.setInterval(() => {
      if (dragDepth.current > 0 && performance.now() - lastOver.current > 400) end();
    }, 200);

    window.addEventListener('dragenter', over);
    window.addEventListener('dragover', move);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    window.addEventListener('dragend', end);
    window.addEventListener('blur', end);
    window.addEventListener('paste', paste);
    return () => {
      window.clearInterval(sweep);
      window.removeEventListener('dragenter', over);
      window.removeEventListener('dragover', move);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop);
      window.removeEventListener('dragend', end);
      window.removeEventListener('blur', end);
      window.removeEventListener('paste', paste);
    };
  }, [q]);

  /* -- connection + service worker --------------------------------------- */
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
    let reg: ServiceWorkerRegistration | undefined;
    const base = import.meta.env.BASE_URL;
    // Scope drops the trailing slash so the worker also controls the bare
    // /compresso URL — prefix matching would otherwise leave it uncontrolled,
    // and that is the address people actually type. Requires the sw.js response
    // to carry `Service-Worker-Allowed: /compresso`.
    const scope = base === '/' ? '/' : base.replace(/\/$/, '');
    navigator.serviceWorker.register(`${base}sw.js`, { scope }).then((r) => {
      reg = r;
      // Never auto-activate: a batch in flight must not be killed by an update.
      r.addEventListener('updatefound', () => {
        r.installing?.addEventListener('statechange', function () {
          if (this.state === 'installed' && navigator.serviceWorker.controller) setUpdateReady(true);
        });
      });
    }).catch(() => {});
    return () => { void reg; };
  }, []);

  const applyUpdate = useCallback(() => {
    navigator.serviceWorker.getRegistration().then((r) => {
      r?.waiting?.postMessage({ type: 'SKIP_WAITING' });
      setTimeout(() => window.location.reload(), 120);
    });
  }, []);

  /* -- the batch landing: the highest-emotion moment in the product ---------
     When the last job settles, every figure in the strip resolves in sequence
     and the total lands behind it. It runs once per batch, not per file. */
  const settledOnce = useRef(false);
  useEffect(() => {
    if (q.totals.settled && q.totals.done > 0 && !settledOnce.current) {
      settledOnce.current = true;
      setSettleRun((n) => n + 1);
      tap(12);
    }
    if (!q.totals.settled) settledOnce.current = false;
  }, [q.totals.settled, q.totals.done]);

  /* -- output ------------------------------------------------------------ */
  const confirm = useCallback(() => {
    setSaveState('done');
    window.setTimeout(() => setSaveState('idle'), 1400);
  }, []);

  const saveOne = useCallback(() => {
    const job = q.selected;
    if (!job?.out) return;
    saveBlob(job.out.blob, outName(job));
    confirm();
  }, [q.selected, confirm]);

  const saveAll = useCallback(async () => {
    const ready = q.jobs.filter((j) => j.out);
    if (!ready.length) return;
    if (ready.length === 1) { saveBlob(ready[0].out!.blob, outName(ready[0])); confirm(); return; }

    // Zipping a large batch is seconds of work, so the pill says so while it
    // happens rather than going quiet and then claiming success.
    setSaveState('packing');
    // A macrotask, not a frame: requestAnimationFrame never fires in a
    // backgrounded tab, so switching away mid-zip would strand the button in
    // its working state forever. This only exists to let the state paint before
    // the synchronous zip blocks the thread.
    await new Promise((r) => setTimeout(r, 0));

    const entries: Record<string, Uint8Array> = {};
    const seen = new Map<string, number>();
    for (const job of ready) {
      let name = outName(job);
      const n = seen.get(name) ?? 0;
      seen.set(name, n + 1);
      if (n) name = `${baseName(name)}-${n + 1}.${extFor(job.out!.format)}`;
      entries[name] = new Uint8Array(await job.out!.blob.arrayBuffer());
    }
    // level 0: the payload is already-compressed image data — deflating it again
    // costs seconds and saves nothing.
    saveBlob(new Blob([zipSync(entries, { level: 0 })], { type: 'application/zip' }), 'compresso.zip');
    confirm();
  }, [q.jobs, confirm]);

  const shareFiles = useMemo(() => {
    return q.jobs.filter((j) => j.out).map((j) => new File([j.out!.blob], outName(j), { type: j.out!.mimeType }));
  }, [q.jobs]);

  const canShare = useMemo(() => {
    return typeof navigator.canShare === 'function' && shareFiles.length > 0 &&
      navigator.canShare({ files: shareFiles.slice(0, 1) });
  }, [shareFiles]);

  const share = useCallback(async () => {
    try { await navigator.share({ files: shareFiles }); } catch { /* dismissed */ }
  }, [shareFiles]);

  const hasJobs = q.jobs.length > 0;

  return (
    <div className={`app ${hasJobs ? 'is-working' : 'is-empty'} ${dragging ? 'is-dragging' : ''}`}>
      <Grain />

      {/* head and the update notice share one grid row, so the notice appearing
          never re-proportions the workspace beneath it */}
      <div className="top">
        <header className="head">
          <div className="head__left">{hasJobs && <Wordmark />}</div>
          <div className="head__right">
            {install.canInstall && <InstallChip onInstall={install.install} />}
            <LangMenu />
          </div>
        </header>
        {updateReady && <UpdateBar onReload={applyUpdate} />}
      </div>

      <main className="main">
        {!hasJobs ? (
          <Empty onFiles={(f) => { tap(); void q.add(f); }} dragging={dragging} />
        ) : (
          /* One column, picture first. No inspector rail — a rail turns the
             photograph into a thumbnail beside a form. */
          <div className="bench">
            <section className="viewer">
              {/* keyed by job, so moving between images fades rather than cuts */}
              {q.selected && <Compare key={q.selected.id} job={q.selected} />}
            </section>

            {q.totals.done > 0 && (
              <Result
                saved={q.totals.saved}
                fraction={q.totals.fraction}
                from={q.totals.original}
                to={q.totals.output}
                settled={q.totals.settled}
              />
            )}

            <Console
              params={q.params} setParams={q.setParams} caps={q.caps}
              selected={q.selected} autoCapped={q.autoCapped}
            />

            <div
              className={`strip ${settleRun ? 'is-settling' : ''}`}
              key={settleRun}
              role="listbox"
              aria-label={t('action.add')}
              ref={stripRef}
              onKeyDown={(e) => {
                if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
                e.preventDefault();
                const i = q.jobs.findIndex((j) => j.id === q.selectedId);
                const next = q.jobs[i + (e.key === 'ArrowRight' ? 1 : -1)];
                if (!next) return;
                q.setSelectedId(next.id);
                requestAnimationFrame(() =>
                  stripRef.current?.querySelector<HTMLElement>('.tile.is-selected .tile__hit')?.focus());
              }}
            >
              {q.jobs.map((job, i) => (
                <div className="strip__cell" role="option" aria-selected={job.id === q.selectedId} key={job.id} style={{ ['--i' as string]: Math.min(i, 11) }}>
                  <Tile
                    job={job}
                    selected={job.id === q.selectedId}
                    onSelect={() => q.setSelectedId(job.id)}
                    onRemove={() => q.remove(job.id)}
                    onRetry={() => q.retry(job.id)}
                  />
                </div>
              ))}
              <label className="strip__add">
                <Plus size={16} />
                <span className="sr">{t('action.add')}</span>
                <input
                  type="file" multiple accept="image/*,.heic,.heif" className="sr"
                  onChange={(e) => { void q.add([...(e.target.files ?? [])]); e.target.value = ''; }}
                />
              </label>
            </div>

            {/* ✕ · the one white pill · share — the whole action surface */}
            <div className="dock">
              <button type="button" className="dock__icon" onClick={q.clear} aria-label={t('action.clear')}>
                <Close />
              </button>

              <button
                type="button"
                className={`pill pill--stateful is-${saveState}`}
                onClick={q.jobs.length > 1 ? saveAll : saveOne}
                disabled={saveState === 'packing'}
              >
                <span className="pill__face pill__face--idle">
                  <T k={q.jobs.length > 1 ? 'action.saveZip' : 'action.save'} />
                </span>
                <span className="pill__face pill__face--packing" aria-hidden={saveState !== 'packing'}>
                  <T k="action.packing" />
                </span>
                <span className="pill__face pill__face--done" aria-hidden={saveState !== 'done'}>
                  <Check size={14} /><T k="action.done" />
                </span>
              </button>

              <button
                type="button" className="dock__icon"
                onClick={share} disabled={!canShare} aria-label={t('action.share')}
              >
                <Share />
              </button>
            </div>
          </div>
        )}
      </main>

      <StatusBar
        done={q.totals.done}
        total={q.totals.total}
        running={q.totals.running}
        poolSize={q.poolSize}
        offline={offline}
      />

      {/* dropping onto a working session needs its own answer — the empty state's
          edge hairline is not on screen any more */}
      <div className={`dropveil ${dragging && hasJobs ? 'is-on' : ''}`} aria-hidden={!dragging}>
        <span className="dropveil__label label"><T k="empty.drop" /></span>
      </div>
    </div>
  );
}
