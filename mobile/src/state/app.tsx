import {
  createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode,
} from 'react';

import { concurrency, engine } from '../engine/host';
import { compressOne } from '../engine/plan';
import { allocateBudget, purposeById, type PurposeId } from '../engine/presets';
import type { Outcome, Recipe, Source } from '../engine/types';
import { loadPrefs, savePrefs } from './prefs';
import { DEFAULT_PREFS, type Prefs } from './prefs.types';

/**
 * The job state machine, ported from the web app's queue (state/queue.ts) and
 * stripped to what the phone flow needs: one job at a time, per-photo status,
 * partial failure, cancel, retry. Framework-free reducer, so the web app can
 * share it later.
 */

export type ItemStatus = 'queued' | 'running' | 'done' | 'failed';

export type Item = {
  id: string;
  source: Source;
  status: ItemStatus;
  progress: number;
  outcome?: Outcome;
  error?: string;
};

export type Job = {
  id: string;
  purpose: PurposeId;
  items: Item[];
  status: 'running' | 'done' | 'cancelled';
};

type Action =
  | { type: 'start'; job: Job }
  | { type: 'item'; id: string; patch: Partial<Item> }
  | { type: 'finish'; status: Job['status'] }
  | { type: 'clear' };

function reducer(job: Job | null, action: Action): Job | null {
  switch (action.type) {
    case 'start': return action.job;
    case 'clear': return null;
    case 'finish': return job && { ...job, status: action.status };
    case 'item':
      return job && {
        ...job,
        items: job.items.map((it) => (it.id === action.id ? { ...it, ...action.patch } : it)),
      };
  }
}

/** The recipe each photo gets: the purpose's, the person's tweaks, its budget share. */
export function recipesFor(purpose: PurposeId, sources: Source[], tweaks: Partial<Recipe>, uploadLimit: number): Recipe[] {
  const p = purposeById(purpose);
  const base: Recipe = { ...p.recipe, ...(purpose === 'upload' ? { targetBytes: uploadLimit } : {}), ...tweaks };
  if (p.totalBytes && tweaks.targetBytes === undefined) {
    const shares = allocateBudget(p.totalBytes, sources.map((s) => s.size));
    return shares.map((targetBytes) => ({ ...base, targetBytes }));
  }
  return sources.map(() => base);
}

type AppCtx = {
  prefs: Prefs;
  setPrefs: (patch: Partial<Prefs>) => void;
  selection: Source[];
  setSelection: (sources: Source[]) => void;
  tweaks: Partial<Recipe>;
  setTweaks: (tweaks: Partial<Recipe>) => void;
  job: Job | null;
  start: (purpose: PurposeId) => void;
  cancel: () => void;
  retry: (id: string) => void;
  clear: () => void;
};

const AppContext = createContext<AppCtx | null>(null);

let seq = 0;
const nextId = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`;

export function AppProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<Prefs>(() => ({ ...DEFAULT_PREFS, ...loadPrefs() }));
  const [selection, setSelection] = useState<Source[]>([]);
  const [tweaks, setTweaks] = useState<Partial<Recipe>>({});
  const [job, dispatch] = useReducer(reducer, null);
  const abort = useRef<AbortController | null>(null);
  const recipes = useRef(new Map<string, Recipe>());

  const setPrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...patch };
      savePrefs(next);
      return next;
    });
  }, []);

  const runItems = useCallback(async (items: Item[], signal: AbortSignal) => {
    const queue = [...items];
    const worker = async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        if (signal.aborted) return;
        const id = item.id;
        dispatch({ type: 'item', id, patch: { status: 'running', progress: 0, error: undefined } });
        try {
          const outcome = await compressOne(engine, item.source, recipes.current.get(id)!, {
            name: `${item.source.name}-compresso-${id}`,
            signal,
            onProgress: (progress) => dispatch({ type: 'item', id, patch: { progress } }),
          });
          dispatch({ type: 'item', id, patch: { status: 'done', progress: 1, outcome } });
        } catch (e) {
          if ((e as Error).name === 'AbortError') return;
          dispatch({ type: 'item', id, patch: { status: 'failed', error: (e as Error).message } });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  }, []);

  const start = useCallback((purpose: PurposeId) => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    const perItem = recipesFor(purpose, selection, tweaks, prefs.uploadLimit);
    const items: Item[] = selection.map((source) => ({ id: nextId(), source, status: 'queued', progress: 0 }));
    recipes.current = new Map(items.map((it, i) => [it.id, perItem[i]]));
    dispatch({ type: 'start', job: { id: nextId(), purpose, items, status: 'running' } });
    setPrefs({ lastPurpose: purpose });
    runItems(items, controller.signal).then(() => {
      if (!controller.signal.aborted) dispatch({ type: 'finish', status: 'done' });
    });
  }, [selection, tweaks, prefs.uploadLimit, runItems, setPrefs]);

  const cancel = useCallback(() => {
    abort.current?.abort();
    dispatch({ type: 'finish', status: 'cancelled' });
  }, []);

  const retry = useCallback((id: string) => {
    const item = job?.items.find((it) => it.id === id);
    if (!item) return;
    const controller = abort.current && !abort.current.signal.aborted ? abort.current : new AbortController();
    abort.current = controller;
    runItems([item], controller.signal);
  }, [job, runItems]);

  const clear = useCallback(() => {
    abort.current?.abort();
    dispatch({ type: 'clear' });
    setSelection([]);
    setTweaks({});
  }, []);

  // Remember the total for Home once a job finishes.
  useEffect(() => {
    if (job?.status !== 'done') return;
    const saved = job.items.reduce((sum, it) => sum + (it.outcome ? Math.max(0, it.outcome.originalSize - it.outcome.size) : 0), 0);
    setPrefs({ lastSaved: saved });
  }, [job?.status, job?.items, setPrefs]);

  const value = useMemo<AppCtx>(() => ({
    prefs, setPrefs, selection, setSelection, tweaks, setTweaks, job, start, cancel, retry, clear,
  }), [prefs, setPrefs, selection, tweaks, job, start, cancel, retry, clear]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppCtx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp outside AppProvider');
  return ctx;
}
