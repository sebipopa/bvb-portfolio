import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { PortfolioProvider } from '@/src/context/PortfolioContext';
import { LanguageProvider } from '@/src/context/LanguageContext';
import { CurrencyProvider } from '@/src/context/CurrencyContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <LanguageProvider>
        <CurrencyProvider>
          <PortfolioProvider>
            <Stack
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="stock/[symbol]" />
              <Stack.Screen name="transactions/[symbol]" />
            </Stack>
            <StatusBar style="auto" />
          </PortfolioProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
