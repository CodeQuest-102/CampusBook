import React, { useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, Button } from '../components';
import { colors, fontWeight, spacing, typography } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const { width } = Dimensions.get('window');

interface Slide {
  image: ImageSourcePropType;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    image: require('../assets/images/welcome.png'),
    title: 'Welcome to CampusBook',
    body: 'Book lecture rooms easily, anytime, anywhere.',
  },
  {
    image: require('../assets/images/secondonboarding.png'),
    title: 'Real-time Availability',
    body: 'Check room availability and book in just a few taps.',
  },
  {
    image: require('../assets/images/last.png'),
    title: 'Stay Organized',
    body: 'Track your bookings, get notifications and manage everything in one place.',
  },
];

export default function OnboardingScreen({ navigation }: Props) {
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const isLast = index === SLIDES.length - 1;

  const goToLogin = () => navigation.replace('Login');

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  const next = () => {
    if (isLast) {
      goToLogin();
      return;
    }
    const target = index + 1;
    setIndex(target);
    scrollRef.current?.scrollTo({ x: target * width, animated: true });
  };

  return (
    <Screen padded={false} edges={['top', 'bottom']}>
      <View style={styles.skipRow}>
        <TouchableOpacity onPress={goToLogin} hitSlop={12}>
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((item, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <View style={styles.illustration}>
              <Image source={item.image} style={styles.image} resizeMode="contain" />
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.footer}>
        <Button title={isLast ? 'Get Started' : 'Next'} onPress={next} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  skipRow: { alignItems: 'flex-end', paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  skip: { color: colors.textSecondary, fontWeight: fontWeight.medium, fontSize: 15 },
  scroll: { flex: 1 },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl },
  illustration: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  image: {
    width: 240,
    height: 240,
  },
  title: { ...typography.h1, textAlign: 'center', marginBottom: spacing.md },
  body: {
    ...typography.bodyMuted,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.lg,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.xl },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  dotActive: { width: 22, backgroundColor: colors.primary },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
});