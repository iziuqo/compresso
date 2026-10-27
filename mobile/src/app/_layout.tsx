import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { deviceLocale, I18nProvider } from '../i18n';
import { AppProvider, useApp } from '../state/app';
import { ThemeProvider, useTheme } from '../theme';

export default function RootLayout() {
  const [loaded] = useFonts({
    'Geist-Regular': require('../../assets/fonts/Geist-Regular.ttf'),
    'Geist-Medium': require('../../assets/fonts/Geist-Medium.ttf'),
    'Geist-SemiBold': require('../../assets/fonts/Geist-SemiBold.ttf'),
    'GeistMono-Regular': require('../../assets/fonts/GeistMono-Regular.ttf'),
  });
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Providers />
      </AppProvider>
    </SafeAreaProvider>
  );
}

function Providers() {
  const { prefs } = useApp();
  return (
    <I18nProvider locale={prefs.locale ?? deviceLocale()}>
      <ThemeProvider appearance={prefs.appearance}>
        <Navigator />
      </ThemeProvider>
    </I18nProvider>
  );
}

function Navigator() {
  const { scheme, c } = useTheme();
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.void);
  }, [c.void]);
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.void }, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="purpose" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="job" options={{ gestureEnabled: false }} />
        <Stack.Screen name="fine-tune" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}
