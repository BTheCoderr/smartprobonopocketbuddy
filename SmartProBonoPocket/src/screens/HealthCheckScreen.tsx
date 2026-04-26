import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import { colors } from '../theme/colors';
import { getEmergencyContact, getAdditionalContacts } from '../storage/contactStorage';
import { getKidSchedule } from '../storage/kidScheduleStorage';
import { getPersistedActiveSession } from '../storage/liveSessionStorage';
import {
  getRecordingEnabled,
  getAutoShare,
  getPresetMode,
  getPipModeEnabled,
  getCalmGuidanceEnabled,
  hasCompletedOnboarding,
} from '../storage/settingsStorage';
import { getCurrentSession } from '../services/sessionService';

type Row = { label: string; value: string };
type Section = { title: string; rows: Row[] };

function statusDot(ok: boolean): string {
  return ok ? '●' : '○';
}

function ts(iso: string | undefined | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function HealthCheckScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;
  const [sections, setSections] = useState<Section[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function gather(): Promise<Section[]> {
        const manifest = Constants.expoConfig;

        const appInfo: Section = {
          title: 'App',
          rows: [
            { label: 'Version', value: manifest?.version ?? '—' },
            { label: 'SDK', value: manifest?.sdkVersion ?? '—' },
            { label: 'Bundle ID', value: (manifest?.ios?.bundleIdentifier ?? manifest?.android?.package ?? '—') },
            { label: 'Platform', value: `${Platform.OS} ${Platform.Version}` },
            { label: 'Dev mode', value: __DEV__ ? 'Yes' : 'No' },
            { label: 'Color scheme', value: colorScheme ?? 'light' },
          ],
        };

        const session = getCurrentSession();
        const memSession: Section = {
          title: 'Session (memory)',
          rows: [
            { label: 'Active', value: session?.isActive ? `${statusDot(true)} Yes` : `${statusDot(false)} No` },
            ...(session
              ? [
                  { label: 'Type', value: session.type },
                  { label: 'Started', value: ts(new Date(session.startedAt).toISOString()) },
                  { label: 'Route points', value: String(session.routePointCount) },
                ]
              : []),
          ],
        };

        const persisted = await getPersistedActiveSession();
        const diskSession: Section = {
          title: 'Session (persisted)',
          rows: [
            { label: 'Exists', value: persisted ? `${statusDot(true)} Yes` : `${statusDot(false)} No` },
            ...(persisted
              ? [
                  { label: 'Mode', value: persisted.mode },
                  { label: 'Status', value: persisted.status },
                  { label: 'Started', value: ts(persisted.startedAt) },
                  { label: 'Route points', value: String(persisted.route?.length ?? 0) },
                ]
              : []),
          ],
        };

        const primaryContact = await getEmergencyContact();
        const additionalContacts = await getAdditionalContacts();
        const contactInfo: Section = {
          title: 'Contacts',
          rows: [
            { label: 'Emergency contact', value: primaryContact ? `${statusDot(true)} Configured` : `${statusDot(false)} Not set` },
            { label: 'Trusted circle', value: `${additionalContacts.length} additional` },
          ],
        };

        const kidSchedule = await getKidSchedule();
        const kidInfo: Section = {
          title: 'Kid Schedule',
          rows: [
            { label: 'Enabled', value: kidSchedule.enabled ? `${statusDot(true)} Yes` : `${statusDot(false)} No` },
            { label: 'Days configured', value: String(kidSchedule.weekDays.length) },
            { label: 'Time', value: `${String(kidSchedule.hour).padStart(2, '0')}:${String(kidSchedule.minute).padStart(2, '0')}` },
          ],
        };

        const [recording, autoShare, preset, pip, calmGuidance, onboarded] = await Promise.all([
          getRecordingEnabled(),
          getAutoShare(),
          getPresetMode(),
          getPipModeEnabled(),
          getCalmGuidanceEnabled(),
          hasCompletedOnboarding(),
        ]);
        const settingsInfo: Section = {
          title: 'Settings',
          rows: [
            { label: 'Recording enabled', value: recording ? 'Yes' : 'No' },
            { label: 'Auto-share', value: autoShare ? 'Yes' : 'No' },
            { label: 'Preset mode', value: preset },
            { label: 'PiP mode', value: pip ? 'Yes' : 'No' },
            { label: 'Calm guidance', value: calmGuidance ? 'Yes' : 'No' },
            { label: 'Onboarding complete', value: onboarded ? 'Yes' : 'No' },
          ],
        };

        let locationStatus = '—';
        let cameraStatus = '—';
        let micStatus = '—';
        try {
          const locPerm = await Location.getForegroundPermissionsAsync();
          locationStatus = locPerm.status;
        } catch { /* ignore */ }
        try {
          const camPerm = await Camera.getCameraPermissionsAsync();
          cameraStatus = camPerm.status;
        } catch { /* ignore */ }
        try {
          const micPerm = await Camera.getMicrophonePermissionsAsync();
          micStatus = micPerm.status;
        } catch { /* ignore */ }

        const permInfo: Section = {
          title: 'Permissions',
          rows: [
            { label: 'Location', value: locationStatus },
            { label: 'Camera', value: cameraStatus },
            { label: 'Microphone', value: micStatus },
          ],
        };

        return [appInfo, memSession, diskSession, contactInfo, kidInfo, settingsInfo, permInfo];
      }

      gather().then((s) => {
        if (!cancelled) setSections(s);
      });

      return () => {
        cancelled = true;
      };
    }, [colorScheme]),
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.content, { paddingTop: 12, paddingBottom: 40 + insets.bottom }]}
    >
      <Text style={[styles.header, { color: theme.textMuted }]}>
        Read-only diagnostic snapshot. No secrets are shown.
      </Text>

      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{section.title}</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {section.rows.map((row, i) => (
              <View
                key={row.label}
                style={[
                  styles.row,
                  i < section.rows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                ]}
              >
                <Text style={[styles.label, { color: theme.textMuted }]}>{row.label}</Text>
                <Text style={[styles.value, { color: theme.text }]} selectable>{row.value}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  header: { fontSize: 13, textAlign: 'center', marginBottom: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  card: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  label: { fontSize: 14, flexShrink: 0 },
  value: { fontSize: 14, fontWeight: '500', textAlign: 'right', flexShrink: 1, marginLeft: 12 },
});
