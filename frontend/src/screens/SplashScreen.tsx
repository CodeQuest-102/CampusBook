import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { colors, fontWeight, radius, spacing } from '../theme';


interface Props {
  /** False while the session is still being restored — the splash waits for this. */
  canExit?: boolean;
  /** Fired once the exit fade has finished and the splash can be unmounted. */
  onFinish?: () => void;
}

const ENTER_MS = 420; // badge fade + spring-in
const TEXT_DELAY_MS = 180; // title/subtitle start a beat after the badge
const MIN_VISIBLE_MS = 1700; // earliest the exit fade may begin
const EXIT_MS = 300; // fade-out

/**
 * Branded splash shown while the persisted session is being restored. It owns
 * its own minimum on-screen time (bootstrapping usually finishes in well under
 * 200ms, which would otherwise make this flicker past), then fades itself out
 * and reports back via `onFinish`. Routing stays with RootNavigator's auth gate.
 */
export default function SplashScreen({ canExit = true, onFinish }: Props) {
  const badge = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0.8)).current;
  const text = useRef(new Animated.Value(0)).current;
  const screen = useRef(new Animated.Value(1)).current;
  const mountedAt = useRef(Date.now()).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(badge, { toValue: 1, duration: ENTER_MS, useNativeDriver: true }),
      Animated.spring(badgeScale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      Animated.timing(text, {
        toValue: 1,
        duration: ENTER_MS,
        delay: TEXT_DELAY_MS,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!canExit) return;
    // Measured from mount, so a slow bootstrap doesn't add to the total beat.
    const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - mountedAt));
    const id = setTimeout(() => {
      Animated.timing(screen, {
        toValue: 0,
        duration: EXIT_MS,
        useNativeDriver: true,
      }).start(() => onFinish?.());
    }, remaining);
    return () => clearTimeout(id);
  }, [canExit]);

  return (
    <Animated.View style={[styles.container, { opacity: screen }]}>
      <StatusBar style="light" />

      <View style={styles.logoBlock}>
        <Animated.View
          style={[
            styles.logoBadge,
            { opacity: badge, transform: [{ scale: badgeScale }] },
          ]}
        >
          <Image
            source={require('../assets/images/splashScreen.png')}
            style={{ width: 130, height: 130 }}
            resizeMode="contain"
          />
        </Animated.View>
        <Animated.View
          style={{
            alignItems: 'center',
            opacity: text,
            transform: [{ translateY: text.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          }}
        >
          <Text style={styles.title}>CampusBook</Text>
          <Text style={styles.subtitle}>Smart Lecture Room{'\n'}Booking System</Text>
        </Animated.View>
      </View>
      <Animated.View style={[styles.footer, { opacity: text, flexDirection: 'row', alignItems: 'center' }]}>
        <Image
          source={require('../assets/images/knustlogo.png')}
          style={{ width: 44, height: 44, marginRight: spacing.md }}
          resizeMode="contain"
        />
        <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <Text style={styles.knust}>KNUST</Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontStyle: 'italic' }}>
            Nyansapɔ wɔsane no badwenma
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Absolute fill so the splash overlays the navigator and can cross-fade
    // into it, rather than displacing it.
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  logoBlock: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  logoBadge: {
    width: 140,
    height: 140,
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