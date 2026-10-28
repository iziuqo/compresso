import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { useI18n } from '../i18n';
import { font, motion, space, type, useTheme } from '../theme';
import { Form, Mail, Message, Shield } from './icons';
import { Label, T } from './primitives';

/**
 * The product in one picture, with no photo needed: a size that counts down
 * while its bar shrinks. Numbers are a typical phone photo going to the
 * Message preset. With Reduce Motion on it shows the end state.
 */
const FROM = 4_800_000;
const TO = 412_000;

export function SizeStory({ reduceMotion }: { reduceMotion: boolean }) {
  const { t, bytes, percent } = useI18n();
  const { c } = useTheme();
  const [p] = useState(() => new Animated.Value(0));
  const [counted, setShown] = useState(FROM);
  const shown = reduceMotion ? TO : counted;

  useEffect(() => {
    if (reduceMotion) {
      p.setValue(1);
      return;
    }
    const id = p.addListener(({ value }) => setShown(Math.round(FROM + (TO - FROM) * value)));
    const run = Animated.timing(p, {
      toValue: 1, duration: 1400, delay: 500, useNativeDriver: false,
      easing: Easing.bezier(...motion.easeEntrance),
    });
    run.start();
    return () => {
      run.stop();
      p.removeListener(id);
    };
  }, [reduceMotion, p]);

  const width = p.interpolate({ inputRange: [0, 1], outputRange: ['100%', `${(TO / FROM) * 100}%`] });
  const saved = percent(1 - TO / FROM);

  return (
    <View accessible accessibilityLabel={t('home.demo', { from: bytes(FROM), to: bytes(TO), percent: saved })}
      style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
      <View style={styles.row}>
        <Label>{t('job.before')}</Label>
        <T muted style={{ fontFamily: font.mono, fontSize: type.meta }}>{bytes(FROM)}</T>
      </View>
      <T style={styles.big} numberOfLines={1} adjustsFontSizeToFit>{bytes(shown)}</T>
      <View style={[styles.track, { backgroundColor: c.line }]}>
        <Animated.View style={[styles.fill, { width, backgroundColor: c.ink }]} />
      </View>
      <T muted style={{ fontSize: type.meta }}>{t('home.demoCaption', { percent: saved })}</T>
    </View>
  );
}

/** Intro card 1: a few photos fanned out, the way a selection feels. */
export function PhotoStack() {
  const { c } = useTheme();
  const tiles = [
    { r: '-8deg', x: -36, shade: c.surface2 },
    { r: '6deg', x: 36, shade: c.surface2 },
    { r: '0deg', x: 0, shade: c.surface },
  ];
  return (
    <View style={styles.stage} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {tiles.map((tile, i) => (
        <View key={i} style={[styles.tile, {
          backgroundColor: tile.shade, borderColor: c.line2,
          transform: [{ translateX: tile.x }, { rotate: tile.r }],
        }]}>
          <View style={[styles.sun, { borderColor: c.line2 }]} />
          <View style={[styles.hill, { backgroundColor: c.line }]} />
        </View>
      ))}
    </View>
  );
}

/** Intro card 2: the three most common reasons, as on the purpose screen. */
export function PurposeTrio() {
  const { t } = useI18n();
  const { c } = useTheme();
  const items = [
    { Glyph: Message, label: t('purpose.message.name') },
    { Glyph: Mail, label: t('purpose.email.name') },
    { Glyph: Form, label: t('purpose.upload.name') },
  ];
  return (
    <View style={[styles.stage, { flexDirection: 'row', gap: space[5] }]}
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {items.map(({ Glyph, label }) => (
        <View key={label} style={{ alignItems: 'center', gap: space[2], width: 88 }}>
          <View style={[styles.circle, { borderColor: c.line2, backgroundColor: c.surface }]}>
            <Glyph color={c.ink} size={28} />
          </View>
          <T muted style={{ fontSize: type.meta, textAlign: 'center' }} numberOfLines={2}>{label}</T>
        </View>
      ))}
    </View>
  );
}

/** Intro card 3: the promise, as a mark. */
export function ShieldMark() {
  const { c } = useTheme();
  return (
    <View style={styles.stage} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.circle, { width: 128, height: 128, borderRadius: 64, borderColor: c.line2, backgroundColor: c.surface }]}>
        <Shield color={c.ink} size={56} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: space[5], gap: space[3] },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  big: { fontFamily: font.mono, fontSize: 48, lineHeight: 56, letterSpacing: -1.5 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  stage: { height: 200, alignItems: 'center', justifyContent: 'center' },
  tile: {
    position: 'absolute', width: 120, height: 150, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  sun: { position: 'absolute', top: 24, right: 22, width: 22, height: 22, borderRadius: 11, borderWidth: 1.4 },
  hill: { position: 'absolute', left: -20, right: -20, bottom: -40, height: 90, borderRadius: 80 },
  circle: { width: 72, height: 72, borderRadius: 36, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
