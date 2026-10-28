import type { ReactNode } from 'react';
import { View } from 'react-native';

import { engine } from '../engine/host';
import { KB, MB } from '../engine/presets';
import type { Tweaks } from '../engine/recipes';
import type { MetadataPolicy, Recipe } from '../engine/types';
import { useI18n, type Key } from '../i18n';
import { space, type } from '../theme';
import { Choice, ChoiceRow, Label, T } from './primitives';

/**
 * The advanced settings, for every photo (Fine-tune) or one photo. Stepped
 * choices instead of sliders: easier to hit, easier to hear with a screen
 * reader, and every value is one a person would actually pick. Each group
 * starts with "Automatic", which leaves the field to the purpose (or, for one
 * photo, to the shared settings), so there is always a visible selection.
 */
const SIZES = [null, 2 * MB, 1 * MB, 500 * KB, 200 * KB];
const EDGES = [null, 4032, 2560, 1920, 1280];
const QUALITIES = [0.9, 0.8, 0.65, 0.5];
const METADATA: { value: MetadataPolicy; key: Key }[] = [
  { value: 'strip-location', key: 'fine.meta.stripLocation' },
  { value: 'keep', key: 'fine.meta.keep' },
  { value: 'strip', key: 'fine.meta.strip' },
];

export function RecipeControls({ value, onChange }: { value: Tweaks; onChange: (next: Tweaks) => void }) {
  const { t, bytes, count, percent } = useI18n();

  /** One group's choices: "Automatic" first, then each option. */
  function options<K extends keyof Recipe>(field: K, list: { v: Recipe[K]; label: string }[]) {
    const auto = !(field in value);
    const pick = (v?: Recipe[K]) => {
      const { [field]: _, ...rest } = value;
      onChange(v === undefined ? rest : { ...rest, [field]: v });
    };
    return [
      <Choice key="auto" label={t('fine.auto')} selected={auto} onPress={() => pick()} />,
      ...list.map(({ v, label }) => (
        <Choice key={label} label={label} selected={!auto && same(value[field], v)} onPress={() => pick(v)} />
      )),
    ];
  }

  return (
    <>
      <Group label={t('fine.size')}>
        {options('targetBytes', SIZES.map((v) => ({ v, label: v ? bytes(v) : t('fine.sizeNone') })))}
      </Group>
      <Group label={t('fine.edge')}>
        {options('maxLongEdge', EDGES.map((v) => ({ v, label: v ? `${count(v)} px` : t('fine.edgeNone') })))}
      </Group>
      <Group label={t('fine.quality')} hint={t('fine.qualityHint')}>
        {options('quality', QUALITIES.map((v) => ({ v, label: percent(v) })))}
      </Group>
      <Group label={t('fine.format')}>
        {options('formats', engine.formats().map((f) => ({ v: [f], label: f.toUpperCase() })))}
      </Group>
      <Group label={t('fine.metadata')}>
        {options('metadata', METADATA.map(({ value: v, key }) => ({ v, label: t(key) })))}
      </Group>
    </>
  );
}

/** Formats are a one-item list; everything else compares by value. */
const same = (a: unknown, b: unknown) => (Array.isArray(a) && Array.isArray(b) ? a[0] === b[0] : a === b);

function Group({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: space[3], marginTop: space[5] }}>
      <Label>{label}</Label>
      {hint && <T muted style={{ fontSize: type.meta, marginTop: -space[2] }}>{hint}</T>}
      <ChoiceRow>{children}</ChoiceRow>
    </View>
  );
}
