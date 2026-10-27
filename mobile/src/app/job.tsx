import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useI18n } from '../i18n';
import { useApp, type Item } from '../state/app';
import { saveToPhotos, share, tick } from '../state/save';
import { font, space, type, useTheme } from '../theme';
import { Compare } from '../ui/Compare';
import { Develop, useReduceMotion } from '../ui/Develop';
import { Check, Download, Share, Shield } from '../ui/icons';
import { Ghost, Label, Pill, T, Title } from '../ui/primitives';
import { Screen } from '../ui/Screen';

export default function JobScreen() {
  const { t, bytes, count, percent } = useI18n();
  const { c } = useTheme();
  const { job, cancel, clear, retry } = useApp();
  const reduceMotion = useReduceMotion();
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState<'idle' | 'busy' | 'done'>('idle');
  const announced = useRef(0);

  const items = job?.items ?? [];
  const finished = items.filter((it) => it.status === 'done' || it.status === 'failed').length;
  const doneItems = items.filter((it) => it.status === 'done' && it.outcome);
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

  if (!job) {
    return <Screen><T>{t('error.generic')}</T></Screen>;
  }

  const focus = items.find((it) => it.id === selected) ?? doneItems[0];
  const columns = width >= 700 ? 6 : 4;
  const cell = (Math.min(width, 640) - space[5] * 2 - (columns - 1) * space[1]) / columns;

  const startOver = () => {
    clear();
    router.replace('/');
  };

  const save = async () => {
    setSaving('busy');
    const result = await saveToPhotos(doneItems.map((it) => it.outcome!));
    if (result === 'denied') {
      setSaving('idle');
      Alert.alert(t('error.permission'));
      return;
    }
    setSaving('done');
  };

  return (
    <Screen
      header={<>
        <Label>{running ? t('job.working', { done: count(finished), total: count(items.length) }) : t('job.done')}</Label>
        {running && <Ghost label={t('job.cancel')} onPress={() => { cancel(); startOver(); }} style={{ minHeight: 44 }} />}
      </>}
      footer={running ? null : (
        <>
          <Pill
            label={saving === 'done' ? t('job.savedToPhotos') : doneItems.length > 1 ? t('job.saveAll') : t('job.save')}
            busy={saving === 'busy'} disabled={saving === 'done' || doneItems.length === 0} onPress={save}
            icon={saving === 'done' ? <Check color={c.pillInk} /> : <Download color={c.pillInk} />}
          />
          <View style={styles.row}>
            {focus?.outcome && (
              <Ghost label={t('job.share')} icon={<Share color={c.ink} />} style={{ flex: 1 }}
                onPress={() => share(focus.outcome!.uri)} />
            )}
            <Ghost label={t('job.again')} onPress={startOver} style={{ flex: 1 }} />
          </View>
        </>
      )}
    >
      <View style={{ gap: space[2], marginTop: space[4], marginBottom: space[5] }}>
        <Title style={{ fontSize: type.hero * 0.7, lineHeight: type.hero * 0.8, fontFamily: font.medium }}>
          {running ? t('job.soFar', { amount: bytes(saved) })
            : items.length === 1 ? t('job.savedOne', { amount: bytes(saved) }) : t('job.saved', { amount: bytes(saved) })}
        </Title>
        {original > 0 && (
          <T muted style={{ fontFamily: font.mono, fontSize: type.meta }}>
            {t('job.from', { from: bytes(original), to: bytes(now) })}  ·  −{percent(saved / original)}
          </T>
        )}
      </View>

      {!running && focus?.outcome && (
        <View style={{ marginBottom: space[5] }}>
          <Compare before={focus.source.uri} after={focus.outcome.uri}
            aspect={focus.outcome.width / focus.outcome.height} />
          <ItemNote item={focus} />
        </View>
      )}

      <View style={[styles.grid, { gap: space[1] }]}>
        {items.map((item, i) => (
          <Pressable key={item.id} onPress={() => setSelected(item.id)} disabled={item.status !== 'done'}
            accessibilityRole="button" accessibilityState={{ selected: focus?.id === item.id }}>
            <Develop item={item} size={cell} reduceMotion={reduceMotion}
              label={`${t('a11y.thumb', { n: count(i + 1), total: count(items.length) })}. ${statusText(item)}`} />
            {focus?.id === item.id && !running && <View style={[styles.ring, { borderColor: c.ink }]} />}
          </Pressable>
        ))}
      </View>

      {items.filter((it) => it.status === 'failed').map((it) => (
        <View key={it.id} style={[styles.failed, { borderColor: c.alert }]}>
          <T style={{ color: c.alert, flex: 1, fontSize: type.meta }}>{t('job.failed')}</T>
          <Ghost label={t('job.retry')} onPress={() => retry(it.id)} style={{ minHeight: 44 }} />
        </View>
      ))}

      <View style={styles.trust}>
        <Shield color={c.ink2} size={18} />
        <T muted style={{ fontSize: type.meta, flex: 1 }}>{t('job.neverBigger')} · {t('job.originalsSafe')}</T>
      </View>
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
    <View style={{ marginTop: space[3], gap: space[1] }}>
      <T style={{ fontFamily: font.mono, fontSize: type.meta }}>
        {t('job.from', { from: bytes(o.originalSize), to: bytes(o.size) })} · {o.width}×{o.height} · {o.format.toUpperCase()}
      </T>
      {note && <T muted style={{ fontSize: type.meta }}>{note}</T>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space[3] },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  ring: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderWidth: 2 },
  failed: { flexDirection: 'row', alignItems: 'center', gap: space[3], borderWidth: 1, borderRadius: 12, padding: space[3], marginTop: space[3] },
  trust: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[6] },
});
