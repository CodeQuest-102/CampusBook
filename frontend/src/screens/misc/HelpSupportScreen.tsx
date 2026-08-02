import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, TopBar } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'HelpSupport'>;

const FAQS = [
  { q: 'How do I book a room?', a: 'Open Browse Rooms, pick a room, tap Book Now, fill in the date, time and purpose, then Submit Request.' },
  { q: 'How long does approval take?', a: 'An administrator reviews requests, usually within a day. You get a notification once it is approved or rejected.' },
  { q: 'Can I cancel a booking?', a: 'Yes — open the booking from My Bookings and tap Cancel Booking.' },
  { q: 'Why is a room unavailable?', a: 'Rooms marked Maintenance or In Use cannot be booked for that slot. Try another room or time.' },
];

const CONTACTS: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }[] = [
  { icon: 'mail-outline', label: 'Email us', value: 'support@campusbook.app' },
  { icon: 'call-outline', label: 'Call us', value: '+233 32 206 0000' },
  { icon: 'chatbubbles-outline', label: 'Live chat', value: 'Mon–Fri, 8am–5pm' },
];

export default function HelpSupportScreen({ navigation }: Props) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <>
      <TopBar variant="title" title="Help & Support" onBack={() => navigation.goBack()} />
      <Screen scroll>
        <Text style={styles.section}>Frequently Asked Questions</Text>
        <View style={styles.card}>
          {FAQS.map((f, i) => (
            <View key={i} style={[i < FAQS.length - 1 && styles.rowBorder]}>
              <TouchableOpacity
                style={styles.qRow}
                activeOpacity={0.7}
                onPress={() => setOpen(open === i ? null : i)}
              >
                <Text style={styles.q}>{f.q}</Text>
                <Ionicons
                  name={open === i ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
              {open === i && <Text style={styles.a}>{f.a}</Text>}
            </View>
          ))}
        </View>

        <Text style={styles.section}>Contact Us</Text>
        <View style={styles.card}>
          {CONTACTS.map((c, i) => (
            <View key={c.label} style={[styles.contactRow, i < CONTACTS.length - 1 && styles.rowBorder]}>
              <View style={styles.icon}>
                <Ionicons name={c.icon} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{c.label}</Text>
                <Text style={styles.value}>{c.value}</Text>
              </View>
            </View>
          ))}
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  section: { ...typography.title, marginTop: spacing.xl, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  qRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg },
  q: { flex: 1, ...typography.body, fontWeight: '600', paddingRight: spacing.md },
  a: { ...typography.bodyMuted, fontSize: 13, lineHeight: 20, paddingBottom: spacing.lg },
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  label: { ...typography.body, fontWeight: '500' },
  value: { ...typography.caption, marginTop: 2 },
});
