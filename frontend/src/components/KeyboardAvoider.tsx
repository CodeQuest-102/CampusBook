import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

/**
 * Lifts a whole form clear of the soft keyboard.
 *
 * Wrap the screen's outermost fragment, not the `Screen` body — form screens
 * pin their submit button in a footer that sits *outside* `Screen`, and lifting
 * only the scroll content would leave that button under the keyboard.
 *
 * Android already resizes the window (`adjustResize`), so setting a behaviour
 * there shifts everything twice; iOS needs the explicit padding.
 */
export default function KeyboardAvoider({ children }: { children: React.ReactNode }) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
