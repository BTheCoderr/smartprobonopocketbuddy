import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
  Linking,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../navigation/types';
import { getSafetyEvents, SafetyEvent } from '../storage/eventStorage';
import { SCENARIO_LABELS } from '../constants/guidance';
import { ScenarioType } from '../types';
import { colors } from '../theme/colors';

type Props = BottomTabScreenProps<TabParamList, 'History'>;

export function HistoryScreen({ navigation }: Props) {
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  useEffect(() => {
    getSafetyEvents().then(setEvents);
  }, []);

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString() + ' at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const openLocation = (link?: string) => {
    if (link) Linking.openURL(link).catch(() => {});
  };

  const shareRecording = async (uri?: string) => {
    if (!uri) return;
    try {
      const available = await Sharing.isAvailableAsync();
      if (available) await Sharing.shareAsync(uri, { mimeType: 'audio/m4a' });
    } catch {
      // User cancelled
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={[styles.title, { color: theme.text }]}>Safety history</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Last 10 events. Tap a location to open in maps.
      </Text>

      {events.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            No events yet. Your safety sessions will appear here.
          </Text>
        </View>
      ) : (
        events.map((evt) => (
          <View
            key={evt.id}
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {SCENARIO_LABELS[evt.scenario as ScenarioType]}
            </Text>
            <Text style={[styles.cardTime, { color: theme.textMuted }]}>
              {formatDate(evt.timestamp)}
            </Text>
            {evt.locationLink ? (
              <TouchableOpacity onPress={() => openLocation(evt.locationLink)}>
                <Text style={[styles.linkText, { color: theme.primaryAccent }]}>
                  View location
                </Text>
              </TouchableOpacity>
            ) : null}
            {evt.recordingUri ? (
              <TouchableOpacity onPress={() => shareRecording(evt.recordingUri)}>
                <Text style={[styles.linkText, { color: theme.primaryAccent }]}>
                  Share recording
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 100 },
  title: { fontSize: 22, fontWeight: '600' },
  subtitle: { fontSize: 15, marginTop: 6, marginBottom: 24 },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { fontSize: 16 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 17, fontWeight: '600' },
  cardTime: { fontSize: 14, marginTop: 4 },
  linkText: { fontSize: 15, marginTop: 8, fontWeight: '500' },
});
