import type { ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';

import { useI18n } from '../i18n';
import { font, space, target, type, useTheme } from '../theme';

/**
 * Text that scales with the system text size, capped at 2× so a single word
 * can't outgrow the screen. Layouts around it must grow, never clip.
 */
export function T({ style, muted, ...rest }: TextProps & { muted?: boolean }) {
  const { c } = useTheme();
  return (
    <Text maxFontSizeMultiplier={2} {...rest}
      style={[{ color: muted ? c.ink2 : c.ink, fontFamily: font.regular, fontSize: type.body, lineHeight: type.body * 1.35 }, style]} />
  );
}

/** The tracked uppercase label from the web app, 13pt here. Not uppercased in Chinese. */
export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { locale } = useI18n();
  const cjk = locale === 'zh-Hans';
  return (
    <T muted style={[{
      fontFamily: font.medium, fontSize: type.label, lineHeight: type.label * 1.4,
      letterSpacing: cjk ? 0.5 : 1.6, textTransform: cjk ? 'none' : 'uppercase',
    }, style]}>{children}</T>
  );
}

export function Title({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <T accessibilityRole="header"
      style={[{ fontFamily: font.medium, fontSize: type.title, lineHeight: type.title * 1.15, letterSpacing: -0.6 }, style]}>
      {children}
    </T>
  );
}

/** The one white pill per screen: the action you came to take. */
export function Pill({ label, onPress, busy, disabled, icon, style }: {
  label: string; onPress: () => void; busy?: boolean; disabled?: boolean; icon?: ReactNode; style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const off = disabled || busy;
  return (
    <Pressable onPress={onPress} disabled={off} accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      style={({ pressed }) => [styles.pill, { backgroundColor: c.pill, opacity: off ? 0.5 : pressed ? 0.82 : 1 }, style]}>
      {busy ? <ActivityIndicator color={c.pillInk} /> : icon}
      <T style={{ color: c.pillInk, fontFamily: font.semibold, fontSize: type.lead, lineHeight: type.lead * 1.25, textAlign: 'center' }}>
        {label}
      </T>
    </Pressable>
  );
}

/** A secondary action: outlined, same height as the pill, still a big target. */
export function Ghost({ label, onPress, icon, style }: {
  label: string; onPress: () => void; icon?: ReactNode; style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => [styles.pill, { borderWidth: 1, borderColor: c.line2, backgroundColor: pressed ? c.surface2 : 'transparent' }, style]}>
      {icon}
      <T style={{ fontFamily: font.medium, fontSize: type.body, textAlign: 'center' }}>{label}</T>
    </Pressable>
  );
}

/** Icon + word, at least 48×48. Used in headers. */
export function IconButton({ label, icon, onPress, showLabel = true }: {
  label: string; icon: ReactNode; onPress: () => void; showLabel?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={8}
      style={({ pressed }) => [styles.iconButton, pressed && { backgroundColor: c.surface2 }]}>
      {icon}
      {showLabel && <T style={{ fontSize: type.meta, fontFamily: font.medium }}>{label}</T>}
    </Pressable>
  );
}

export const Hairline = () => {
  const { c } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.line2 }} />;
};

const styles = StyleSheet.create({
  pill: {
    minHeight: target.primary, borderRadius: 999, paddingHorizontal: space[5], paddingVertical: space[3],
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2],
  },
  iconButton: {
    minHeight: target.min, minWidth: target.min, paddingHorizontal: space[2], borderRadius: 999,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2],
  },
});

/** One option in a set: a radio for screen readers, a chip to the eye. */
export function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={label}
      style={({ pressed }) => [{
        minHeight: target.min, paddingHorizontal: space[4], borderRadius: 999, justifyContent: 'center',
        borderWidth: 1, borderColor: selected ? c.ink : c.line2,
        backgroundColor: selected ? c.ink : pressed ? c.surface2 : 'transparent',
      }]}>
      <T style={{ color: selected ? c.void : c.ink, fontFamily: font.medium, fontSize: type.meta }}>{label}</T>
    </Pressable>
  );
}

export function ChoiceRow({ children }: { children: ReactNode }) {
  return <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>{children}</View>;
}
