import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { AppProvider } from './src/navigation/AppContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    // `initialMetrics` lets the safe-area provider render immediately instead of
    // waiting on an async frame measurement.
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AppProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}
