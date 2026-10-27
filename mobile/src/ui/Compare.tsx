import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { useI18n } from '../i18n';
import { space, type, useTheme } from '../theme';
import { Drag } from './icons';
import { Label } from './primitives';

/**
 * Before / after with a draggable seam, ported from the web compare view. For
 * screen readers it is an adjustable control: swipe up or down moves the seam
 * in 10% steps, and the value is read out.
 */
export function Compare({ before, after, aspect }: { before: string; after: string; aspect: number }) {
  const { t, percent } = useI18n();
  const { c } = useTheme();
  const [width, setWidth] = useState(0);
  const [split, setSplit] = useState(0.5);
  const widthRef = useRef(0);

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => setSplit(clamp(e.nativeEvent.locationX / (widthRef.current || 1))),
    onPanResponderMove: (e) => setSplit(clamp(e.nativeEvent.locationX / (widthRef.current || 1))),
  })).current;

  const onLayout = (e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
    setWidth(e.nativeEvent.layout.width);
  };

  return (
    <View>
      <View onLayout={onLayout} {...pan.panHandlers}
        accessible accessibilityRole="adjustable" accessibilityLabel={t('job.compare')}
        accessibilityValue={{ text: `${t('job.after')} ${percent(1 - split)}` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => setSplit((s) => clamp(s + (e.nativeEvent.actionName === 'increment' ? -0.1 : 0.1)))}
        style={[styles.frame, { aspectRatio: aspect || 1, backgroundColor: c.surface }]}>
        {/* Children ignore touches so locationX is always relative to the frame. */}
        <Image source={{ uri: after }} contentFit="contain" style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View pointerEvents="none" style={[styles.clip, { width: width * split }]}>
          <Image source={{ uri: before }} contentFit="contain" style={{ width, height: '100%' }} />
        </View>
        <View pointerEvents="none" style={[styles.seam, { left: width * split - 1, backgroundColor: '#FFFFFF' }]} />
        <View pointerEvents="none" style={[styles.knob, { left: width * split - 22 }]}>
          <Drag color="#000000" size={18} />
        </View>
      </View>
      <View style={styles.legend}>
        <Label>{t('job.before')}</Label>
        <Label style={{ fontSize: type.label }}>{t('job.compare')}</Label>
        <Label>{t('job.after')}</Label>
      </View>
    </View>
  );
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));

const styles = StyleSheet.create({
  frame: { width: '100%', overflow: 'hidden' },
  clip: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
  seam: { position: 'absolute', top: 0, bottom: 0, width: 2 },
  knob: {
    position: 'absolute', top: '50%', marginTop: -22, width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
  },
  legend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space[2] },
});
