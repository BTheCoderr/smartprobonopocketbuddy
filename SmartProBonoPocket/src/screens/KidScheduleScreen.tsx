import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  getKidSchedule,
  saveKidSchedule,
  type KidSchedule,
  type WeekdayIndex,
} from '../storage/kidScheduleStorage';
import { trackEvent, trackError } from '../lib/analytics';
import { retryAsync } from '../utils/retry';
import { colors } from '../theme/colors';
import { Button } from '../components/Button';
import { InlineError } from '../components/InlineError';
import { useToast } from '../components/Toast';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'KidSchedule'>;
};

const DAY_LABELS: { day: WeekdayIndex; label: string }[] = [
  { day: 0, label: 'Sun' },
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
];

export function KidScheduleScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [enabled, setEnabled] = useState(false);
  const [weekDays, setWeekDays] = useState<number[]>([]);
  const [hourStr, setHourStr] = useState('8');
  const [minuteStr, setMinuteStr] = useState('0');
  const [saving, setSaving] = useState(false);
  const [hourError, setHourError] = useState<string | null>(null);
  const [minuteError, setMinuteError] = useState<string | null>(null);
  const [daysError, setDaysError] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  useEffect(() => {
    const load = async () => {
      const s = await getKidSchedule();
      setEnabled(s.enabled);
      setWeekDays(s.weekDays);
      setHourStr(String(s.hour));
      setMinuteStr(String(s.minute));
    };
    load();
  }, []);

  const toggleDay = (day: number) => {
    setWeekDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)));
  };

  const persist = async () => {
    const h = parseInt(hourStr, 10);
    const m = parseInt(minuteStr, 10);
    let valid = true;

    if (Number.isNaN(h) || h < 0 || h > 23) {
      setHourError('Enter hour between 0 and 23.');
      valid = false;
    } else {
      setHourError(null);
    }
    if (Number.isNaN(m) || m < 0 || m > 59) {
      setMinuteError('Enter minute between 0 and 59.');
      valid = false;
    } else {
      setMinuteError(null);
    }
    if (enabled && weekDays.length === 0) {
      setDaysError('Select at least one day, or turn off the schedule.');
      valid = false;
    } else {
      setDaysError(null);
    }

    if (!valid) return;

    const schedule: KidSchedule = {
      enabled,
      weekDays,
      hour: h,
      minute: m,
    };
    setSaving(true);
    try {
      await retryAsync(() => saveKidSchedule(schedule));
      trackEvent('kid_schedule.save_success', { enabled, dayCount: weekDays.length });
      Keyboard.dismiss();
      navigation.goBack();
    } catch (e) {
      trackError('kid_schedule.save_failed', e);
      toast.show({ type: 'error', message: 'Could not save schedule. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.scrollContent, { paddingTop: 24 + insets.top, paddingBottom: 40 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: theme.text }]}>Kid schedule</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        When the app is open on Home at this time on a selected day, you&apos;ll be prompted to start Kid Track.
      </Text>

      <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>Enable reminder</Text>
        <Switch value={enabled} onValueChange={setEnabled} accessibilityLabel="Enable reminder" />
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Days</Text>
      {DAY_LABELS.map(({ day, label }) => (
        <View
          key={day}
          style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
          <Switch value={weekDays.includes(day)} onValueChange={() => toggleDay(day)} accessibilityLabel={label} />
        </View>
      ))}
      <InlineError message={daysError} />

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Time</Text>
      <View style={styles.timeRow}>
        <TextInput
          style={[styles.timeInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
          value={hourStr}
          onChangeText={setHourStr}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="0–23"
          placeholderTextColor={theme.textMuted}
        />
        <Text style={[styles.timeColon, { color: theme.text }]}>:</Text>
        <TextInput
          style={[styles.timeInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
          value={minuteStr}
          onChangeText={setMinuteStr}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="0–59"
          placeholderTextColor={theme.textMuted}
        />
      </View>
      <InlineError message={hourError ?? minuteError} />
      <Text style={[styles.hint, { color: theme.textMuted }]}>24-hour clock (local time)</Text>

      <Button
        title="Save"
        onPress={() => void persist()}
        loading={saving}
        disabled={saving}
        style={styles.saveButton}
        textStyle={styles.saveButtonText}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
  subtitle: { fontSize: 15, marginBottom: 24, lineHeight: 22 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 20, marginBottom: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  rowLabel: { fontSize: 16, flex: 1 },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  timeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    maxWidth: 100,
  },
  timeColon: { fontSize: 22, fontWeight: '600', marginHorizontal: 12 },
  hint: { fontSize: 14, marginBottom: 24 },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
});
