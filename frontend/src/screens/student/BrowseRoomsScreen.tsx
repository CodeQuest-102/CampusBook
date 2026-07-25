import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, TopBar, SearchBar, RoomCard, StateView, Button } from '../../components';
import { colors, fontWeight, radius, spacing, typography } from '../../theme';
import { hallsApi, hallToRoom } from '../../api';
import { useApiData } from '../../hooks/useApiData';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BrowseRooms'>;

/** Capacity presets — a stepper is fiddly on mobile and these cover real use. */
const CAPACITY_OPTIONS = [
  { label: 'Any', value: 0 },
  { label: '50+', value: 50 },
  { label: '100+', value: 100 },
  { label: '150+', value: 150 },
];

const EQUIPMENT = [
  { key: 'projector', label: 'Projector', icon: 'tv-outline' },
  { key: 'ac', label: 'Air conditioning', icon: 'snow-outline' },
  { key: 'microphone', label: 'Microphone', icon: 'mic-outline' },
] as const;

type EquipmentKey = (typeof EQUIPMENT)[number]['key'];

export default function BrowseRoomsScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  // Applied filters (what the API sees).
  const [minCapacity, setMinCapacity] = useState(0);
  const [equipment, setEquipment] = useState<Record<EquipmentKey, boolean>>({
    projector: false,
    ac: false,
    microphone: false,
  });

  // Draft filters (what the sheet edits) — only committed on "Apply".
  const [draftCapacity, setDraftCapacity] = useState(0);
  const [draftEquipment, setDraftEquipment] = useState(equipment);

  // Debounce typing so each keystroke isn't a request.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const { data, loading, refreshing, error, reload, refresh } = useApiData(async () =>
    (
      await hallsApi.listHalls({
        q: debouncedQuery,
        minCapacity: minCapacity || undefined,
        projector: equipment.projector,
        ac: equipment.ac,
        microphone: equipment.microphone,
      })
    ).map(hallToRoom),
  );

  // Re-query whenever the applied filters change. useApiData already loads on
  // focus, so skip the first run to avoid a duplicate request on mount.
  const filterKey = JSON.stringify({ debouncedQuery, minCapacity, equipment });
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    reload();
  }, [filterKey, reload]);

  const activeCount = useMemo(
    () => (minCapacity ? 1 : 0) + Object.values(equipment).filter(Boolean).length,
    [minCapacity, equipment],
  );

  const openSheet = () => {
    setDraftCapacity(minCapacity);
    setDraftEquipment(equipment);
    setSheetOpen(true);
  };

  const applyFilters = () => {
    setMinCapacity(draftCapacity);
    setEquipment(draftEquipment);
    setSheetOpen(false);
  };

  const clearFilters = () => {
    setDraftCapacity(0);
    setDraftEquipment({ projector: false, ac: false, microphone: false });
  };

  const rooms = data ?? [];

  return (
    <>
      <TopBar variant="title" title="Browse Rooms" onBack={() => navigation.goBack()} />
      <Screen
        scroll
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.searchRow}>
          <View style={{ flex: 1 }}>
            <SearchBar value={query} onChangeText={setQuery} />
          </View>
          <TouchableOpacity
            style={[styles.filterBtn, activeCount > 0 && styles.filterBtnActive]}
            onPress={openSheet}
            activeOpacity={0.8}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={activeCount > 0 ? colors.white : colors.primary}
            />
            {activeCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <StateView
          loading={loading}
          error={error}
          onRetry={reload}
          empty={!loading && !error && rooms.length === 0}
          emptyText={
            debouncedQuery || activeCount > 0
              ? 'No rooms match these filters.'
              : 'No rooms available.'
          }
          emptyIcon="business-outline"
        />

        {!loading && !error && (
          <View style={styles.list}>
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onPress={() => navigation.navigate('RoomDetails', { room })}
              />
            ))}
          </View>
        )}
      </Screen>

      <Modal visible={sheetOpen} animationType="slide" transparent onRequestClose={() => setSheetOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setSheetOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.groupLabel}>Minimum capacity</Text>
            <View style={styles.chipRow}>
              {CAPACITY_OPTIONS.map((opt) => {
                const on = draftCapacity === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => setDraftCapacity(opt.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.groupLabel}>Must have</Text>
            {EQUIPMENT.map((item) => {
              const on = draftEquipment[item.key];
              return (
                <TouchableOpacity
                  key={item.key}
                  style={styles.toggleRow}
                  onPress={() =>
                    setDraftEquipment((cur) => ({ ...cur, [item.key]: !cur[item.key] }))
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons name={item.icon} size={20} color={colors.textSecondary} />
                  <Text style={styles.toggleLabel}>{item.label}</Text>
                  <Ionicons
                    name={on ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={on ? colors.primary : colors.border}
                  />
                </TouchableOpacity>
              );
            })}

            <View style={styles.sheetActions}>
              <TouchableOpacity onPress={clearFilters} hitSlop={8}>
                <Text style={styles.clearText}>Clear all</Text>
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: spacing.lg }}>
                <Button title="Apply" onPress={applyFilters} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: fontWeight.semibold },
  list: { marginTop: spacing.lg },

  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  sheetTitle: { ...typography.h3 },
  groupLabel: {
    ...typography.caption,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textSecondary, fontWeight: fontWeight.medium },
  chipTextOn: { color: colors.white },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.md,
  },
  toggleLabel: { ...typography.body, flex: 1 },
  sheetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  clearText: { color: colors.textSecondary, fontWeight: fontWeight.semibold, fontSize: 14 },
});
