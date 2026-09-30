import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Button } from '../components/Button';
import { colors } from '../theme/colors';
import {
  clearPersistedActiveSession,
  getPersistedActiveSession,
} from '../storage/liveSessionStorage';
import { saveSessionHistoryEvent } from '../storage/eventStorage';
import { recoverPersistedSession } from '../services/sessionService';
import type { LiveSessionRecord } from '../types/session';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Recovery'>;
};

function modeLabel(mode: LiveSessionRecord['mode']): string {
  if (mode === 'travel') return 'Travel Mode';
  if (mode === 'kid_track') return 'Kid Track';
  return 'Safety Mode';
}

export function RecoveryScreen({ navigation }: Props) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;
  const [session, setSession] = useState<LiveSessionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    getPersistedActiveSession()
      .then((value) => {
        if (!value || value.status !== 'active') {
          navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
          return;
        }
        setSession(value);
      })
      .finally(() => setLoading(false));
  }, [navigation]);

  const started = useMemo(() => {
    if (!session) return '—';
    const date = new Date(session.startedAt);
    return Number.isNaN(date.getTime()) ? session.startedAt : date.toLocaleString();
  }, [session]);

  const resume = async () => {
    if (!session || working) return;
    setWorking(true);
    try {
      const restored = await recoverPersistedSession();
      if (!restored) {
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
        return;
      }
      navigation.reset({
        index: 1,
        routes: [
          { name: 'Main' },
          {
            name: 'Active',
            params: {
              sessionMode: restored.mode,
              locationLink: restored.initialLocationLink,
              arrivalCheckMinutes: restored.arrivalCheckMinutes ?? null,
            },
          },
        ],
      });
    } catch {
      Alert.alert('Could not resume', 'The saved session is still on this device. Please try again or end and save it.');
    } finally {
      setWorking(false);
    }
  };

  const endAndSave = async () => {
    if (!session || working) return;
    setWorking(true);
    try {
      await saveSessionHistoryEvent(session.mode, {
        timestamp: session.startedAt,
        locationLink: session.initialLocationLink,
        status: 'partial',
        route: session.route.length ? session.route : undefined,
        label: `Interrupted ${modeLabel(session.mode)} session`,
      });
      await clearPersistedActiveSession();
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch {
      Alert.alert('Could not save', 'The interrupted session was not deleted. Please try again.');
    } finally {
      setWorking(false);
    }
  };

  const discard = () => {
    if (!session || working) return;
    Alert.alert(
      'Discard interrupted session?',
      'This removes the saved route for this interrupted session from the device.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            setWorking(true);
            try {
              await clearPersistedActiveSession();
              navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
            } finally {
              setWorking(false);
            }
          },
        },
      ]
    );
  };

  if (loading || !session) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primaryAccent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.eyebrow, { color: theme.primaryAccent }]}>SESSION RECOVERY</Text>
      <Text style={[styles.title, { color: theme.text }]}>You had an active {modeLabel(session.mode)} session.</Text>
      <Text style={[styles.body, { color: theme.textMuted }]}>
        SmartProBono found the session after the app was interrupted. Nothing was silently deleted.
      </Text>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.label, { color: theme.textMuted }]}>Started</Text>
        <Text style={[styles.value, { color: theme.text }]}>{started}</Text>
        <Text style={[styles.label, { color: theme.textMuted }]}>Saved route points</Text>
        <Text style={[styles.value, { color: theme.text }]}>{session.route.length}</Text>
      </View>

      <Button title="Resume session" onPress={() => void resume()} loading={working} disabled={working} />
      <Button
        title="End & save to History"
        onPress={() => void endAndSave()}
        variant="secondary"
        disabled={working}
        style={styles.secondary}
      />
      <Button
        title="Discard"
        onPress={discard}
        variant="secondary"
        disabled={working}
        style={styles.secondary}
      />

      <Text style={[styles.note, { color: theme.textMuted }]}>
        Resuming restarts foreground location tracking and continues the saved route on this device.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 72, paddingBottom: 32 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', marginBottom: 12 },
  body: { fontSize: 16, lineHeight: 23, marginBottom: 24 },
  card: { borderWidth: 1, borderRadius: 16, padding: 18, marginBottom: 24 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  value: { fontSize: 17, fontWeight: '600', marginBottom: 16 },
  secondary: { marginTop: 10 },
  note: { fontSize: 13, lineHeight: 19, marginTop: 20, textAlign: 'center' },
});
