import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

const PORT = 8080;

/**
 * Base URL of the Spring Boot backend, resolved so the *same* build works on the
 * iOS simulator, the Android emulator, and a physical phone — all at once, with
 * nothing to edit between them:
 *
 * 1. `EXPO_PUBLIC_API_URL` always wins — set it to a LAN IP or a hosted/staging
 *    URL to override everything below. Expo inlines it at bundle time, so restart
 *    Metro (`npx expo start -c`) after changing it.
 * 2. Simulator / emulator (`Device.isDevice === false`): the backend is on this
 *    same machine, reached via `localhost` on iOS and the special alias
 *    `10.0.2.2` on Android. `localhost` is also the one host iOS ATS lets us hit
 *    over plain HTTP without extra config.
 * 3. Physical phone: `localhost` would mean the phone itself, so we talk to the
 *    computer that served the JS bundle — its LAN IP, which Expo exposes as the
 *    host part of `hostUri` (e.g. "192.168.1.20:8081"). Phone and computer must
 *    be on the same Wi-Fi.
 */
function resolveBaseUrl(): string {
  const override = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  if (override) return override;

  // Simulator / emulator — the backend is on this same machine.
  if (!Device.isDevice) {
    const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
    return `http://${host}:${PORT}`;
  }

  // Physical device — reach the computer that is serving the bundle over the LAN.
  const hostUri =
    Constants.expoConfig?.hostUri ??
    // Fallback across Expo runtimes where hostUri isn't on expoConfig.
    (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost;
  const lanHost = hostUri?.split(':')[0];
  if (lanHost) return `http://${lanHost}:${PORT}`;

  // Last resort (e.g. a standalone build with no dev host and no override set).
  return `http://localhost:${PORT}`;
}

export const API_BASE_URL = resolveBaseUrl();
