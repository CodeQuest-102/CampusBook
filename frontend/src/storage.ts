import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Key-value persistence for the auth token and session, used on every
 * platform this app runs on.
 *
 * expo-secure-store has no real web implementation — Keychain/Keystore are
 * native-only concepts, and the installed version's web build is an empty
 * stub, so calling it on web throws. `localStorage` is the same fallback
 * earlier versions of the package used internally, so this mirrors that.
 */
export async function getItemAsync(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return window.localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
