import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useI18n } from '../i18n';
import { useApp } from '../state/app';
import { space, type, useTheme } from '../theme';
import { Close, Trash } from '../ui/icons';
import { Choice, ChoiceRow, Ghost, IconButton, Label, Pill, T, Title } from '../ui/primitives';
import { RecipeControls } from '../ui/RecipeControls';
import { Screen } from '../ui/Screen';

/**
 * One selected photo: see it, take it out of the list, or give it settings
 * of its own while the rest keep the shared ones.
 */
export default function PhotoScreen() {
  const { t, count } = useI18n();
  const { c } = useTheme();
  const { selection, remove, own, setOwn } = useApp();
  const { uri } = useLocalSearchParams<{ uri: string }>();
  const index = selection.findIndex((s) => s.uri === uri);
  const photo = selection[index];
  if (!photo) return null;

  const mine = own[uri];
  const drop = () => {
    remove(uri);
    // The last photo gone means there is nothing left to choose a purpose for.
    if (selection.length === 1) router.dismissTo('/');
    else router.back();
  };

  return (
    <Screen
      header={<>
        <Title style={{ fontSize: type.lead * 1.2 }}>
          {t('a11y.thumb', { n: count(index + 1), total: count(selection.length) })}
        </Title>
        <IconButton label={t('settings.close')} icon={<Close color={c.ink} />} onPress={() => router.back()} />
      </>}
      footer={<>
        <Pill label={t('fine.done')} onPress={() => router.back()} />
        <Ghost compact label={t('photo.remove')} icon={<Trash color={c.alert} />} onPress={drop} />
      </>}
    >
      <View style={[styles.frame, { backgroundColor: c.surface, aspectRatio: photo.width > 0 && photo.height > 0 ? photo.width / photo.height : 4 / 3 }]}>
        <Image source={{ uri }} contentFit="contain" style={StyleSheet.absoluteFill}
          accessibilityLabel={t('a11y.thumb', { n: count(index + 1), total: count(selection.length) })} />
      </View>

      <View style={{ gap: space[3], marginTop: space[5] }}>
        <Label>{t('photo.settings')}</Label>
        <ChoiceRow>
          <Choice label={t('photo.shared')} selected={!mine} onPress={() => setOwn(uri, null)} />
          <Choice label={t('photo.own')} selected={!!mine} onPress={() => setOwn(uri, mine ?? {})} />
        </ChoiceRow>
        <T muted style={{ fontSize: type.meta }}>{t(mine ? 'photo.ownHint' : 'photo.sharedHint')}</T>
      </View>
      {mine && <RecipeControls value={mine} onChange={(next) => setOwn(uri, next)} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', maxHeight: 320, borderRadius: 2, overflow: 'hidden' },
});
