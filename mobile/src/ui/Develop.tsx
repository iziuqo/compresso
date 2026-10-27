import { Image } from 'expo-image';
import { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import type { Item } from '../state/app';
import { motion, useTheme } from '../theme';
import { Check } from './icons';

const BLUR = 18;

/**
 * A photo that develops: a blurred copy on top fades out as progress climbs,
 * and that fade *is* the progress indicator, as on the web. The blur radius
 * never changes, so each image is decoded once and progress only animates
 * opacity on the native driver (re-blurring per tick made the preview
 * flicker). When it lands it settles 2pt upward. With Reduce Motion on there
 * is no blur or movement, only the dimmed photo brightening.
 */
export const Develop = memo(function Develop({ item, width, height = width, label, reduceMotion, badge = true }: {
  item: Item; width: number; height?: number; label: string; reduceMotion: boolean; badge?: boolean;
}) {
  const { c } = useTheme();
  const done = item.status === 'done';
  const veil = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(veil, {
      toValue: done ? 0 : 1 - item.progress, duration: motion.standard, useNativeDriver: true,
      easing: Easing.bezier(...motion.easeStandard),
    }).start();
  }, [done, item.progress, veil]);

  useEffect(() => {
    if (!done || reduceMotion) return;
    Animated.timing(lift, {
      toValue: -2, duration: motion.entrance, useNativeDriver: true,
      easing: Easing.bezier(...motion.easeEntrance),
    }).start();
  }, [done, reduceMotion, lift]);

  const dim = item.status === 'queued' ? 0.45 : item.status === 'failed' ? 0.3 : 1;
  return (
    <Animated.View accessible accessibilityLabel={label}
      style={{ width, height, backgroundColor: c.surface, transform: [{ translateY: lift }] }}>
      <Image source={{ uri: item.source.uri }} contentFit="cover" recyclingKey={item.id}
        style={[StyleSheet.absoluteFill, { opacity: dim }]} />
      {!reduceMotion && !done && (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: veil }]}>
          <Image source={{ uri: item.source.uri }} contentFit="cover" blurRadius={BLUR} style={StyleSheet.absoluteFill} />
        </Animated.View>
      )}
      {done && badge && (
        <View style={[styles.badge, { backgroundColor: c.void }]}>
          <Check color={c.ink} size={14} />
        </View>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  badge: { position: 'absolute', right: 4, bottom: 4, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
