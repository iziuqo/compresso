import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';

import { useI18n } from '../i18n';
import { motion, space, useTheme } from '../theme';
import { Drag } from './icons';
import { Label } from './primitives';

/**
 * Before / after with a draggable seam, ported from the web compare view.
 *
 * Each label lives on its own photo: "Before" inside the clipped left layer,
 * "After" on the layer beneath, so the seam slides over them and each label
 * is only ever shown on the side it names. The seam and knob sit above both.
 * "Drag to compare" sits under the knob it explains and fades out after the
 * first drag, leaving the bottom corners free for the screen's own controls.
 *
 * The seam follows the drag distance from where the finger went down, not
 * the touch's position inside the view: once a finger leaves the photo,
 * Android reports positions relative to other views, which threw the seam
 * back to the middle. Dragging drives an Animated value, not state, so the
 * seam follows the finger without re-rendering.
 *
 * For screen readers it is an adjustable control: swipe up or down moves the
 * seam in 10% steps, and the value is read out.
 */
export function Compare({ before, after, aspect }: { before: string; after: string; aspect: number }) {
  const { t, percent } = useI18n();
  const { c } = useTheme();
  const [width, setWidth] = useState(0);
  const [split, setSplit] = useState(0.5);
  const [x] = useState(() => new Animated.Value(0));
  const [hint] = useState(() => new Animated.Value(1));
  const widthRef = useRef(0);
  const splitRef = useRef(0.5);
  const grabbed = useRef(0.5);

  const move = (s: number) => {
    splitRef.current = clamp(s);
    x.setValue(splitRef.current * widthRef.current);
  };
  // The handlers read the refs on touch, never during render.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => {
      move(e.nativeEvent.locationX / (widthRef.current || 1));
      grabbed.current = splitRef.current;
      Animated.timing(hint, { toValue: 0, duration: motion.standard, useNativeDriver: true }).start();
    },
    onPanResponderMove: (_, g) => move(grabbed.current + g.dx / (widthRef.current || 1)),
    // State only on release, for the screen reader value.
    onPanResponderRelease: () => setSplit(splitRef.current),
    onPanResponderTerminate: () => setSplit(splitRef.current),
  }));
  const step = (d: number) => {
    move(splitRef.current + d);
    setSplit(splitRef.current);
  };

  // Each label keeps to its own half, so on a narrow photo they can't overlap.
  // In points, not %, because "Before" sits in the clipped layer, not the frame.
  const half = width / 2 - space[3];
  const onLayout = (e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
    x.setValue(splitRef.current * e.nativeEvent.layout.width);
    setWidth(e.nativeEvent.layout.width);
  };

  return (
    <View onLayout={onLayout} {...pan.panHandlers}
      accessible accessibilityRole="adjustable" accessibilityLabel={t('job.compare')}
      accessibilityValue={{ text: `${t('job.after')} ${percent(1 - split)}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? -0.1 : 0.1)}
      style={[styles.frame, { aspectRatio: aspect || 1, backgroundColor: c.surface }]}>
      {/* Nothing inside takes touches, so the whole frame is one drag target. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image source={{ uri: after }} contentFit="contain" style={StyleSheet.absoluteFill} />
        <Chip label={t('job.after')} style={[styles.corner, { right: space[2], maxWidth: half }]} />
      </View>
      <Animated.View pointerEvents="none" style={[styles.clip, { width: x }]}>
        <Image source={{ uri: before }} contentFit="contain" style={{ width, height: '100%' }} />
        <Chip label={t('job.before')} style={[styles.corner, { left: space[2], maxWidth: half }]} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.hint, { opacity: hint }]}>
        <Chip label={t('job.compare')} lines={2} style={{ maxWidth: '90%' }} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.seam, { transform: [{ translateX: x }] }]} />
      <Animated.View pointerEvents="none" style={[styles.knob, { transform: [{ translateX: x }] }]}>
        <Drag color="#000000" size={18} />
      </Animated.View>
    </View>
  );
}

/** Controls drawn over a photo: white on a dark scrim in both themes, so they read on any picture. */
export const onPhoto = { ink: '#FFFFFF', scrim: 'rgba(0,0,0,0.55)' } as const;

/** A label over the photo. */
function Chip({ label, lines = 1, style }: { label: string; lines?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={[styles.chip, style]}>
      <Label numberOfLines={lines} style={{ color: onPhoto.ink, textAlign: 'center' }}>{label}</Label>
    </View>
  );
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));

const styles = StyleSheet.create({
  frame: { width: '100%', overflow: 'hidden', userSelect: 'none' },
  clip: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
  seam: { position: 'absolute', top: 0, bottom: 0, left: -1, width: 2, backgroundColor: '#FFFFFF' },
  knob: {
    position: 'absolute', top: '50%', left: -22, marginTop: -22, width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
  },
  hint: { position: 'absolute', left: 0, right: 0, top: '50%', marginTop: 22 + space[2], alignItems: 'center' },
  corner: { position: 'absolute', top: space[2] },
  chip: {
    paddingHorizontal: space[2], paddingVertical: 2, borderRadius: 999,
    backgroundColor: onPhoto.scrim,
  },
});
