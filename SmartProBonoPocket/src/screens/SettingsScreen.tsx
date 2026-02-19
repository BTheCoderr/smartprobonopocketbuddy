import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TabParamList, RootStackParamList } from '../navigation/types';
import { getEmergencyContact } from '../storage/contactStorage';
import {
  getRecordingEnabled,
  setRecordingEnabled,
  getAutoShare,
  setAutoShare,
  getPresetMode,
  setPresetMode,
  getPipModeEnabled,
  setPipModeEnabled,
  type PresetMode,
} from '../storage/settingsStorage';
import { deleteAllRecordings } from '../utils/recordingUtils';
import { colors } from '../theme/colors';

type Props = {
  navigation: CompositeNavigationProp<
    BottomTabNavigationProp<TabParamList, 'Settings'>,
    NativeStackNavigationProp<RootStackParamList>
  >;
};

export function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [recordingOn, setRecordingOn] = useState(true);
  const [autoShareOn, setAutoShareOn] = useState(false);
  const [pipOn, setPipOn] = useState(false);
  const [hasContact, setHasContact] = useState(false);
  const [preset, setPreset] = useState<PresetMode>('audio');

  useEffect(() => {
    getEmergencyContact().then((c) => setHasContact(!!c));
  }, []);
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  useEffect(() => {
    getRecordingEnabled().then(setRecordingOn);
    getAutoShare().then(setAutoShareOn);
    getPipModeEnabled().then(setPipOn);
    getPresetMode().then(setPreset);
  }, []);

  const handleRecordingToggle = (v: boolean) => {
    setRecordingOn(v);
    setRecordingEnabled(v);
  };

  const handleAutoShareToggle = (v: boolean) => {
    setAutoShareOn(v);
    setAutoShare(v);
  };

  const handlePipToggle = (v: boolean) => {
    if (v) {
      Alert.alert(
        'Coming soon',
        'Floating window (PiP) mode will let you see recording in a small window when you switch apps—like Facebook, FaceTime, or WhatsApp. Enable this when your state allows it. Requires a future app update.',
        [
          { text: 'Cancel', onPress: () => {}, style: 'cancel' },
          { text: 'Enable when ready', onPress: () => { setPipOn(true); setPipModeEnabled(true); } },
        ]
      );
    } else {
      setPipOn(false);
      setPipModeEnabled(false);
    }
  };

  const handleDeleteRecordings = () => {
    Alert.alert(
      'Delete all recordings',
      'This will delete all recording files. Your event history (dates, times, locations) will be kept. You can delete events one by one in History if needed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete recordings',
          style: 'destructive',
          onPress: () => {
            deleteAllRecordings()
              .then(() => Alert.alert('Done', 'All recordings have been deleted.'))
              .catch((err) => {
                console.error('deleteAllRecordings failed:', err);
                Alert.alert('Error', 'Could not delete. Please try again.');
              });
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.scrollContent, { paddingTop: 24 + insets.top }]}
    >
      <Text style={[styles.sectionTitle, styles.sectionTitleFirst, { color: theme.text }]}>Emergency Contact</Text>
      <TouchableOpacity
        style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => navigation.navigate('SetupContact')}
      >
        <Text style={[styles.rowLabel, { color: theme.text }]}>
          {hasContact ? 'Emergency contact configured' : 'Set emergency contact'}
        </Text>
        <Text style={[styles.editLink, { color: theme.primary }]}>Edit</Text>
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Recording</Text>
      <Text style={[styles.rowHint, { color: theme.textMuted }]}>Emergency Mode preset</Text>
      <View style={styles.presetRow}>
        {(['audio', 'video', 'both', 'auto'] as const).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.presetButton,
              { backgroundColor: theme.surface, borderColor: theme.border },
              preset === mode && { backgroundColor: theme.primary, borderColor: theme.primary },
            ]}
            onPress={() => {
              setPreset(mode);
              setPresetMode(mode);
            }}
          >
            <Text
              style={[
                styles.presetButtonText,
                { color: preset === mode ? '#FFFFFF' : theme.text },
              ]}
            >
              {mode === 'audio' ? 'Audio only' : mode === 'video' ? 'Video only' : mode === 'both' ? 'Audio + Video' : 'Auto'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.rowHint, { color: theme.textMuted }]}>
        Record tab uses your preset. Video (with audio) when Video/Audio+Video selected. Safety Mode uses audio for now. Video stops when you leave the app; audio continues in background.
      </Text>
      <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>Floating window (PiP)</Text>
        <Switch
          value={pipOn}
          onValueChange={handlePipToggle}
        />
      </View>
      <Text style={[styles.rowHint, { color: theme.textMuted }]}>
        When on, a small recording window stays visible when you switch apps (like FaceTime/WhatsApp). Opt-in if your state allows. Coming soon.
      </Text>
      <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>Recording enabled</Text>
        <Switch value={recordingOn} onValueChange={handleRecordingToggle} />
      </View>
      <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>Auto-share to emergency contact after stop</Text>
        <Switch value={autoShareOn} onValueChange={handleAutoShareToggle} />
      </View>
      <Text style={[styles.rowHint, { color: theme.textMuted }]}>
        When on, the share dialog will open automatically after you stop recording. Default: OFF.
      </Text>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Data & Privacy</Text>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.privacyText, { color: theme.text }]}>
          Recordings stay on your phone unless you share them. We do not upload recordings to any server.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.deleteButton, { borderColor: theme.border }]}
        onPress={handleDeleteRecordings}
      >
        <Text style={[styles.deleteButtonText, { color: theme.textMuted }]}>
          Delete all recordings
        </Text>
      </TouchableOpacity>
      <Text style={[styles.rowHint, { color: theme.textMuted, marginTop: 4 }]}>
        Keeps event history. Or select items in History to delete specific ones.
      </Text>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Siri</Text>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.privacyText, { color: theme.text }]}>
          "Hey Siri, start SmartPocketBuddy recording" — Coming in a future update. Siri Shortcuts require a full app build (not Expo Go).
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 100, paddingTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, marginTop: 24 },
  presetRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  presetButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  presetButtonText: { fontSize: 14, fontWeight: '500' },
  sectionTitleFirst: { marginTop: 0 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  rowLabel: { fontSize: 16, flex: 1, flexShrink: 1 },
  editLink: { fontSize: 16, fontWeight: '500' },
  rowHint: { fontSize: 13, marginTop: 4, marginBottom: 8, flexWrap: 'wrap' },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  privacyText: { fontSize: 15, lineHeight: 22, flexWrap: 'wrap' },
  deleteButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  deleteButtonText: { fontSize: 16 },
});
