import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState, type ComponentType } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { PURPOSES, type PurposeId } from '../engine/presets';
import { useI18n, type Key } from '../i18n';
import { useApp } from '../state/app';
import { font, space, target, type, useTheme } from '../theme';
import { Back, Form, Globe, Mail, Message, Sliders, Space } from '../ui/icons';
import { Choice, ChoiceRow, IconButton, Label, Pill, T, Title } from '../ui/primitives';
import { Screen } from '../ui/Screen';

const GLYPH: Record<PurposeId, ComponentType<{ color: string; size?: number }>> = {
  message: Message, email: Mail, upload: Form, space: Space, web: Globe,
};

export default function PurposeScreen() {
  const { t, count, bytes } = useI18n();
  const { c } = useTheme();
  const { selection, prefs, setPrefs, start, tweaks } = useApp();
  const [purpose, setPurpose] = useState<PurposeId>(prefs.lastPurpose);
  const one = selection.length === 1;
  const limits = PURPOSES.find((p) => p.id === 'upload')!.limits!;
  const tweaked = Object.keys(tweaks).length > 0;

  const go = () => {
    start(purpose);
    router.replace('/job');
  };

  return (
    <Screen
      header={<>
        <IconButton label={t('a11y.back')} showLabel={false} icon={<Back color={c.ink} />} onPress={() => router.back()} />
        <Label>{one ? t('purpose.countOne') : t('purpose.count', { n: count(selection.length) })}</Label>
        <View style={{ width: target.min }} />
      </>}
      footer={<Pill label={t(one ? 'purpose.goOne' : 'purpose.go')} onPress={go} />}
    >
      <FlatList
        horizontal data={selection} keyExtractor={(s) => s.uri} showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: space[1] }} style={{ marginHorizontal: -space[5], paddingLeft: space[5], flexGrow: 0 }}
        renderItem={({ item, index }) => (
          <Image source={{ uri: item.uri }} contentFit="cover" style={styles.film}
            accessibilityLabel={t('a11y.thumb', { n: count(index + 1), total: count(selection.length) })} />
        )}
      />

      <Title style={{ marginTop: space[6], marginBottom: space[4] }}>{t('purpose.title')}</Title>

      <View accessibilityRole="radiogroup" style={{ gap: space[2] }}>
        {PURPOSES.map((p) => {
          const Glyph = GLYPH[p.id];
          const selected = p.id === purpose;
          return (
            <Pressable key={p.id} onPress={() => setPurpose(p.id)} accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${t(`purpose.${p.id}.name` as Key)}. ${t(`purpose.${p.id}.hint` as Key)}`}
              style={({ pressed }) => [styles.card, {
                borderColor: selected ? c.ink : c.line,
                borderWidth: selected ? 2 : 1,
                backgroundColor: pressed ? c.surface2 : selected ? c.surface : 'transparent',
              }]}>
              <View style={[styles.glyph, { borderColor: selected ? c.ink : c.line2 }]}>
                <Glyph color={c.ink} size={24} />
              </View>
              <View style={{ flex: 1, gap: space[1] }}>
                <T style={{ fontFamily: font.semibold, fontSize: type.lead }}>{t(`purpose.${p.id}.name` as Key)}</T>
                <T muted style={{ fontSize: type.meta, lineHeight: type.meta * 1.35 }}>{t(`purpose.${p.id}.hint` as Key)}</T>
              </View>
              <View style={[styles.radio, { borderColor: selected ? c.ink : c.line2 }]}>
                {selected && <View style={[styles.radioDot, { backgroundColor: c.ink }]} />}
              </View>
            </Pressable>
          );
        })}
      </View>

      {purpose === 'upload' && (
        <View style={{ marginTop: space[5], gap: space[3] }}>
          <Label>{t('purpose.upload.limit')}</Label>
          <ChoiceRow>
            {[...limits].sort((a, b) => b - a).map((limit) => (
              <Choice key={limit} label={bytes(limit)} selected={prefs.uploadLimit === limit}
                onPress={() => setPrefs({ uploadLimit: limit })} />
            ))}
          </ChoiceRow>
        </View>
      )}

      <Pressable onPress={() => router.push('/fine-tune')} accessibilityRole="button" style={styles.fine}>
        <Sliders color={c.ink2} />
        <T muted style={{ fontFamily: font.medium, fontSize: type.meta }}>
          {t('purpose.fineTune')}{tweaked ? ' •' : ''}
        </T>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  film: { width: 72, height: 72, borderRadius: 2 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: space[4], padding: space[4],
    borderRadius: 16, minHeight: 80,
  },
  glyph: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
  fine: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: target.min, marginTop: space[4], alignSelf: 'flex-start' },
});
