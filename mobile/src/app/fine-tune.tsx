import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { engine } from '../engine/host';
import { KB, MB } from '../engine/presets';
import type { EncodeFormat, MetadataPolicy } from '../engine/types';
import { useI18n, type Key } from '../i18n';
import { useApp, useJob } from '../state/app';
import { space, type, useTheme } from '../theme';
import { Close } from '../ui/icons';
import { Choice, ChoiceRow, Ghost, IconButton, Label, Pill, T, Title } from '../ui/primitives';
import { Screen } from '../ui/Screen';

/**
 * Advanced settings, off the main path. Stepped choices instead of sliders:
 * easier to hit, easier to hear with a screen reader, and every value is one
 * a person would actually pick. Untouched fields keep the purpose's defaults.
 */
const SIZES = [null, 2 * MB, 1 * MB, 500 * KB, 200 * KB];
const EDGES = [null, 4032, 2560, 1920, 1280];
const QUALITIES: { q: number; key: string }[] = [
  { q: 0.9, key: '90' }, { q: 0.8, key: '80' }, { q: 0.65, key: '65' }, { q: 0.5, key: '50' },
];
const METADATA: { value: MetadataPolicy; key: Key }[] = [
  { value: 'strip-location', key: 'fine.meta.stripLocation' },
  { value: 'keep', key: 'fine.meta.keep' },
  { value: 'strip', key: 'fine.meta.strip' },
];

export default function FineTune() {
  const { t, bytes, count } = useI18n();
  const { c } = useTheme();
  const { tweaks, setTweaks, start } = useApp();
  const job = useJob();
  // Opened from a finished result: "Done" re-runs the same photos with the new settings.
  const { redo } = useLocalSearchParams<{ redo?: string }>();
  const rerun = redo === '1' && !!job;
  const done = () => {
    if (rerun) start(job!.purpose);
    router.back();
  };
  const formats = engine.formats();
  const set = (patch: Partial<typeof tweaks>) => setTweaks({ ...tweaks, ...patch });

  return (
    <Screen
      header={<>
        <Title style={{ fontSize: type.lead * 1.2 }}>{t('fine.title')}</Title>
        <IconButton label={t('settings.close')} showLabel={false} icon={<Close color={c.ink} />} onPress={() => router.back()} />
      </>}
      footer={<>
        <Pill label={t(rerun ? 'fine.redo' : 'fine.done')} onPress={done} />
        <Ghost label={t('fine.reset')} onPress={() => setTweaks({})} />
      </>}
    >
      <Group label={t('fine.size')}>
        {SIZES.map((s) => (
          <Choice key={String(s)} label={s ? bytes(s) : t('fine.sizeNone')}
            selected={'targetBytes' in tweaks && tweaks.targetBytes === s} onPress={() => set({ targetBytes: s })} />
        ))}
      </Group>
      <Group label={t('fine.edge')}>
        {EDGES.map((e) => (
          <Choice key={String(e)} label={e ? `${count(e)} px` : t('fine.edgeNone')}
            selected={'maxLongEdge' in tweaks && tweaks.maxLongEdge === e} onPress={() => set({ maxLongEdge: e })} />
        ))}
      </Group>
      <Group label={t('fine.quality')} hint={t('fine.qualityHint')}>
        {QUALITIES.map(({ q, key }) => (
          <Choice key={key} label={`${key}%`} selected={tweaks.quality === q} onPress={() => set({ quality: q })} />
        ))}
      </Group>
      <Group label={t('fine.format')}>
        {formats.map((f: EncodeFormat) => (
          <Choice key={f} label={f.toUpperCase()} selected={tweaks.formats?.[0] === f} onPress={() => set({ formats: [f] })} />
        ))}
      </Group>
      <Group label={t('fine.metadata')}>
        {METADATA.map(({ value, key }) => (
          <Choice key={value} label={t(key)} selected={tweaks.metadata === value} onPress={() => set({ metadata: value })} />
        ))}
      </Group>
    </Screen>
  );
}

function Group({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: space[3], marginTop: space[5] }}>
      <Label>{label}</Label>
      {hint && <T muted style={{ fontSize: type.meta, marginTop: -space[2] }}>{hint}</T>}
      <ChoiceRow>{children}</ChoiceRow>
    </View>
  );
}
