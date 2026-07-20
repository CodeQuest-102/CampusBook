import { Platform } from 'react-native';

/**
 * On react-native-web, focused inputs render the browser's default focus ring
 * (a stray orange/blue outline). Spread this into a TextInput's style to remove
 * it. No-op on native, where the outline never appears.
 */
// `outlineStyle` is a web-only CSS prop react-native-web understands but the RN
// TextStyle types don't include, so this is intentionally loosely typed.
export const noWebOutline = Platform.select({
  web: { outlineStyle: 'none', outlineWidth: 0 },
  default: {},
}) as any;
