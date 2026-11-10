import { useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '../i18n';
import { font, space, target, type, useTheme } from '../theme';
import { Down } from './icons';
import { T } from './primitives';

/**
 * Every screen: content scrolls (so the largest text size never clips), the
 * primary action stays pinned in the thumb zone, and on a tablet or an open
 * foldable the column stops at a readable width instead of stretching.
 *
 * When anything sits below the fold, a "Scroll down for more" button floats
 * in the bottom corner of the scroll area, clear of the centred controls: a faded scroll bar is no hint to
 * someone who doesn't know phones scroll. Tapping it scrolls one screenful.
 * It floats so that showing it never changes the layout it measures (a bar
 * that took space shrank the job preview, which hid the bar, in a loop). It
 * goes as soon as the end is reached, checked again when a fling settles.
 * Only content that really overflows is padded at the end, so the button
 * never sits on the last row and the padding alone never makes a screen
 * that fits scroll (it used to, and the button covered Home's last line).
 * With no footer, the button and the last row keep clear of the system
 * navigation bar.
 *
 * `fill` lets the body take the whole height, so one flexible child (the
 * job preview) can grow into the space that's left.
 */
export function Screen({ header, children, footer, fill = false }: {
  header?: ReactNode; children: ReactNode; footer?: ReactNode; fill?: boolean;
}) {
  const { c } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const metrics = useRef({ frame: 0, content: 0, offset: 0 });
  const [overflows, setOverflows] = useState(false);
  const [more, setMore] = useState(false);
  const bottom = footer ? 0 : insets.bottom;
  const endPad = (overflows && !fill ? target.min + space[5] : space[3]) + bottom;

  // Measurements live in a ref; only the yes/no answers are state, so
  // scrolling re-renders the screen at most twice, not on every frame.
  // `content` is the children alone, without the end padding it decides.
  const measure = (patch: Partial<typeof metrics.current>) => {
    const m = Object.assign(metrics.current, patch);
    setOverflows(m.content > m.frame + 1);
    setMore(m.content + endPad - m.frame - m.offset > 2);
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => measure({ offset: e.nativeEvent.contentOffset.y });
  const next = () => {
    const { frame, offset } = metrics.current;
    ref.current?.scrollTo({ y: offset + frame * 0.8, animated: true });
  };

  return (
    <View style={[styles.root, { backgroundColor: c.void, paddingTop: insets.top }]}>
      {header && <View style={[styles.column, styles.header]}>{header}</View>}
      <View style={styles.body}>
        <ScrollView ref={ref} contentContainerStyle={[styles.scroll, { paddingBottom: endPad }]} keyboardShouldPersistTaps="handled"
          onLayout={(e) => measure({ frame: e.nativeEvent.layout.height })}
          onScroll={onScroll} onScrollEndDrag={onScroll} onMomentumScrollEnd={onScroll} scrollEventThrottle={100}>
          <View style={[styles.column, fill && styles.body]} onLayout={(e) => measure({ content: e.nativeEvent.layout.height })}>
            {children}
          </View>
        </ScrollView>
        {more && (
          <Pressable onPress={next} accessibilityRole="button" accessibilityLabel={t('a11y.more')}
            style={({ pressed }) => [styles.more, { bottom: space[3] + bottom, backgroundColor: pressed ? c.surface2 : c.surface, borderColor: c.line2 }]}>
            <T numberOfLines={1} style={{ fontFamily: font.medium, fontSize: type.meta, flexShrink: 1 }}>{t('a11y.more')}</T>
            <Down color={c.ink} size={18} />
          </Pressable>
        )}
      </View>
      {footer && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space[4]), borderTopColor: c.line, backgroundColor: c.void }]}>
          <View style={[styles.column, { gap: space[3] }]}>{footer}</View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
  column: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: space[5] },
  header: { minHeight: 56, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: space[2] },
  scroll: { flexGrow: 1 },
  footer: { paddingTop: space[4], borderTopWidth: StyleSheet.hairlineWidth, gap: space[3] },
  more: {
    position: 'absolute', right: space[4], maxWidth: '80%', minHeight: target.min,
    paddingHorizontal: space[4], borderRadius: 999, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2],
    shadowColor: '#000000', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
});
