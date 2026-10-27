import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, FlatList, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useI18n, type Key } from '../i18n';
import { useApp, type Item } from '../state/app';
import { canOpenLibrary, openLibrary, saveToPhotos, share, tick } from '../state/save';
import { font, space, type, useTheme } from '../theme';
import { Compare } from '../ui/Compare';
import { Develop, useReduceMotion } from '../ui/Develop';
import { Back, Check, Download, Gallery, Share, Shield, Sliders } from '../ui/icons';
import { Ghost, IconButton, Label, Pill, T, Title } from '../ui/primitives';
import { Screen } from '../ui/Screen';

/** Where saved photos end up, said the way each platform's gallery shows it. */
const WHERE: Key = Platform.OS === 'android' ? 'job.whereAndroid' : Platform.OS === 'ios' ? 'job.whereIos' : 'job.whereWeb';
const OPEN: Key = Platform.OS === 'android' ? 'job.openGallery' : 'job.openPhotos';

/**
 * One screen from "working" to "saved", laid out so nothing important needs a
 * scroll: what happened at the top, the preview in the middle taking whatever
 * height is left, the photo strip under it, and the next step pinned at the
 * bottom. Back, Fine-tune and Start over are always on screen with words.
 */
export default function JobScreen() {
  const { t, bytes, count, percent } = useI18n();
  const { c } = useTheme();
  const { job, cancel, clear, retry } = useApp();
  const reduceMotion = useReduceMotion();
  // Small phones give the photo the space: a smaller headline and strip.
  const short = useWindowDimensions().height < 720;
  const thumb = short ? 52 : 64;
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState<'idle' | 'busy' | 'done'>('idle');
  const [box, setBox] = useState({ w: 0, h: 0 });
  const announced = useRef(0);

  const items = job?.items ?? [];
  const finished = items.filter((it) => it.status === 'done' || it.status === 'failed').length;
  const doneItems = items.filter((it) => it.status === 'done' && it.outcome);
  const failed = items.filter((it) => it.status === 'failed');
  const running = job?.status === 'running';
  const original = doneItems.reduce((s, it) => s + it.outcome!.originalSize, 0);
  const now = doneItems.reduce((s, it) => s + it.outcome!.size, 0);
  const saved = Math.max(0, original - now);

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

  // A new run (from Fine-tune) starts unsaved, with fresh announcements.
  useEffect(() => {
    setSaving('idle');
    setSelected(null);
    announced.current = 0;
  }, [job?.id]);

  // Leaving by the system back gesture mid-run stops the work, like Back does.
  const runningRef = useRef(running);
  runningRef.current = running;
  useEffect(() => () => {
    if (runningRef.current) cancel();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!job) {
    return <Screen><T>{t('error.generic')}</T></Screen>;
  }

  // The preview follows the newest finished photo until the person picks one.
  const focus = items.find((it) => it.id === selected) ?? doneItems[doneItems.length - 1] ?? items.find((it) => it.status === 'running') ?? items[0];
  const single = items.length === 1;

  const startOver = () => {
    clear();
    router.dismissTo('/');
  };

  const save = async () => {
    setSaving('busy');
    try {
      const result = await saveToPhotos(doneItems.map((it) => it.outcome!));
      if (result === 'denied') {
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

  const open = async () => {
    if (!(await openLibrary())) Alert.alert(t(WHERE));
  };

  const headline = running ? t('job.soFar', { amount: bytes(saved) })
    : single ? t('job.savedOne', { amount: bytes(saved) }) : t('job.saved', { amount: bytes(saved) });
  const guide = running ? null
    : saving === 'done' ? t(WHERE)
    : doneItems.length === 0 ? t('job.noneDone')
    : t(single ? 'job.readyOne' : 'job.ready');

  const footer = running ? null : saving === 'done' ? (
    <>
      {canOpenLibrary
        ? <Pill label={t(OPEN)} icon={<Gallery color={c.pillInk} />} onPress={open} />
        : <Pill label={t('job.again')} onPress={startOver} />}
      <View style={styles.row}>
        {focus?.outcome && (
          <Ghost label={t('job.share')} icon={<Share color={c.ink} />} style={styles.half} onPress={() => share(focus.outcome!.uri)} />
        )}
        {canOpenLibrary && <Ghost label={t('job.again')} onPress={startOver} style={styles.half} />}
      </View>
    </>
  ) : (
    <>
      <Pill
        label={single ? t('job.save') : t('job.saveAll')}
        busy={saving === 'busy'} disabled={doneItems.length === 0} onPress={save}
        icon={<Download color={c.pillInk} />}
      />
      <View style={styles.row}>
        {focus?.outcome && (
          <Ghost label={t('job.share')} icon={<Share color={c.ink} />} style={styles.half} onPress={() => share(focus.outcome!.uri)} />
        )}
        <Ghost label={t('job.again')} onPress={startOver} style={styles.half} />
      </View>
    </>
  );

  const aspect = focus?.outcome ? focus.outcome.width / focus.outcome.height : (focus?.source.width ?? 1) / (focus?.source.height || 1);
  // Room under the photo for the Before/After legend and its size line.
  const legend = running ? 28 : 56;
  const fitW = Math.min(box.w, Math.max(0, box.h - legend) * aspect);

  return (
    <Screen
      fill
      header={<>
        <IconButton label={t('a11y.back')} icon={<Back color={c.ink} />} onPress={() => { if (running) cancel(); router.back(); }} />
        {running
          ? <Ghost label={t('job.cancel')} onPress={() => { cancel(); startOver(); }} style={{ minHeight: 44 }} />
          : <IconButton label={t('purpose.fineTune')} icon={<Sliders color={c.ink} />}
              onPress={() => router.push({ pathname: '/fine-tune', params: { redo: '1' } })} />}
      </>}
      footer={footer}
    >
      <View style={{ gap: space[1], marginTop: space[2], marginBottom: short ? space[3] : space[4] }}>
        {running && <Label>{t('job.working', { done: count(finished), total: count(items.length) })}</Label>}
        <Title style={{ fontSize: short ? type.title * 0.8 : type.title, lineHeight: (short ? type.title * 0.8 : type.title) * 1.1 }}>{headline}</Title>
        {original > 0 && (
          <T muted style={{ fontFamily: font.mono, fontSize: type.meta }}>
            {t('job.from', { from: bytes(original), to: bytes(now) })}  ·  −{percent(saved / original)}
          </T>
        )}
        {running && (
          <View style={[styles.track, { backgroundColor: c.line }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={[styles.bar, { backgroundColor: c.ink, width: `${(finished / items.length) * 100}%` }]} />
          </View>
        )}
        {guide && (
          <View style={[styles.guide, { backgroundColor: c.surface, borderColor: saving === 'done' ? c.ink : c.line }]}
            accessibilityLiveRegion="polite">
            {saving === 'done' ? <Check color={c.ink} size={20} /> : <Shield color={c.ink2} size={20} />}
            <T style={{ flex: 1, fontSize: type.meta, lineHeight: type.meta * 1.35 }}>{guide}</T>
          </View>
        )}
      </View>

      {items.length > 1 && (
        <View style={{ marginBottom: short ? space[3] : space[4], gap: space[2] }}>
          <Label>{t('job.pick')}</Label>
          <FlatList
            horizontal data={items} keyExtractor={(it) => it.id} showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: space[2], paddingRight: space[5] * 2, paddingVertical: 2 }}
            style={{ marginHorizontal: -space[5], paddingLeft: space[5], flexGrow: 0 }}
            renderItem={({ item, index }) => (
              <Pressable onPress={() => setSelected(item.id)} disabled={item.status !== 'done'}
                accessibilityRole="button" accessibilityState={{ selected: focus?.id === item.id }}>
                <Develop item={item} size={thumb} reduceMotion={reduceMotion}
                  label={`${t('a11y.thumb', { n: count(index + 1), total: count(items.length) })}. ${statusText(item)}`} />
                {focus?.id === item.id && <View style={[styles.ring, { borderColor: c.ink }]} />}
              </Pressable>
            )}
          />
        </View>
      )}

      {/* Grows into whatever height is left; the photo fits inside it. */}
      <View style={styles.preview} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {focus?.outcome && fitW > 0 ? (
          <View style={{ width: fitW }}>
            <Compare before={focus.source.uri} after={focus.outcome.uri} aspect={aspect} />
            {!running && <ItemNote item={focus} />}
          </View>
        ) : focus && fitW > 0 ? (
          <Develop item={focus} size={Math.min(fitW, box.h - legend)} reduceMotion={reduceMotion}
            label={`${t('a11y.thumb', { n: count(items.indexOf(focus) + 1), total: count(items.length) })}. ${statusText(focus)}`} />
        ) : null}
      </View>

      {failed.map((it) => (
        <View key={it.id} style={[styles.failed, { borderColor: c.alert }]}>
          <T style={{ color: c.alert, flex: 1, fontSize: type.meta }}>{t('job.failed')}</T>
          <Ghost label={t('job.retry')} onPress={() => retry(it.id)} style={{ minHeight: 44 }} />
        </View>
      ))}
    </Screen>
  );

  function statusText(item: Item): string {
    if (item.status === 'done' && item.outcome) {
      return t('job.from', { from: bytes(item.outcome.originalSize), to: bytes(item.outcome.size) });
    }
    if (item.status === 'failed') return t('job.failed');
    return percent(item.progress);
  }
}

function ItemNote({ item }: { item: Item }) {
  const { t, bytes } = useI18n();
  const o = item.outcome!;
  const note = o.kept ? t('job.kept') : o.missedTarget ? t('job.missed') : null;
  return (
    <View style={{ marginTop: space[1], gap: space[1] }}>
      <T muted style={{ fontFamily: font.mono, fontSize: type.label, textAlign: 'center' }}>
        {t('job.from', { from: bytes(o.originalSize), to: bytes(o.size) })} · {o.width}×{o.height} · {o.format.toUpperCase()}
      </T>
      {note && <T muted style={{ fontSize: type.meta, textAlign: 'center' }}>{note}</T>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  half: { flexGrow: 1, flexBasis: 120, minHeight: 48 },
  preview: { flex: 1, minHeight: 140, alignItems: 'center', justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, marginTop: space[2], overflow: 'hidden' },
  bar: { height: 4 },
  guide: { flexDirection: 'row', alignItems: 'center', gap: space[3], borderWidth: 1, borderRadius: 12, paddingHorizontal: space[3], paddingVertical: space[2], marginTop: space[3] },
  ring: { position: 'absolute', top: -2, right: -2, bottom: -2, left: -2, borderWidth: 2 },
  failed: { flexDirection: 'row', alignItems: 'center', gap: space[3], borderWidth: 1, borderRadius: 12, padding: space[3], marginTop: space[3] },
});
