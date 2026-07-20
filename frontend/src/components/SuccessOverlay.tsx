import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';

type Tone = 'success' | 'danger';

interface Props {
  visible: boolean;
  tone?: Tone;
  title: string;
  subtitle?: string;
  /** Fired once the confirmation animation has been shown for `holdMs`. */
  onDone?: () => void;
  holdMs?: number;
}

const TONES: Record<Tone, { color: string; soft: string; icon: keyof typeof Ionicons.glyphMap }> = {
  success: { color: colors.success, soft: colors.successSoft, icon: 'checkmark' },
  danger: { color: colors.danger, soft: colors.dangerSoft, icon: 'close' },
};

/** Full-screen confirmation overlay: a badge pops in, then `onDone` fires. */
export default function SuccessOverlay({
  visible,
  tone = 'success',
  title,
  subtitle,
  onDone,
  holdMs = 1100,
}: Props) {
  const scale = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const t = TONES[tone];

  useEffect(() => {
    if (!visible) {
      scale.setValue(0);
      fade.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
    ]).start();

    const id = setTimeout(() => onDone?.(), holdMs);
    return () => clearTimeout(id);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          <View style={[styles.badge, { backgroundColor: t.soft }]}>
            <View style={[styles.badgeInner, { backgroundColor: t.color }]}>
              <Ionicons name={t.icon} size={40} color={colors.white} />
            </View>
          </View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  badge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  badgeInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.h3, textAlign: 'center' },
  subtitle: { ...typography.bodyMuted, textAlign: 'center', marginTop: spacing.xs },
});
