import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, Alert, FlatList, PixelRatio, Platform, Pressable, StyleSheet, useWindowDimensions, View,
  type LayoutChangeEvent,
} from 'react-native';

import { useI18n, type Key } from '../i18n';
import { useApp, useJob, type Item, type Job } from '../state/app';
import { canOpenLibrary, openLibrary, saveToPhotos, share, tick } from '../state/save';
import { font, space, type, useTheme } from '../theme';
import { Compare } from '../ui/Compare';
import { Develop } from '../ui/Develop';
import { Back, Check, Download, Gallery, Share, Shield, Sliders } from '../ui/icons';
import { Ghost, IconButton, Label, Pill, strip, T, Title } from '../ui/primitives';
import { Screen } from '../ui/Screen';
import { useReduceMotion } from '../ui/useReduceMotion';

/** Where saved photos end up, said the way each platform's gallery shows it. */
const WHERE: Key = Platform.OS === 'android' ? 'job.whereAndroid' : Platform.OS === 'ios' ? 'job.whereIos' : 'job.whereWeb';

type Saving = 'idle' | 'busy' | 'done';

/**
 * One screen from "working" to "saved", laid out so nothing important needs a
 * scroll: what happened at the top, the photo strip, the preview taking
 * whatever height is left, and the next step pinned at the bottom. Back,
 * Fine-tune and Start over are always on screen, with words.
 *
 * The preview holds still: it shows the photo the person picked, else the
 * first one to finish, and never jumps to each newly finished photo.
 */
export default function JobScreen() {
  const { t } = useI18n();
  const job = useJob();
  if (!job) return <Screen><T>{t('error.generic')}</T></Screen>;
  // Keyed by run, so a redo from Fine-tune starts with fresh local state.
  return <JobView key={job.id} job={job} />;
}

function JobView({ job }: { job: Job }) {
  const { t, bytes, count, percent } = useI18n();
  const { c } = useTheme();
  const { cancel, clear, retry } = useApp();
  const reduceMotion = useReduceMotion();
  const short = useWindowDimensions().height < 720; // small phones give the photo the space
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState<Saving>('idle');
  const announced = useRef(0);

  const { items } = job;
  const running = job.status === 'running';
  const finished = items.filter((it) => it.status === 'done' || it.status === 'failed').length;
  const doneItems = items.filter((it) => it.status === 'done' && it.outcome);
  const failed = items.filter((it) => it.status === 'failed');
  const original = doneItems.reduce((s, it) => s + it.outcome!.originalSize, 0);
  const now = doneItems.reduce((s, it) => s + it.outcome!.size, 0);
  const saved = Math.max(0, original - now);
  const single = items.length === 1;

  // A tick per finished photo; a spoken update every quarter and at the end.
  useEffect(() => {
    if (finished === 0) return;
    tick();
    const quarter = Math.floor((finished / items.length) * 4);
    if (quarter > announced.current) {
      announced.current = quarter;
      AccessibilityInfo.announceForAccessibility(
        finished === items.length ? t('job.saved', { amount: bytes(saved) }) : t('a11y.progress', { percent: percent(finished / items.length) }),
      );
    }
  }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps

  // Leaving by the system back gesture mid-run stops the work, like Back does.
  const runningRef = useRef(running);
  useEffect(() => {
    runningRef.current = running;
  }, [running]);
  useEffect(() => () => {
    if (runningRef.current) cancel();
  }, [cancel]);

  const focus = items.find((it) => it.id === selected) ?? doneItems[0] ?? items[0];

  const startOver = () => {
    clear();
    router.dismissTo('/');
  };

  const back = () => {
    if (running) cancel();
    router.back();
  };

  const save = async () => {
    setSaving('busy');
    try {
      if (await saveToPhotos(doneItems.map((it) => it.outcome!)) === 'denied') {
        setSaving('idle');
        Alert.alert(t('error.permission'));
        return;
      }
      setSaving('done');
      AccessibilityInfo.announceForAccessibility(t(WHERE));
    } catch {
      setSaving('idle');
      Alert.alert(t('error.generic'));
    }
  };

  const open = () => {
    if (!openLibrary()) Alert.alert(t(WHERE));
  };

  const headline = running ? t('job.soFar', { amount: bytes(saved) })
    : t(single ? 'job.savedOne' : 'job.saved', { amount: bytes(saved) });
  const guide = running ? t('job.working', { done: count(finished), total: count(items.length) })
    : saving === 'done' ? t(WHERE)
    : doneItems.length === 0 ? t('job.noneDone')
    : t(single ? 'job.readyOne' : 'job.ready');

  // The footer is the same height in every state, so the preview never
  // resizes when the run ends. While working: Save (waiting) and Cancel.
  // Before saving: Save, then Share / Start over. After: Open Gallery where
  // the platform can, otherwise Start over becomes the main action.
  const afterSave = saving === 'done';
  const primary = !afterSave
    ? <Pill label={t(single ? 'job.save' : 'job.saveAll')} busy={saving === 'busy'} disabled={running || doneItems.length === 0}
        onPress={save} icon={<Download color={c.pillInk} />} />
    : canOpenLibrary
      ? <Pill label={t('job.openGallery')} icon={<Gallery color={c.pillInk} />} onPress={open} />
      : <Pill label={t('job.again')} onPress={startOver} />;
  const footer = (
    <>
      {primary}
      <View style={styles.row}>
        {running
          ? <Ghost compact label={t('job.cancel')} style={styles.half} onPress={() => { cancel(); startOver(); }} />
          : <>
              {focus.outcome && (
                <Ghost compact label={t('job.share')} icon={<Share color={c.ink} />} style={styles.half} onPress={() => share(focus.outcome!.uri)} />
              )}
              {(!afterSave || canOpenLibrary) && <Ghost compact label={t('job.again')} onPress={startOver} style={styles.half} />}
            </>}
      </View>
    </>
  );

  const titleSize = short ? type.title * 0.8 : type.title;
  // Two lines of text, whichever message the box holds, at the system text size.
  const guideHeight = space[2] * 2 + type.meta * 1.35 * 2 * Math.min(PixelRatio.getFontScale(), 2);
  const gap = short ? space[3] : space[4];
  const describe = (item: Item, i: number) => `${t('a11y.thumb', { n: count(i + 1), total: count(items.length) })}. ${
    item.status === 'done' && item.outcome ? t('job.from', { from: bytes(item.outcome.originalSize), to: bytes(item.outcome.size) })
      : item.status === 'failed' ? t('job.failed') : percent(item.progress)}`;

  return (
    <Screen
      fill
      header={<>
        <IconButton label={t('a11y.back')} icon={<Back color={c.ink} />} onPress={back} />
        {!running && <IconButton label={t('purpose.fineTune')} icon={<Sliders color={c.ink} />}
          onPress={() => router.push({ pathname: '/fine-tune', params: { redo: '1' } })} />}
      </>}
      footer={footer}
    >
      {/* Same rows in every state (headline, sizes, one status box), so nothing below moves. */}
      <View style={{ gap: space[1], marginTop: space[2], marginBottom: gap }}>
        <Title numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: titleSize, lineHeight: titleSize * 1.15 }}>{headline}</Title>
        <T muted style={{ fontFamily: font.mono, fontSize: type.meta }}>
          {original > 0 ? `${t('job.from', { from: bytes(original), to: bytes(now) })}  ·  −${percent(saved / original)}` : ' '}
        </T>
        <View style={[styles.guide, { backgroundColor: c.surface, borderColor: afterSave ? c.ink : c.line, minHeight: guideHeight }]}
          accessibilityLiveRegion="polite">
          {afterSave ? <Check color={c.ink} size={20} /> : <Shield color={c.ink2} size={20} />}
          <View style={{ flex: 1, gap: space[2] }}>
            <T style={{ fontSize: type.meta, lineHeight: type.meta * 1.35 }}>{guide}</T>
            {running && (
              <View style={[styles.track, { backgroundColor: c.line }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <View style={[styles.bar, { backgroundColor: c.ink, width: `${(finished / items.length) * 100}%` }]} />
              </View>
            )}
          </View>
        </View>
      </View>

      {!single && (
        <View style={{ marginBottom: gap, gap: space[2] }}>
          <Label>{t('job.pick')}</Label>
          <Strip items={items} focusId={focus.id} size={short ? 52 : 64} reduceMotion={reduceMotion}
            onPick={setSelected} describe={describe} />
        </View>
      )}

      <Preview item={focus} label={describe(focus, items.indexOf(focus))} reduceMotion={reduceMotion} />

      {failed.map((it) => (
        <View key={it.id} style={[styles.failed, { borderColor: c.alert }]}>
          <T style={{ color: c.alert, flex: 1, fontSize: type.meta }}>{t('job.failed')}</T>
          <Ghost compact label={t('job.retry')} onPress={() => retry(it.id)} />
        </View>
      ))}
    </Screen>
  );
}

/** Thumbnails in one row: always on screen, tap one to preview it. */
function Strip({ items, focusId, size, reduceMotion, onPick, describe }: {
  items: Item[]; focusId: string; size: number; reduceMotion: boolean;
  onPick: (id: string) => void; describe: (item: Item, i: number) => string;
}) {
  const { c } = useTheme();
  return (
    <FlatList
      horizontal data={items} keyExtractor={(it) => it.id} showsHorizontalScrollIndicator={false}
      contentContainerStyle={strip.content} style={strip.list}
      renderItem={({ item, index }) => (
        <Pressable onPress={() => onPick(item.id)} disabled={item.status !== 'done'}
          accessibilityRole="button" accessibilityState={{ selected: focusId === item.id }}>
          <Develop item={item} width={size} reduceMotion={reduceMotion} label={describe(item, index)} />
          {focusId === item.id && <View style={[styles.ring, { borderColor: c.ink }]} />}
        </Pressable>
      )}
    />
  );
}

/**
 * Fills the height left over and fits the photo inside it. Its size depends
 * only on the screen's layout, never on what it shows, so it can't feed back
 * into itself. Room is kept under a finished photo for its size line (and the
 * "kept" / "missed" note), scaled with the system text size.
 */
function Preview({ item, label, reduceMotion }: { item: Item; label: string; reduceMotion: boolean }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setBox((b) => (b.w === w && b.h === h ? b : { w, h }));
  };
  const o = item.outcome;
  const aspect = o ? o.width / o.height : item.source.width > 0 && item.source.height > 0 ? item.source.width / item.source.height : 1;
  const scale = Math.min(PixelRatio.getFontScale(), 2);
  const caption = !o ? 0
    : space[1] + type.label * 1.4 * scale + (o.kept || o.missedTarget ? space[1] + type.meta * 1.35 * scale * 2 : 0);
  const w = Math.min(box.w, Math.max(0, box.h - caption) * aspect);

  return (
    <View style={styles.preview} onLayout={onLayout}>
      {/* Absolutely placed, so what's shown can never size the box. */}
      <View style={styles.fit}>
        {w > 0 && (o
          ? <View style={{ width: w }}><Compare before={item.source.uri} after={o.uri} aspect={aspect} /><ItemNote item={item} /></View>
          : <Develop item={item} width={w} height={w / aspect} reduceMotion={reduceMotion} label={label} badge={false} />)}
      </View>
    </View>
  );
}

function ItemNote({ item }: { item: Item }) {
  const { t, bytes } = useI18n();
  const o = item.outcome!;
  const note = o.kept ? t('job.kept') : o.missedTarget ? t('job.missed') : null;
  return (
    <View style={{ marginTop: space[1], gap: space[1] }}>
      <T muted numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: font.mono, fontSize: type.label, textAlign: 'center' }}>
        {t('job.from', { from: bytes(o.originalSize), to: bytes(o.size) })} · {o.width}×{o.height} · {o.format.toUpperCase()}
      </T>
      {note && <T muted numberOfLines={2} style={{ fontSize: type.meta, textAlign: 'center' }}>{note}</T>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  half: { flexGrow: 1, flexBasis: 120 },
  preview: { flex: 1, minHeight: 120 },
  fit: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  bar: { height: 4 },
  guide: {
    flexDirection: 'row', alignItems: 'center', gap: space[3], borderWidth: 1, borderRadius: 12,
    paddingHorizontal: space[3], paddingVertical: space[2], marginTop: space[3],
  },
  ring: { position: 'absolute', top: -2, right: -2, bottom: -2, left: -2, borderWidth: 2 },
  failed: { flexDirection: 'row', alignItems: 'center', gap: space[3], borderWidth: 1, borderRadius: 12, padding: space[3], marginTop: space[3] },
});
