import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontWeight, radius } from '../theme';

interface Props {
  name: string;
  size?: number;
  color?: string;
}

/** Circular initials avatar — placeholder for real profile photos. */
export default function Avatar({ name, size = 40, color = colors.primary }: Props) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: radius.pill, backgroundColor: color },
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.white, fontWeight: fontWeight.bold },
});
