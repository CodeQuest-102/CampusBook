import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '../constants/colors';

const { width } = Dimensions.get('window');

const slides = [
  {
    image: require('../assets/onboardingimages/booking2.png'),
    title: 'Welcome to CampusBook',
    subtitle: 'Book lecture rooms easily, anytime, anywhere.',
  },
  {
    image: require('../assets/onboardingimages/Search.png'),
    title: 'Real-time Availability',
    subtitle: 'Check room availability and book in just a few taps.',
  },
  {
    image: require('../assets/onboardingimages/notifications.png'),
    title: 'Stay Organized',
    subtitle: 'Track your bookings and manage everything in one place.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: currentIndex,
      useNativeDriver: false,
      friction: 6,
    }).start();
  }, [currentIndex]);

  const slide = slides[currentIndex];
  const isLast = currentIndex === slides.length - 1;

  const handleNext = () => {
    if (!isLast) {
      setCurrentIndex(currentIndex + 1);
    } else {
      router.replace('/login');
    }
  };

  const handleSkip = () => {
    router.replace('/login');
  };

  return (
    <View style={styles.container}>


      {/* Title at top */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
      </View>

      {/* Image in middle */}
      <Image
        source={slide.image}
        style={styles.image}
        resizeMode="contain"
      />

      {/* Dots */}
      <View style={styles.dotsContainer}>
        {slides.map((_, index) => {
          const dotWidth = animatedValue.interpolate({
            inputRange: [index - 1, index, index + 1],
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });
          const dotColor = animatedValue.interpolate({
            inputRange: [index - 1, index, index + 1],
            outputRange: [Colors.border, Colors.primary, Colors.border],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={index}
              style={[styles.dot, { width: dotWidth, backgroundColor: dotColor }]}
            />
          );
        })}
      </View>

      {/* Button */}
      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>{isLast ? 'Get Started' : 'Next'}</Text>
      </TouchableOpacity>

      {/* Skip text below button */}
      <TouchableOpacity onPress={handleSkip}>
        <Text style={styles.skipBottom}>Skip</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 48,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipButton: {
    alignSelf: 'flex-end',
  },
  skipText: {
    fontSize: 14,
    color: Colors.textMedium,
    fontWeight: '500',
  },
  titleContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textDark,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textMedium,
    textAlign: 'center',
    lineHeight: 22,
  },
  image: {
    width: width * 0.8,
    height: 260,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  button: {
    backgroundColor: '#00309F',
    borderRadius: 10,
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  skipBottom: {
    fontSize: 14,
    color: '#00309F',
    fontWeight: '500',
    marginTop: 10,
  },
});