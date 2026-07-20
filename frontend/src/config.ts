import { Platform } from 'react-native';

/**
 * Base URL of the Spring Boot backend.
 *
 * - iOS simulator shares the Mac's network, so `localhost` reaches the backend
 *   directly and iOS ATS permits cleartext to localhost.
 * - Android emulator maps the host machine to the special address `10.0.2.2`.
 * - For a physical device (Expo Go), replace this with your Mac's LAN IP,
 *   e.g. `http://192.168.1.20:8080`, and make sure the phone is on the same
 *   Wi-Fi network.
 */
const HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

/**
 * Override for physical devices / deployed backends by setting
 * `EXPO_PUBLIC_API_URL` (e.g. in a `.env` file or the shell) to your Mac's LAN
 * IP or the hosted URL, e.g. `EXPO_PUBLIC_API_URL=http://192.168.1.20:8080`.
 * Expo inlines `EXPO_PUBLIC_*` vars at build time.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? `http://${HOST}:8080`;
