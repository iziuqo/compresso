import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space, useTheme } from '../theme';

/**
 * Every screen: content scrolls (so the largest text size never clips), the
 * primary action stays pinned in the thumb zone, and on a tablet or an open
 * foldable the column stops at a readable width instead of stretching.
 */
export function Screen({ header, children, footer, scroll = true }: {
  header?: ReactNode; children: ReactNode; footer?: ReactNode; scroll?: boolean;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const body = <View style={styles.column}>{children}</View>;
  return (
    <View style={[styles.root, { backgroundColor: c.void, paddingTop: insets.top }]}>
      {header && <View style={[styles.column, styles.header]}>{header}</View>}
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">{body}</ScrollView>
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
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scroll: { flexGrow: 1, paddingBottom: space[6] },
  footer: { paddingTop: space[4], borderTopWidth: StyleSheet.hairlineWidth, gap: space[3] },
});
