import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useI18n, type Key } from '../i18n';
import { useApp } from '../state/app';
import { usePicker } from '../state/pick';
import { font, space, type, useTheme } from '../theme';
import { useReduceMotion } from '../ui/useReduceMotion';
import { PhotoStack, PurposeTrio, ShieldMark, SizeStory } from '../ui/Hero';
import { Gear, Mark, Shield } from '../ui/icons';
import { Ghost, IconButton, Pill, T, Title } from '../ui/primitives';
import { Screen } from '../ui/Screen';

export default function Home() {
  const { prefs, setPrefs } = useApp();
  if (!prefs.introSeen) return <Intro onDone={() => setPrefs({ introSeen: true })} />;
  return <Start />;
}

function Start() {
  const { t, bytes } = useI18n();
  const { c } = useTheme();
  const { prefs } = useApp();
  const reduceMotion = useReduceMotion();
  const { pick, busy } = usePicker(() => router.push('/purpose'));

  return (
    <Screen
      header={<>
        <View style={styles.brand} accessible accessibilityRole="header" accessibilityLabel="Compresso">
          <Mark color={c.ink} size={20} />
          <T style={{ fontFamily: font.semibold, fontSize: type.body, letterSpacing: -0.2 }}>Compresso</T>
        </View>
        <IconButton label={t('home.settings')} icon={<Gear color={c.ink} />} onPress={() => router.push('/settings')} />
      </>}
      footer={<Pill label={t('home.choose')} onPress={pick} busy={busy} />}
    >
      <View style={styles.hero}>
        <SizeStory reduceMotion={reduceMotion} />
        <Title style={{ fontSize: type.hero * 0.75, lineHeight: type.hero * 0.82, marginTop: space[5] }}>{t('home.title')}</Title>
        <T muted style={{ fontSize: type.lead, lineHeight: type.lead * 1.4 }}>{t('home.lede')}</T>
      </View>
      <View style={styles.meta}>
        <Shield color={c.ink2} size={20} />
        <T muted style={{ fontSize: type.meta, flex: 1 }}>{t('job.originalsSafe')}</T>
      </View>
      {prefs.lastSaved > 0 && (
        <T muted style={{ fontSize: type.meta, marginTop: space[3], fontFamily: font.mono }}>
          {t('home.recent', { amount: bytes(prefs.lastSaved) })}
        </T>
      )}
    </Screen>
  );
}

const INTRO: { title: Key; body: Key; Art: () => React.JSX.Element }[] = [
  { title: 'intro.1.title', body: 'intro.1.body', Art: PhotoStack },
  { title: 'intro.2.title', body: 'intro.2.body', Art: PurposeTrio },
  { title: 'intro.3.title', body: 'intro.3.body', Art: ShieldMark },
];

/** Three cards, skippable, shown once. Plain words, one idea each. */
function Intro({ onDone }: { onDone: () => void }) {
  const { t, count } = useI18n();
  const { c } = useTheme();
  const [step, setStep] = useState(0);
  const last = step === INTRO.length - 1;
  const { Art } = INTRO[step];
  return (
    <Screen
      header={<>
        <View style={styles.dots} accessible accessibilityLabel={`${count(step + 1)} / ${count(INTRO.length)}`}>
          {INTRO.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotOn, { backgroundColor: i === step ? c.ink : c.line2 }]} />
          ))}
        </View>
        {!last && <IconButton label={t('intro.skip')} icon={null} onPress={onDone} />}
      </>}
      footer={<Pill label={t(last ? 'intro.start' : 'intro.next')} onPress={() => (last ? onDone() : setStep(step + 1))} />}
    >
      <View style={styles.hero}>
        <Art />
        <Title style={{ marginTop: space[5] }}>{t(INTRO[step].title)}</Title>
        <T muted style={{ fontSize: type.lead, lineHeight: type.lead * 1.4 }}>{t(INTRO[step].body)}</T>
      </View>
      {step > 0 && <Ghost label={t('a11y.back')} onPress={() => setStep(step - 1)} style={{ alignSelf: 'flex-start' }} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, justifyContent: 'flex-end', gap: space[4], paddingTop: space[8], paddingBottom: space[6] },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 48 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 48 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOn: { width: 24 },
});
