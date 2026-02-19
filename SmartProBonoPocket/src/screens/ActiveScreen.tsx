import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Modal,
  ActivityIndicator,
  Alert,
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
import { waitForRecordingFinalized } from '../utils/recordingUtils';
import { getRecordingEnabled, getAutoShare } from '../storage/settingsStorage';
import { getEmergencyContact } from '../storage/contactStorage';
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
  const [recordingFailed, setRecordingFailed] = useState(false);
  const [ending, setEnding] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [tempUri, setTempUri] = useState<string | null>(null);
  const [savedDuration, setSavedDuration] = useState(0);
  const [safeIsRecording, setSafeIsRecording] = useState(false);
  const [safeDuration, setSafeDuration] = useState(0);
  const [localDuration, setLocalDuration] = useState(0);
  const recordingStartRef = useRef<number | null>(null);
  const recorderRef = useRef(recorder);
  const recorderStateRef = useRef(recorderState);
  recorderRef.current = recorder;
  recorderStateRef.current = recorderState;
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  const recordingActive = safeIsRecording || (autoStarted && !showShareModal);
  const elapsedSec = Math.max(safeDuration, localDuration);

  useEffect(() => {
    if (!recordingActive) return;
    const id = setInterval(() => {
      if (recordingStartRef.current != null) {
        setLocalDuration(Math.floor((Date.now() - recordingStartRef.current) / 1000));
      }
    }, 500);
    return () => clearInterval(id);
  }, [recordingActive]);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      try {
        const state = recorderStateRef.current;
        setSafeIsRecording(state.isRecording);
        setSafeDuration(Math.floor(state.durationMillis / 1000));
      } catch {
        // NativeSharedObjectNotFoundException when recorder disposed during unmount
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => {
      cancelled = true;
      clearInterval(id);
      // Do NOT call recorder.stop() here. React Strict Mode runs cleanup on "unmount"
      // which would stop recording ~1s after start. User must explicitly tap End.
    };
  }, []);

  const startSafetyRecording = async () => {
    if (autoStarted && !recordingFailed) return;
    if (__DEV__) console.log('[Active] startSafetyRecording called');
    try {
      const enabled = await getRecordingEnabled();
      setRecordingEnabled(enabled);
      if (__DEV__) console.log('[Active] recording enabled:', enabled);
      if (!enabled) return;
      const { granted } = await requestRecordingPermissionsAsync();
      if (__DEV__) console.log('[Active] mic permission:', granted);
      if (!granted) {
        setRecordingFailed(true);
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'duckOthers',
      });
      if (__DEV__) console.log('[Active] prepareToRecordAsync');
      await recorder.prepareToRecordAsync();
      recorder.record();
      if (__DEV__) console.log('[Active] record() started');
      recordingStartRef.current = Date.now();
      setLocalDuration(0);
      setAutoStarted(true);
      setRecordingFailed(false);
    } catch (e) {
      if (__DEV__) console.warn('[Active] startSafetyRecording error:', e);
      setRecordingFailed(true);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      startSafetyRecording();
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const closeModalAndGoBack = () => {
    setShowShareModal(false);
    setTempUri(null);
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  const handleEnd = async () => {
    setEnding(true);
    recordingStartRef.current = null;
    try {
      const { isRecording: recOn } = safeGetRecordingState(recorder);
      if (recOn) {
        try {
          await recorder.stop();
          await waitForRecordingFinalized(recorder.uri ?? undefined, elapsedSec);
        } catch {
          // Native bridge may be gone
        }
      }
      let uri: string | undefined;
      try {
        uri = recorder.uri;
      } catch {
        uri = undefined;
      }
      const duration = Math.max(elapsedSec, 1);
      setSavedDuration(duration);

      if (uri) {
        setTempUri(uri);
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
        await addSafetyEvent({
          scenario: 'other',
          timestamp: new Date().toISOString(),
          locationLink,
          status: locationLink ? 'completed' : 'partial',
        });
        setEnding(false);
        closeModalAndGoBack();
        return;
      }

      setEnding(false);
      setShowShareModal(true);
    } catch {
      setEnding(false);
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    }
  };

  const handleSave = async () => {
    if (!tempUri) return;
    try {
      const destUri = await saveRecording(tempUri, savedDuration, {
        scenario: 'other',
        locationLink,
        shareStatus: 'saved',
      });
      await addSafetyEvent({
        scenario: 'other',
        timestamp: new Date().toISOString(),
        locationLink,
        recordingUri: destUri,
        status: locationLink ? 'completed' : 'partial',
      });
      setShowShareModal(false);
      setTempUri(null);
      Alert.alert('Saved', 'Recording saved locally on your device.', [
        { text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Main' }] }) },
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
      const destUri = await saveRecording(tempUri, savedDuration, {
        scenario: 'other',
        locationLink,
        shareStatus: 'shared',
      });
      await addSafetyEvent({
        scenario: 'other',
        timestamp: new Date().toISOString(),
        locationLink,
        recordingUri: destUri,
        status: locationLink ? 'completed' : 'partial',
      });
      closeModalAndGoBack();
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
      const destUri = await saveRecording(tempUri, savedDuration, {
        scenario: 'other',
        locationLink,
        shareStatus: 'shared',
      });
      await addSafetyEvent({
        scenario: 'other',
        timestamp: new Date().toISOString(),
        locationLink,
        recordingUri: destUri,
        status: locationLink ? 'completed' : 'partial',
      });
      closeModalAndGoBack();
    } catch (e) {
      Alert.alert('Share', 'Could not share recording.');
    }
  };

  const handleDelete = () => {
    addSafetyEvent({
      scenario: 'other',
      timestamp: new Date().toISOString(),
      locationLink,
      status: locationLink ? 'completed' : 'partial',
    });
    closeModalAndGoBack();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.indicatorRow,
          {
            backgroundColor: theme.surface,
            borderColor: recordingActive ? theme.primaryAccent : theme.border,
            borderWidth: recordingActive ? 2 : 1,
          },
        ]}
      >
        {recordingEnabled && recordingActive && (
          <View style={[styles.recDot, { backgroundColor: theme.recordingDot }]} />
        )}
        <Text style={[styles.timer, { color: theme.text }]}>{formatTime(elapsedSec)}</Text>
      </View>
      {recordingEnabled && recordingActive && (
        <Text style={[styles.recordingHint, { color: theme.textMuted }]}>
          Recording… Tap End Safety Mode when you&apos;re done.
        </Text>
      )}
      {recordingEnabled && recordingFailed && (
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.surface, borderColor: theme.primaryAccent }]}
          onPress={startSafetyRecording}
        >
          <Text style={[styles.retryText, { color: theme.primaryAccent }]}>
            Recording didn&apos;t start — tap here to try again
          </Text>
        </TouchableOpacity>
      )}

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
            <Text style={[styles.modalTitle, { color: theme.text }]}>Recording complete</Text>
            {tempUri ? (
              <>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: theme.primary }]}
                  onPress={handleSave}
                >
                  <Text style={styles.modalButtonText}>Save (local)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { borderColor: theme.border }]}
                  onPress={handleShareToContact}
                >
                  <Text style={[styles.modalButtonTextAlt, { color: theme.text }]}>
                    Share to emergency contact
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { borderColor: theme.border }]}
                  onPress={handleShare}
                >
                  <Text style={[styles.modalButtonTextAlt, { color: theme.text }]}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { borderColor: theme.border }]}
                  onPress={handleDelete}
                >
                  <Text style={[styles.modalButtonTextAlt, { color: theme.textMuted }]}>
                    Delete recording
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.modalButton, { borderColor: theme.border }]}
                onPress={closeModalAndGoBack}
              >
                <Text style={[styles.modalButtonTextAlt, { color: theme.text }]}>Done</Text>
              </TouchableOpacity>
            )}
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
    paddingVertical: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  recDot: { width: 6, height: 6, borderRadius: 3 },
  timer: { fontSize: 28, fontWeight: '600' },
  recordingHint: { fontSize: 14, textAlign: 'center', marginTop: 8 },
  retryButton: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  retryText: { fontSize: 15, fontWeight: '600' },
  checklistContainer: { flex: 1, justifyContent: 'center', marginVertical: 24 },
  checklistTitle: { fontSize: 14, marginBottom: 16, textAlign: 'center' },
  checklistItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  checklistText: { fontSize: 17, fontWeight: '500' },
  scriptCard: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  scriptLabel: { fontSize: 13, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  scriptText: { fontSize: 16, lineHeight: 24, fontStyle: 'italic' },
  endButton: {
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
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
