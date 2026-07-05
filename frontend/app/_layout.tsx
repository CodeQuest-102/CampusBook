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

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Not logged in — go to login
      router.replace('/login');
    } else if (user && inAuthGroup) {
      // Already logged in — go to home
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