import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '../constants/colors';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    // Show splash for 2 seconds then go to login
    const timer = setTimeout(() => {
      router.replace('/login');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoIcon}>📚</Text>
        <Text style={styles.logoText}>CampusBook</Text>
        <Text style={styles.tagline}>Smart Lecture Room Booking System</Text>
      </View>
      <Text style={styles.institution}>KNUST</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.white,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginTop: 8,
  },
  institution: {
    position: 'absolute',
    bottom: 48,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
  },
});