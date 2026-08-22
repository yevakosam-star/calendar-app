import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { DataProvider } from '../lib/store';

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DataProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="day/[date]"
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen
              name="note/[id]"
              options={{ presentation: 'modal' }}
            />
          </Stack>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        </DataProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
