import Constants from 'expo-constants';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { LOCALE_LIST, LOCALES, useI18n, type Key } from '../i18n';
import { useApp } from '../state/app';
import type { Appearance } from '../state/prefs.types';
import { font, space, target, type, useTheme } from '../theme';
import { Check, Close } from '../ui/icons';
import { Choice, ChoiceRow, Hairline, IconButton, Label, T, Title } from '../ui/primitives';
import { Screen } from '../ui/Screen';

const APPEARANCES: { value: Appearance; key: Key }[] = [
  { value: 'system', key: 'settings.appearance.system' },
  { value: 'dark', key: 'settings.appearance.dark' },
  { value: 'light', key: 'settings.appearance.light' },
];

export default function Settings() {
  const { t, locale } = useI18n();
  const { c } = useTheme();
  const { prefs, setPrefs } = useApp();

  return (
    <Screen header={<>
      <Title style={{ fontSize: type.lead * 1.2 }}>{t('settings.title')}</Title>
      <IconButton label={t('settings.close')} icon={<Close color={c.ink} />} onPress={() => router.back()} />
    </>}>
      <Section label={t('settings.language')}>
        {/* Native name first, English beneath. Never flags: a flag is a country. */}
        <View accessibilityRole="radiogroup">
          {LOCALE_LIST.map((l, i) => {
            const selected = l === locale;
            return (
              <View key={l}>
                {i > 0 && <Hairline />}
                <Pressable onPress={() => setPrefs({ locale: l })} accessibilityRole="radio"
                  accessibilityState={{ selected }} accessibilityLanguage={l}
                  style={({ pressed }) => ({
                    minHeight: target.primary, flexDirection: 'row', alignItems: 'center', paddingVertical: space[2],
                    backgroundColor: pressed ? c.surface2 : 'transparent',
                  })}>
                  <View style={{ flex: 1 }}>
                    <T style={{ fontFamily: font.medium }}>{LOCALES[l].native}</T>
                    <T muted style={{ fontSize: type.meta }}>{LOCALES[l].english}</T>
                  </View>
                  {selected && <Check color={c.ink} />}
                </Pressable>
              </View>
            );
          })}
        </View>
      </Section>

      <Section label={t('settings.appearance')}>
        <ChoiceRow>
          {APPEARANCES.map(({ value, key }) => (
            <Choice key={value} label={t(key)} selected={prefs.appearance === value}
              onPress={() => setPrefs({ appearance: value })} />
          ))}
        </ChoiceRow>
      </Section>

      <Section label={t('settings.privacy')}>
        <T>{t('settings.privacyBody')}</T>
      </Section>

      <Section label={t('settings.about')}>
        <T>{t('settings.version', { v: Constants.expoConfig?.version ?? '' })}</T>
        <T muted style={{ fontSize: type.meta }}>{t('settings.openSource')}</T>
      </Section>
    </Screen>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: space[3], marginTop: space[6] }}>
      <Label>{label}</Label>
      {children}
    </View>
  );
}
