import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Modal,
  ActivityIndicator,
} from 'react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import * as Sharing from 'expo-sharing';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { saveRecording } from '../storage/recordingStorage';
import { addSafetyEvent } from '../storage/eventStorage';
import { getRecordingEnabled } from '../storage/settingsStorage';
import { colors } from '../theme/colors';

const CHECKLIST = [
  'Hands visible',
  'Speak slowly',
  'Ask before reaching',
  'Only answer what\'s asked',
];

const DEESCALATION_SCRIPT =
  'Officer, I want to cooperate. My license and registration are [location]. May I reach for them?';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Active'>;
  route: RouteProp<RootStackParamList, 'Active'>;
};

/** Safe read of recorder state - native bridge can throw NativeSharedObjectNotFoundException */
function safeGetRecordingState(recorder: ReturnType<typeof useAudioRecorder>) {
  try {
    return { isRecording: recorder.isRecording, uri: recorder.uri };
  } catch {
    return { isRecording: false, uri: undefined };
  }
}

export function ActiveScreen({ navigation, route }: Props) {
  const { locationLink } = route.params ?? {};
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [recordingEnabled, setRecordingEnabled] = useState(true);
  const [autoStarted, setAutoStarted] = useState(false);
  const [ending, setEnding] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [savedUri, setSavedUri] = useState<string | null>(null);
  const [safeIsRecording, setSafeIsRecording] = useState(false);
  const [safeDuration, setSafeDuration] = useState(0);
  const recorderRef = useRef(recorder);
  recorderRef.current = recorder;
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      try {
        setSafeIsRecording(recorderState.isRecording);
        setSafeDuration(Math.floor(recorderState.durationMillis / 1000));
      } catch {
        // Native bridge disconnected - keep last values
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
        // Native bridge gone - ignore
      }
    };
  }, [recorderState]);

  const isRecording = safeIsRecording;
  const durationSec = safeDuration;

  useEffect(() => {
    const init = async () => {
      const enabled = await getRecordingEnabled();
      setRecordingEnabled(enabled);
      if (enabled) {
        try {
          const { granted } = await requestRecordingPermissionsAsync();
          if (granted) {
            await setAudioModeAsync({
              allowsRecording: true,
              playsInSilentMode: true,
              shouldPlayInBackground: false,
              interruptionMode: 'duckOthers',
            });
            await recorder.prepareToRecordAsync();
            recorder.record();
            setAutoStarted(true);
          }
        } catch {
          // Recording failed - continue without
        }
      }
    };
    init();
  }, []);

  const handleEnd = async () => {
    setEnding(true);
    try {
      const { isRecording: recOn, uri } = safeGetRecordingState(recorder);
      if (recOn) {
        try {
          await recorder.stop();
        } catch {
          // Native bridge may be gone
        }
      }
      const duration = Math.max(durationSec, 1);
      const timestamp = new Date().toISOString();

      if (uri) {
        const destUri = await saveRecording(uri, duration, {
          scenario: 'other',
          locationLink,
          shareStatus: 'saved',
        });
        setSavedUri(destUri);
      }

      await addSafetyEvent({
        scenario: 'other',
        timestamp,
        locationLink,
        recordingUri: uri,
        status: locationLink ? 'completed' : 'partial',
      });

      setEnding(false);
      setShowShareModal(true);
    } catch {
      setEnding(false);
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    }
  };

  const handleShare = async () => {
    if (!savedUri) {
      setShowShareModal(false);
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      return;
    }
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(savedUri, { mimeType: 'audio/m4a' });
      }
    } catch {
      // User cancelled
    }
    setShowShareModal(false);
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  const handleDone = () => {
    setShowShareModal(false);
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.indicatorRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {recordingEnabled && isRecording && (
          <View style={[styles.recDot, { backgroundColor: theme.recordingDot }]} />
        )}
        <Text style={[styles.timer, { color: theme.text }]}>{formatTime(durationSec)}</Text>
      </View>

      <View style={styles.checklistContainer}>
        <Text style={[styles.checklistTitle, { color: theme.textMuted }]}>Stay calm</Text>
        {CHECKLIST.map((item, i) => (
          <View
            key={i}
            style={[styles.checklistItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Text style={[styles.checklistText, { color: theme.text }]}>{item}</Text>
          </View>
        ))}
        <View
          style={[styles.scriptCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Text style={[styles.scriptLabel, { color: theme.textMuted }]}>You can say:</Text>
          <Text style={[styles.scriptText, { color: theme.text }]}>{DEESCALATION_SCRIPT}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.endButton, { backgroundColor: theme.primaryAccent }]}
        onPress={handleEnd}
        disabled={ending}
      >
        {ending ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.endButtonText}>End Safety Mode</Text>
        )}
      </TouchableOpacity>

      <Modal visible={showShareModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Safety Mode ended</Text>
            <Text style={[styles.modalSubtext, { color: theme.textMuted }]}>
              {savedUri ? 'Recording saved locally.' : 'Session saved.'}
            </Text>
            {savedUri && (
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.primaryAccent }]}
                onPress={handleShare}
              >
                <Text style={styles.modalButtonText}>Share</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.modalButton, { borderColor: theme.border }]}
              onPress={handleDone}
            >
              <Text style={[styles.modalButtonTextAlt, { color: theme.text }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'space-between', paddingBottom: 48 },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  recDot: { width: 6, height: 6, borderRadius: 3 },
  timer: { fontSize: 28, fontWeight: '600' },
  checklistContainer: { flex: 1, justifyContent: 'center', marginVertical: 24 },
  checklistTitle: { fontSize: 14, marginBottom: 16, textAlign: 'center' },
  checklistItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  checklistText: { fontSize: 17, fontWeight: '500' },
  scriptCard: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  scriptLabel: { fontSize: 13, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  scriptText: { fontSize: 16, lineHeight: 24, fontStyle: 'italic' },
  endButton: {
    paddingVertical: 20,
    borderRadius: 14,
    alignItems: 'center',
  },
  endButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: { borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  modalSubtext: { fontSize: 15, marginBottom: 24, textAlign: 'center' },
  modalButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
  },
  modalButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  modalButtonTextAlt: { fontSize: 16 },
});
