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
 * When anything sits below the fold, a labelled "More below" button sits
 * just above the footer (never over the content) until the person reaches it. A faded scroll bar is not
 * enough of a hint for someone who doesn't know phones scroll.
 *
 * `fill` lets the body take the whole height, so one flexible child (the
 * job preview) can grow into the space that's left and shrink before
 * anything else is pushed off screen.
 */
export function Screen({ header, children, footer, scroll = true, fill = false }: {
  header?: ReactNode; children: ReactNode; footer?: ReactNode; scroll?: boolean; fill?: boolean;
}) {
  const { c } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const [frame, setFrame] = useState(0);
  const [content, setContent] = useState(0);
  const [offset, setOffset] = useState(0);
  const more = scroll && content - frame - offset > space[5];

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setOffset(e.nativeEvent.contentOffset.y);
  const body = <View style={[styles.column, fill && { flex: 1 }]}>{children}</View>;

  return (
    <View style={[styles.root, { backgroundColor: c.void, paddingTop: insets.top }]}>
      {header && <View style={[styles.column, styles.header]}>{header}</View>}
      {scroll ? (
        <>
          <ScrollView style={{ flex: 1 }} ref={ref} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled"
            onLayout={(e) => setFrame(e.nativeEvent.layout.height)} onContentSizeChange={(_, h) => setContent(h)}
            onScroll={onScroll} scrollEventThrottle={64}>
            {body}
          </ScrollView>
          {more && (
            <Pressable onPress={() => ref.current?.scrollToEnd({ animated: true })} accessibilityRole="button"
              accessibilityLabel={t('a11y.more')}
              style={({ pressed }) => [styles.more, { backgroundColor: pressed ? c.surface2 : c.void, borderTopColor: c.line }]}>
              <T style={{ fontFamily: font.medium, fontSize: type.meta }}>{t('a11y.more')}</T>
              <Down color={c.ink} size={18} />
            </Pressable>
          )}
        </>
      ) : (
        <View style={[styles.scroll, { flex: 1 }]}>{body}</View>
      )}
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
  column: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: space[5] },
  header: { minHeight: 56, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: space[2] },
  scroll: { flexGrow: 1, paddingBottom: space[6] },
  footer: { paddingTop: space[4], borderTopWidth: StyleSheet.hairlineWidth, gap: space[3] },
  more: {
    minHeight: target.min - 4, borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2],
  },
});
