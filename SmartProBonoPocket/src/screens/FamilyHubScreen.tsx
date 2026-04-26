import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { getEmergencyContact, getAdditionalContacts } from '../storage/contactStorage';
import { getKidSchedule, type KidSchedule } from '../storage/kidScheduleStorage';
import { getSafetyEvents } from '../storage/eventStorage';
import { retryAsync } from '../utils/retry';
import { colors } from '../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'FamilyHub'>;
};

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatScheduleSummary(s: KidSchedule): string {
  if (!s.enabled) return 'No schedule set';
  if (s.weekDays.length === 0) return 'Schedule incomplete';
  const days = s.weekDays.map((d) => DAY_SHORT[d] ?? '?').join(', ');
  const h12 = s.hour % 12 || 12;
  const ampm = s.hour < 12 ? 'AM' : 'PM';
  const mm = s.minute.toString().padStart(2, '0');
  return `${h12}:${mm} ${ampm} · ${days}`;
}

function formatEventTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString() + ' at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export function FamilyHubScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  const [scheduleLine, setScheduleLine] = useState('—');
  const [trustedLine, setTrustedLine] = useState('—');
  const [lastKidLine, setLastKidLine] = useState('—');

  const refresh = useCallback(async () => {
    try {
      const [schedule, primary, additional, events] = await retryAsync(() =>
        Promise.all([
          getKidSchedule(),
          getEmergencyContact(),
          getAdditionalContacts(),
          getSafetyEvents(),
        ]),
      );

      setScheduleLine(formatScheduleSummary(schedule));

      const n = (primary?.phone?.trim() ? 1 : 0) + additional.length;
      setTrustedLine(n === 0 ? 'None set' : n === 1 ? '1 contact' : `${n} contacts`);

      const kid = events.find((e) => e.scenario === 'kid_track');
      setLastKidLine(kid ? formatEventTime(kid.timestamp) : 'No Kid Track sessions yet');
    } catch {
      // Storage read failed; keep placeholder dashes
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.scrollContent, { paddingTop: 16 + insets.top, paddingBottom: 40 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>AT A GLANCE</Text>
      <View style={[styles.glanceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.glanceRowLabel, { color: theme.textMuted }]}>Kid schedule</Text>
        <Text style={[styles.glanceRowValue, { color: theme.text }]}>{scheduleLine}</Text>
        <View style={[styles.glanceDivider, { backgroundColor: theme.border }]} />
        <Text style={[styles.glanceRowLabel, { color: theme.textMuted }]}>Trusted contacts</Text>
        <Text style={[styles.glanceRowValue, { color: theme.text }]}>{trustedLine}</Text>
        <View style={[styles.glanceDivider, { backgroundColor: theme.border }]} />
        <Text style={[styles.glanceRowLabel, { color: theme.textMuted }]}>Last Kid Track session</Text>
        <Text style={[styles.glanceRowValue, { color: theme.text, marginBottom: 0 }]}>{lastKidLine}</Text>
      </View>

      <Text style={[styles.sectionLabel, { color: theme.textMuted, marginTop: 28 }]}>TRUSTED CIRCLE</Text>
      <TouchableOpacity
        style={[styles.linkRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => navigation.navigate('SetupContact')}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Trusted Circle"
      >
        <View style={styles.linkRowInner}>
          <Text style={[styles.linkTitle, { color: theme.text }]}>Trusted Circle</Text>
          <Text style={[styles.linkSubtitle, { color: theme.textMuted }]}>
            Emergency contact and additional trusted contacts for alerts.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={theme.primaryAccent} />
      </TouchableOpacity>

      <Text style={[styles.sectionLabel, { color: theme.textMuted, marginTop: 24 }]}>KID TRACK SCHEDULE</Text>
      <TouchableOpacity
        style={[styles.linkRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => navigation.navigate('KidSchedule')}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Kid Track Schedule"
      >
        <View style={styles.linkRowInner}>
          <Text style={[styles.linkTitle, { color: theme.text }]}>Kid Track Schedule</Text>
          <Text style={[styles.linkSubtitle, { color: theme.textMuted }]}>
            Set a time to be prompted to start Kid Track when the app is open.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={theme.primaryAccent} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  glanceCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  glanceRowLabel: { fontSize: 13, marginBottom: 4 },
  glanceRowValue: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  glanceDivider: { height: 1, marginBottom: 12 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  linkRowInner: { flex: 1, paddingRight: 8 },
  linkTitle: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  linkSubtitle: { fontSize: 14, lineHeight: 20 },
});
