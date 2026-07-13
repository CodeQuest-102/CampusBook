import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import Colors from '../constants/colors';

// ─── Auth Guard ───────────────────────────────────────────────────────────────
function AuthGuard() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthScreen = segments[0] === 'login' || segments[0] === 'register';
    const inOnboarding = segments[0] === 'onboarding';
    const inSplash = segments[0] === undefined;
    const inTabs = segments[0] === '(tabs)';

    if (inSplash || inOnboarding) {
      // Let splash and onboarding handle their own navigation
      return;
    }

    if (!user && !inAuthScreen) {
      router.replace('/login');
    } else if (user && inAuthScreen) {
      router.replace('/(tabs)/home');
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return null;
}
// ─── Root Layout ──────────────────────────────────────────────────────────────
export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="rooms/[id]"
          options={{
            headerShown: true,
            title: 'Room Details',
            headerTintColor: Colors.primary,
          }}
        />
        <Stack.Screen
          name="booking/form"
          options={{
            headerShown: true,
            title: 'New Booking',
            headerTintColor: Colors.primary,
          }}
        />
        <Stack.Screen
          name="booking/confirm"
          options={{
            headerShown: true,
            title: 'Confirmation',
            headerTintColor: Colors.primary,
          }}
        />
      </Stack>
    </AuthProvider>
  );
}