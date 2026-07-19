import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, fontWeight, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export default function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    const t = setTimeout(() => navigation.replace('Onboarding'), 1600);
    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.logoBlock}>
        <View style={styles.logoBadge}>
          <Ionicons name="cube" size={56} color={colors.white} />
        </View>
        <Text style={styles.title}>CampusBook</Text>
        <Text style={styles.subtitle}>Smart Lecture Room{'\n'}Booking System</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.knustBadge}>
          <Ionicons name="school" size={22} color={colors.primaryDark} />
        </View>
        <Text style={styles.knust}>KNUST</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  logoBlock: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  logoBadge: {
    width: 110,
    height: 110,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: { color: colors.white, fontSize: 30, fontWeight: fontWeight.bold },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  footer: { alignItems: 'center', paddingBottom: spacing.xxl },
  knustBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  knust: { color: colors.white, fontWeight: fontWeight.semibold, letterSpacing: 2, fontSize: 13 },
});
