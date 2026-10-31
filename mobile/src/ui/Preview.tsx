import { useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { useI18n } from '../i18n';
import type { Item } from '../state/app';
import { font, fontScale, space, target, type, useTheme } from '../theme';
import { Compare, onPhoto } from './Compare';
import { Develop } from './Develop';
import { Close, Expand } from './icons';
import { IconButton, T } from './primitives';
import { Screen } from './Screen';

/**
 * The results preview: the before / after of one photo, as large as the
 * screen allows. It runs edge to edge, takes every point of height the
 * screen leaves it, and a "Full screen" button opens the same comparison
 * over the whole display for a close look. A photo still being made shows
 * developing in the same place, so nothing moves when it lands.
 */
export function Preview({ item, label, reduceMotion }: { item: Item; label: string; reduceMotion: boolean }) {
  const { t } = useI18n();
  const [full, setFull] = useState(false);
  const o = item.outcome;
  const aspect = aspectOf(item);

  return (
    <View style={styles.bleed}>
      <Fit aspect={aspect} reserve={captionHeight(item)}>
        {(w) => (o
          ? <Result item={item} width={w}>
              <Pressable onPress={() => setFull(true)} accessibilityRole="button" accessibilityLabel={t('job.fullScreen')}
                hitSlop={space[2]} style={({ pressed }) => [styles.expand, pressed && { opacity: 0.8 }]}>
                <Expand color={onPhoto.ink} size={18} />
                <T numberOfLines={1} style={styles.expandText}>{t('job.fullScreen')}</T>
              </Pressable>
            </Result>
          : <Develop item={item} width={w} height={w / aspect} reduceMotion={reduceMotion} label={label} badge={false} />)}
      </Fit>
      {o && (
        // Android's back gesture closes it, like the Close button.
        <Modal visible={full} animationType="fade" statusBarTranslucent navigationBarTranslucent
          onRequestClose={() => setFull(false)}>
          <FullScreen item={item} onClose={() => setFull(false)} />
        </Modal>
      )}
    </View>
  );
}

/** The comparison over the whole display, with Close in the usual place. */
function FullScreen({ item, onClose }: { item: Item; onClose: () => void }) {
  const { t } = useI18n();
  const { c } = useTheme();
  const aspect = aspectOf(item);
  return (
    <Screen fill header={<>
      <View />
      <IconButton label={t('settings.close')} icon={<Close color={c.ink} />} onPress={onClose} />
    </>}>
      <View style={styles.bleed}>
        <Fit aspect={aspect} reserve={captionHeight(item)}>
          {(w) => <Result item={item} width={w} />}
        </Fit>
      </View>
    </Screen>
  );
}

/**
 * A finished photo's before / after at `width`, `children` laid over it, and
 * its caption beneath: the same block inline and full screen.
 */
function Result({ item, width, children }: { item: Item; width: number; children?: ReactNode }) {
  return (
    <View style={styles.stack}>
      <View style={{ width }}>
        <Compare before={item.source.uri} after={item.outcome!.uri} aspect={aspectOf(item)} />
        {children}
      </View>
      <ItemNote item={item} />
    </View>
  );
}

/**
 * Fills the height it's given and fits a photo of `aspect` inside it, less
 * `reserve` points kept below for the caption. Its size depends only on the
 * screen's layout and the photo, never on what it renders, so it can't feed
 * back into itself.
 */
function Fit({ aspect, reserve, children }: { aspect: number; reserve: number; children: (width: number) => ReactNode }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setBox((b) => (b.w === w && b.h === h ? b : { w, h }));
  };
  const w = Math.min(box.w, Math.max(0, box.h - reserve) * aspect);
  return (
    <View style={styles.fill} onLayout={onLayout}>
      {/* Absolutely placed, so what's shown can never size the box. */}
      <View style={styles.center}>{w > 0 && children(w)}</View>
    </View>
  );
}

/** Height of ItemNote: the size line, plus two lines of note when there is one, at the system text size. */
function captionHeight({ outcome: o }: Item) {
  if (!o) return 0;
  const scale = fontScale();
  return space[2] + type.label * 1.4 * scale + (o.kept || o.missedTarget ? space[1] + type.meta * 1.35 * scale * 2 : 0);
}

/** The photo's own sizes under it, and a note when it was kept or missed the limit. */
function ItemNote({ item }: { item: Item }) {
  const { t, bytes } = useI18n();
  const o = item.outcome!;
  const note = o.kept ? t('job.kept') : o.missedTarget ? t('job.missed') : null;
  return (
    <View style={{ alignSelf: 'stretch', marginTop: space[2], gap: space[1], paddingHorizontal: space[5] }}>
      <T muted numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: font.mono, fontSize: type.label, textAlign: 'center' }}>
        {t('job.from', { from: bytes(o.originalSize), to: bytes(o.size) })} · {o.width}×{o.height} · {o.format.toUpperCase()}
      </T>
      {note && <T muted numberOfLines={2} style={{ fontSize: type.meta, textAlign: 'center' }}>{note}</T>}
    </View>
  );
}

/** The finished photo's shape, else the source's, else square while unknown. */
const aspectOf = ({ outcome: o, source: s }: Item) =>
  o ? o.width / o.height : s.width > 0 && s.height > 0 ? s.width / s.height : 1;

const styles = StyleSheet.create({
  // Cancels the screen's side margins: the photo gets the full width.
  bleed: { flex: 1, minHeight: 160, marginHorizontal: -space[5] },
  fill: { flex: 1 },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  // The photo centred, its caption as wide as the screen, so a tall photo's line isn't cut short.
  stack: { alignSelf: 'stretch', alignItems: 'center' },
  // A word with the icon, on the same dark scrim as the Before / After chips.
  expand: {
    position: 'absolute', right: space[2], bottom: space[2], maxWidth: '60%', minHeight: target.min - space[2],
    paddingHorizontal: space[3], borderRadius: 999, backgroundColor: onPhoto.scrim,
    flexDirection: 'row', alignItems: 'center', gap: space[2],
  },
  expandText: { color: onPhoto.ink, fontFamily: font.medium, fontSize: type.meta, flexShrink: 1 },
});
