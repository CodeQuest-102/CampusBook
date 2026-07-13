import { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/onboarding');
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>

      {/* Top — CampusBook logo */}
      <View style={styles.topSection}>
        <Image
          source={require('../assets/splashScreenImages/splashScreen.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>CampusBook</Text>
        <Text style={styles.tagline}>Smart Lecture Room</Text>
        <Text style={styles.tagline}>Booking System</Text>
      </View>

      {/* Bottom — KNUST logo + motto */}
      <View style={styles.bottomSection}>
        <Image
          source={require('../assets/splashScreenImages/knustlogo.png')}
          style={styles.knustLogo}
          resizeMode="contain"
        />
        <View style={styles.knustTextContainer}>
          <Text style={styles.knustText}>KNUST</Text>
          <Text style={styles.motto}>Nyansapɔ wɔsane no badwenma</Text>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#00309F',
    paddingHorizontal: 24,
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topSection: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
    marginBottom: 80,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
  bottomSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  knustLogo: {
    width: 44,
    height: 44,
  },
  knustTextContainer: {
    gap: 2,
  },
  knustText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  motto: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontStyle: 'italic',
  },
});