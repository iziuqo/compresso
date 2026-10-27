import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

import type { Item } from '../state/app';
import { motion, useTheme } from '../theme';
import { Check } from './icons';

/**
 * A thumbnail that develops: the blur resolving as progress climbs *is* the
 * progress indicator, as on the web. When it lands it settles 2pt upward.
 * With Reduce Motion on, there is no blur or movement, only a fade.
 */
export function Develop({ item, size, label, reduceMotion }: {
  item: Item; size: number; label: string; reduceMotion: boolean;
}) {
  const { c } = useTheme();
  const lift = useRef(new Animated.Value(0)).current;
  const done = item.status === 'done';

  useEffect(() => {
    if (!done || reduceMotion) return;
    Animated.timing(lift, {
      toValue: -2, duration: motion.entrance, useNativeDriver: true,
      easing: Easing.bezier(...motion.easeEntrance),
    }).start();
  }, [done, reduceMotion, lift]);

  const blur = done || reduceMotion ? 0 : Math.round((1 - item.progress) * 18);
  const dim = item.status === 'queued' ? 0.45 : item.status === 'failed' ? 0.3 : 1;
  return (
    <Animated.View accessible accessibilityLabel={label}
      style={{ width: size, height: size, transform: [{ translateY: lift }] }}>
      <Image source={{ uri: item.outcome?.uri ?? item.source.uri }} contentFit="cover" blurRadius={blur}
        style={[StyleSheet.absoluteFill, { opacity: dim }]} transition={reduceMotion ? 0 : motion.standard} />
      {done && (
        <View style={[styles.badge, { backgroundColor: c.void }]}>
          <Check color={c.ink} size={14} />
        </View>
      )}
    </Animated.View>
  );
}

export function useReduceMotion(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setOn);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setOn);
    return () => sub.remove();
  }, []);
  return on;
}

const styles = StyleSheet.create({
  badge: { position: 'absolute', right: 4, bottom: 4, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
