import { router, useLocalSearchParams } from 'expo-router';

import { useI18n } from '../i18n';
import { useApp, useJob } from '../state/app';
import { type, useTheme } from '../theme';
import { Close } from '../ui/icons';
import { Ghost, IconButton, Pill, Title } from '../ui/primitives';
import { RecipeControls } from '../ui/RecipeControls';
import { Screen } from '../ui/Screen';

/** The settings for every photo, off the main path. */
export default function FineTune() {
  const { t } = useI18n();
  const { c } = useTheme();
  const { tweaks, setTweaks, start } = useApp();
  const job = useJob();
  // Opened from a finished result: "Done" re-runs the same photos with the new settings.
  const { redo } = useLocalSearchParams<{ redo?: string }>();
  const rerun = redo === '1' && !!job;
  const done = () => {
    if (rerun) start(job!.purpose);
    router.back();
  };

  return (
    <Screen
      header={<>
        <Title style={{ fontSize: type.lead * 1.2 }}>{t('fine.title')}</Title>
        <IconButton label={t('settings.close')} icon={<Close color={c.ink} />} onPress={() => router.back()} />
      </>}
      footer={<>
        <Pill label={t(rerun ? 'fine.redo' : 'fine.done')} onPress={done} />
        <Ghost compact label={t('fine.reset')} onPress={() => setTweaks({})} />
      </>}
    >
      <RecipeControls value={tweaks} onChange={setTweaks} />
    </Screen>
  );
}
