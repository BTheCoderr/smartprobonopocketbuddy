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
  const [recordingOn, setRecordingOn] = useState(true);
  const [autoShareOn, setAutoShareOn] = useState(false);
  const [hasContact, setHasContact] = useState(false);

  useEffect(() => {
    getEmergencyContact().then((c) => setHasContact(!!c));
  }, []);
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  useEffect(() => {
    getRecordingEnabled().then(setRecordingOn);
    getAutoShare().then(setAutoShareOn);
  }, []);

  const handleRecordingToggle = (v: boolean) => {
    setRecordingOn(v);
    setRecordingEnabled(v);
  };

  const handleAutoShareToggle = (v: boolean) => {
    setAutoShareOn(v);
    setAutoShare(v);
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'Delete all recordings',
      'This will permanently delete all saved recordings from your device. Event history will keep timestamps and location links, but recording references will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all',
          style: 'destructive',
          onPress: async () => {
            await deleteAllRecordings();
            Alert.alert('Done', 'All recordings have been deleted.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}
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
        onPress={handleDeleteAll}
      >
        <Text style={[styles.deleteButtonText, { color: theme.textMuted }]}>
          Delete all recordings
        </Text>
      </TouchableOpacity>

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
  scrollContent: { padding: 24, paddingBottom: 100 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, marginTop: 24 },
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
  rowLabel: { fontSize: 16, flex: 1 },
  editLink: { fontSize: 16, fontWeight: '500' },
  rowHint: { fontSize: 13, marginTop: 4, marginBottom: 8 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  privacyText: { fontSize: 15, lineHeight: 22 },
  deleteButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  deleteButtonText: { fontSize: 16 },
});
