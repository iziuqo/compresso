import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState, type ComponentType } from 'react';
import { AccessibilityInfo, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { PURPOSES, type PurposeId } from '../engine/presets';
import { useI18n, type Key } from '../i18n';
import { useApp, type SelectionSnapshot } from '../state/app';
import { usePicker } from '../state/pick';
import { font, space, target, type, useTheme } from '../theme';
import { Back, Close, Form, Globe, Mail, Message, Plus, Sliders, Space, Trash } from '../ui/icons';
import { Choice, ChoiceRow, Ghost, IconButton, Label, Pill, strip, T, Title } from '../ui/primitives';
import { Screen } from '../ui/Screen';

const GLYPH: Record<PurposeId, ComponentType<{ color: string; size?: number }>> = {
  message: Message, email: Mail, upload: Form, space: Space, web: Globe,
};

export default function PurposeScreen() {
  const { t, count, bytes } = useI18n();
  const { c } = useTheme();
  const { selection, prefs, setPrefs, start, tweaks, own, remove, clearSelection, restoreSelection } = useApp();
  // What Clear took, kept until the list has photos again, so Undo can put it back.
  const [cleared, setCleared] = useState<SelectionSnapshot | null>(null);
  const { pick: add, busy: adding } = usePicker(() => setCleared(null), { append: true });
  const [purpose, setPurpose] = useState<PurposeId>(prefs.lastPurpose);
  const one = selection.length === 1;
  const empty = selection.length === 0;
  const limits = PURPOSES.find((p) => p.id === 'upload')!.limits!;
  const tweaked = Object.keys(tweaks).length > 0;

  // Clearing is one tap with an Undo, not an "Are you sure?": nothing is lost
  // (the originals stay in the library), and a confirm on every clear trains
  // people to tap through it. The Undo stays until photos are added or the
  // screen is left, never on a timer, so nobody has to race it.
  const clearAll = () => {
    setCleared({ selection, own });
    clearSelection();
    AccessibilityInfo.announceForAccessibility(t('purpose.cleared'));
  };
  const undo = () => {
    if (cleared) restoreSelection(cleared);
    setCleared(null);
  };

  const go = () => {
    start(purpose);
    router.push('/job');
  };

  // Back and Fine-tune are words in the header, so they never scroll away.
  return (
    <Screen
      header={<>
        <IconButton label={t('a11y.back')} icon={<Back color={c.ink} />} onPress={() => router.back()} />
        <IconButton label={t('purpose.fineTune') + (tweaked ? ' •' : '')} icon={<Sliders color={c.ink} />}
          onPress={() => router.push('/fine-tune')} />
      </>}
      footer={<Pill label={t(one ? 'purpose.goOne' : 'purpose.go')} onPress={go} disabled={empty} />}
    >
      <View style={styles.countRow}>
        <View accessibilityLiveRegion="polite" style={{ flex: 1 }}>
          <Label>{empty ? t('purpose.countNone') : one ? t('purpose.countOne') : t('purpose.count', { n: count(selection.length) })}</Label>
        </View>
        {!empty && (
          <Pressable onPress={clearAll} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('purpose.clearAll')}
            style={({ pressed }) => [styles.clear, pressed && { backgroundColor: c.surface2 }]}>
            <Trash color={c.ink} size={18} />
            <T style={{ fontFamily: font.medium, fontSize: type.meta }}>{t('purpose.clear')}</T>
          </Pressable>
        )}
      </View>
      {empty && cleared ? (
        <View style={[styles.undo, { borderColor: c.line2, backgroundColor: c.surface }]}>
          <T style={{ flex: 1, fontSize: type.meta, lineHeight: type.meta * 1.35 }}>{t('purpose.cleared')}</T>
          <Ghost compact label={t('purpose.undo')} onPress={undo} />
        </View>
      ) : (
        <T muted style={{ fontSize: type.meta }}>{t(empty ? 'purpose.emptyHint' : 'purpose.tapPhoto')}</T>
      )}
      <FlatList
        horizontal data={selection} keyExtractor={(s) => s.uri} showsHorizontalScrollIndicator={false}
        contentContainerStyle={strip.content} style={[strip.list, { marginTop: space[2] }]}
        ListHeaderComponent={
          <Pressable onPress={add} disabled={adding} accessibilityRole="button" accessibilityLabel={t('purpose.addMore')}
            accessibilityState={{ busy: adding }}
            style={({ pressed }) => [styles.add, { borderColor: c.line2, backgroundColor: pressed ? c.surface2 : c.surface }]}>
            <Plus color={c.ink} size={20} />
            <T style={{ fontFamily: font.medium, fontSize: type.label }} numberOfLines={1}>{t('purpose.add')}</T>
          </Pressable>
        }
        renderItem={({ item, index }) => {
          const name = t('a11y.thumb', { n: count(index + 1), total: count(selection.length) });
          const custom = item.uri in own;
          return (
            <View style={styles.film}>
              <Pressable onPress={() => router.push({ pathname: '/photo', params: { uri: item.uri } })}
                accessibilityRole="button" accessibilityLabel={`${name}${custom ? `. ${t('a11y.ownSettings')}` : ''}`}
                accessibilityHint={t('purpose.tapPhoto')} style={({ pressed }) => [StyleSheet.absoluteFill, { opacity: pressed ? 0.7 : 1 }]}>
                <Image source={{ uri: item.uri }} contentFit="cover" recyclingKey={item.uri} style={StyleSheet.absoluteFill} />
                {custom && (
                  <View style={[styles.badge, styles.custom, { backgroundColor: c.void }]}>
                    <Sliders color={c.ink} size={14} />
                  </View>
                )}
              </Pressable>
              <Pressable onPress={() => { remove(item.uri); if (one) router.back(); }} hitSlop={10}
                accessibilityRole="button" accessibilityLabel={t('a11y.remove', { n: count(index + 1) })}
                style={({ pressed }) => [styles.badge, styles.remove, { backgroundColor: pressed ? c.surface2 : c.void, borderColor: c.line2 }]}>
                <Close color={c.ink} size={14} />
              </Pressable>
            </View>
          );
        }}
      />

      <Title style={{ fontSize: type.title * 0.85, lineHeight: type.title, marginTop: space[5], marginBottom: space[3] }}>
        {t('purpose.title')}
      </Title>

      <View accessibilityRole="radiogroup" style={{ gap: space[2] }}>
        {PURPOSES.map((p) => {
          const Glyph = GLYPH[p.id];
          const selected = p.id === purpose;
          return (
            <View key={p.id} style={[styles.card, {
              borderColor: selected ? c.ink : c.line,
              borderWidth: selected ? 2 : 1,
              backgroundColor: selected ? c.surface : 'transparent',
            }]}>
              <Pressable onPress={() => setPurpose(p.id)} accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${t(`purpose.${p.id}.name` as Key)}. ${t(`purpose.${p.id}.hint` as Key)}`}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.surface2 }]}>
                <View style={[styles.glyph, { borderColor: selected ? c.ink : c.line2 }]}>
                  <Glyph color={c.ink} size={22} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <T style={{ fontFamily: font.semibold, fontSize: type.lead, lineHeight: type.lead * 1.2 }}>{t(`purpose.${p.id}.name` as Key)}</T>
                  <T muted style={{ fontSize: type.meta, lineHeight: type.meta * 1.3 }}>{t(`purpose.${p.id}.hint` as Key)}</T>
                </View>
                <View style={[styles.radio, { borderColor: selected ? c.ink : c.line2 }]}>
                  {selected && <View style={[styles.radioDot, { backgroundColor: c.ink }]} />}
                </View>
              </Pressable>
              {/* The size limit opens inside the card you just tapped, not at the bottom of the page. */}
              {selected && p.id === 'upload' && (
                <View style={styles.limit}>
                  <Label>{t('purpose.upload.limit')}</Label>
                  <ChoiceRow>
                    {[...limits].sort((a, b) => b - a).map((limit) => (
                      <Choice key={limit} label={bytes(limit)} selected={prefs.uploadLimit === limit}
                        onPress={() => setPrefs({ uploadLimit: limit })} />
                    ))}
                  </ChoiceRow>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  film: { width: 72, height: 72, borderRadius: 2, overflow: 'hidden' },
  badge: { position: 'absolute', width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  remove: { top: 4, right: 4, borderWidth: StyleSheet.hairlineWidth },
  custom: { bottom: 4, left: 4 },
  // As tall as a photo, but as wide as the word needs ("Hinzufügen" is long).
  add: { height: 72, minWidth: 72, paddingHorizontal: space[3], borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: 8 },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: target.min },
  clear: {
    minHeight: target.min, paddingHorizontal: space[3], borderRadius: 999, marginRight: -space[3],
    flexDirection: 'row', alignItems: 'center', gap: space[2],
  },
  undo: {
    flexDirection: 'row', alignItems: 'center', gap: space[3], borderWidth: 1, borderRadius: 12,
    paddingLeft: space[4], paddingRight: space[2], paddingVertical: space[2],
  },
  card: { borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3], minHeight: 68 },
  limit: { gap: space[2], paddingHorizontal: space[4], paddingBottom: space[4] },
  glyph: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
});
