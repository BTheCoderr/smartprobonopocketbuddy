import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Alert,
  Modal,
} from 'react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import * as Sharing from 'expo-sharing';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { TabParamList, RootStackParamList } from '../navigation/types';
import { saveRecording } from '../storage/recordingStorage';
import { getEmergencyContact } from '../storage/contactStorage';
import { getAutoShare } from '../storage/settingsStorage';
import { colors } from '../theme/colors';

const RECORDING_DISCLAIMER =
  'Recording laws vary by state. You are responsible for complying with local laws.';

type RecordingNav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Record'>,
  NativeStackNavigationProp<RootStackParamList>
>;
type RecordingRoute = RouteProp<TabParamList, 'Record'> | RouteProp<RootStackParamList, 'Recording'>;
type Props = { navigation: RecordingNav; route: RecordingRoute };

export function RecordingScreen({ navigation, route }: Props) {
  const scenario = route.params?.scenario;
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [showActions, setShowActions] = useState(false);
  const [tempUri, setTempUri] = useState<string | null>(null);
  const [safeIsRecording, setSafeIsRecording] = useState(false);
  const [safeDuration, setSafeDuration] = useState(0);
  const recorderRef = useRef(recorder);
  recorderRef.current = recorder;
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  const isRecording = safeIsRecording;
  const duration = safeDuration;

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      try {
        setSafeIsRecording(recorderState.isRecording);
        setSafeDuration(Math.floor(recorderState.durationMillis / 1000));
      } catch {
        // Native bridge may throw
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => {
      cancelled = true;
      clearInterval(id);
      try {
        const r = recorderRef.current;
        if (r?.isRecording) r.stop().catch(() => {});
      } catch {
        // Native bridge gone
      }
    };
  }, [recorderState]);

  const startRecording = async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert(
          'Microphone access',
          'Allow microphone access to record. You can enable it in Settings.'
        );
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'duckOthers',
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e) {
      Alert.alert('Recording', 'Could not start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    try {
      try {
        await recorder.stop();
      } catch {
        // Native bridge may have disconnected
      }
      let uri: string | undefined;
      try {
        uri = recorder.uri;
      } catch {
        uri = undefined;
      }
      if (uri) {
        setTempUri(uri);
        setShowActions(true);
        const autoShare = await getAutoShare();
        if (autoShare) {
          const contact = await getEmergencyContact();
          const contactName = contact?.name ?? 'emergency contact';
          try {
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
              await Sharing.shareAsync(uri, {
                mimeType: 'audio/m4a',
                dialogTitle: `Share to ${contactName}`,
              });
            }
          } catch {
            // User cancelled or share failed
          }
        }
      } else {
        navigation.goBack();
      }
    } catch {
      navigation.goBack();
    }
  };

  const handleSave = async () => {
    if (!tempUri) return;
    try {
      await saveRecording(tempUri, duration);
      setShowActions(false);
      setTempUri(null);
      Alert.alert('Saved', 'Recording saved locally on your device.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', 'Could not save recording.');
    }
  };

  const handleShareToContact = async () => {
    if (!tempUri) return;
    try {
      const contact = await getEmergencyContact();
      const contactName = contact?.name ?? 'emergency contact';
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(tempUri, {
          mimeType: 'audio/m4a',
          dialogTitle: `Share to ${contactName}`,
        });
      }
      setShowActions(false);
      setTempUri(null);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Share', 'Could not share recording.');
    }
  };

  const handleShare = async () => {
    if (!tempUri) return;
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(tempUri, { mimeType: 'audio/m4a' });
      }
      setShowActions(false);
      setTempUri(null);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Share', 'Could not share recording.');
    }
  };

  const handleDelete = () => {
    setShowActions(false);
    setTempUri(null);
    navigation.goBack();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.disclaimer, { color: theme.textMuted }]}>
        {RECORDING_DISCLAIMER}
      </Text>

      {!isRecording && !showActions && (
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: theme.primary }]}
          onPress={startRecording}
        >
          <Text style={styles.startButtonText}>Start Recording</Text>
        </TouchableOpacity>
      )}

      {isRecording && (
        <>
          <View style={[styles.indicator, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.dot, { backgroundColor: theme.primary }]} />
            <Text style={[styles.timer, { color: theme.text }]}>{formatTime(duration)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.stopButton, { borderColor: theme.border }]}
            onPress={stopRecording}
          >
            <Text style={[styles.stopButtonText, { color: theme.text }]}>Stop</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        style={[styles.backButton, { borderColor: theme.border }]}
        onPress={() => navigation.goBack()}
      >
        <Text style={[styles.backButtonText, { color: theme.text }]}>Go back</Text>
      </TouchableOpacity>

      <Modal visible={showActions} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Recording complete</Text>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.primary }]} onPress={handleSave}>
              <Text style={styles.modalButtonText}>Save (local)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, { borderColor: theme.border }]} onPress={handleShareToContact}>
              <Text style={[styles.modalButtonTextAlt, { color: theme.text }]}>Share to emergency contact</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, { borderColor: theme.border }]} onPress={handleShare}>
              <Text style={[styles.modalButtonTextAlt, { color: theme.text }]}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, { borderColor: theme.border }]} onPress={handleDelete}>
              <Text style={[styles.modalButtonTextAlt, { color: theme.textMuted }]}>Delete recording</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  disclaimer: { fontSize: 12, textAlign: 'center', marginBottom: 24, lineHeight: 18 },
  startButton: {
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  startButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
    gap: 12,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  timer: { fontSize: 24, fontWeight: '500' },
  stopButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  stopButtonText: { fontSize: 16, fontWeight: '600' },
  backButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  backButtonText: { fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 20, textAlign: 'center' },
  modalButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
  },
  modalButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  modalButtonTextAlt: { fontSize: 16 },
});
