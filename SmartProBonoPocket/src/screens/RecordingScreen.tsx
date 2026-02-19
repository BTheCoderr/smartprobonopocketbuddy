import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Alert,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { CompositeNavigationProp, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { TabParamList, RootStackParamList } from '../navigation/types';
import { ScenarioType } from '../types';
import { saveRecording } from '../storage/recordingStorage';
import { addSafetyEvent } from '../storage/eventStorage';
import { waitForRecordingFinalized } from '../utils/recordingUtils';
import { getEmergencyContact } from '../storage/contactStorage';
import { getAutoShare, getPresetMode, type PresetMode } from '../storage/settingsStorage';
import { colors } from '../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const [preset, setPreset] = useState<PresetMode>('audio');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const videoRecordPromiseRef = useRef<Promise<{ uri: string }> | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [showActions, setShowActions] = useState(false);
  const [tempUri, setTempUri] = useState<string | null>(null);
  const [savedDuration, setSavedDuration] = useState(0);
  const [safeIsRecording, setSafeIsRecording] = useState(false);
  const [safeDuration, setSafeDuration] = useState(0);
  const [localDuration, setLocalDuration] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [videoRecording, setVideoRecording] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');
  const [stopping, setStopping] = useState(false);
  const stoppingRef = useRef(false);
  const recordingStartRef = useRef<number | null>(null);
  const recorderRef = useRef(recorder);
  const recorderStateRef = useRef(recorderState);
  recorderRef.current = recorder;
  recorderStateRef.current = recorderState;
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  const isRecording = safeIsRecording || hasStarted || videoRecording;
  const duration = Math.max(safeDuration, localDuration);
  const autoUsesVideo = preset === 'auto' && permission?.granted === true;
  const isVideoMode = preset === 'video' || preset === 'both' || autoUsesVideo;
  const modeLabel = preset === 'both' ? 'Audio + Video' : preset === 'video' ? 'Video' : preset === 'auto' ? (autoUsesVideo ? 'Video (auto)' : 'Audio (auto)') : 'Audio';

  useEffect(() => {
    getPresetMode().then(setPreset);
  }, []);

  useFocusEffect(
    useCallback(() => {
      getPresetMode().then(setPreset);
    }, [])
  );

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
      // which would stop recording ~1s after start. User must explicitly tap Stop.
    };
  }, []);

  useEffect(() => {
    if (!isRecording || showActions) return;
    const id = setInterval(() => {
      if (recordingStartRef.current != null) {
        setLocalDuration(Math.floor((Date.now() - recordingStartRef.current) / 1000));
      }
    }, 500);
    return () => clearInterval(id);
  }, [isRecording, showActions]);

  const startVideoRecording = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Camera access', 'Allow camera access to record video.');
        return;
      }
    }
    try {
      if (cameraRef.current) {
        recordingStartRef.current = Date.now();
        setLocalDuration(0);
        setVideoRecording(true);
        const promise = cameraRef.current.recordAsync();
        videoRecordPromiseRef.current = promise;
        promise
          .then(async (result) => {
            stoppingRef.current = false;
            setStopping(false);
            const elapsed = recordingStartRef.current
              ? Math.floor((Date.now() - recordingStartRef.current) / 1000)
              : 0;
            recordingStartRef.current = null;
            setVideoRecording(false);
            videoRecordPromiseRef.current = null;
            if (result?.uri) {
              setTempUri(result.uri);
              setSavedDuration(Math.max(elapsed, 1));
              const autoShare = await getAutoShare();
              if (autoShare) {
                try {
                  const contact = await getEmergencyContact();
                  const contactName = contact?.name ?? 'emergency contact';
                  const canShare = await Sharing.isAvailableAsync();
                  if (canShare) {
                    await Sharing.shareAsync(result.uri, {
                      mimeType: 'video/mp4',
                      dialogTitle: `Share to ${contactName}`,
                    });
                  }
                } catch {
                  // User cancelled share — modal will still show
                }
              }
              setShowActions(true);
            }
          })
          .catch(() => {
            stoppingRef.current = false;
            setStopping(false);
            setVideoRecording(false);
            recordingStartRef.current = null;
            videoRecordPromiseRef.current = null;
          });
      }
    } catch (e) {
      setVideoRecording(false);
      recordingStartRef.current = null;
      Alert.alert('Recording', 'Could not start video recording. Please try again.');
    }
  };

  const stopVideoRecording = () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    setStopping(true);
    try {
      cameraRef.current?.stopRecording();
    } catch {
      setVideoRecording(false);
      stoppingRef.current = false;
      setStopping(false);
    }
  };

  const startRecording = async () => {
    if (__DEV__) console.log('[Recording] startRecording called');
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (__DEV__) console.log('[Recording] mic permission:', granted);
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
        shouldPlayInBackground: true,
        interruptionMode: 'duckOthers',
      });
      if (__DEV__) console.log('[Recording] prepareToRecordAsync');
      await recorder.prepareToRecordAsync();
      recorder.record();
      if (__DEV__) console.log('[Recording] record() started');
      recordingStartRef.current = Date.now();
      setLocalDuration(0);
      setHasStarted(true);
    } catch (e) {
      if (__DEV__) console.warn('[Recording] startRecording error:', e);
      Alert.alert('Recording', 'Could not start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (stoppingRef.current) return;
    if (__DEV__) console.log('[Recording] stopRecording called (user action)');
    stoppingRef.current = true;
    setStopping(true);
    const elapsed = recordingStartRef.current
      ? Math.floor((Date.now() - recordingStartRef.current) / 1000)
      : 0;
    recordingStartRef.current = null;
    setLocalDuration(0);
    setHasStarted(false);
    try {
      try {
        await recorder.stop();
        await waitForRecordingFinalized(recorder.uri ?? undefined, elapsed);
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
        setSavedDuration(Math.max(elapsed, 1));
        const autoShare = await getAutoShare();
        if (autoShare) {
          try {
            const contact = await getEmergencyContact();
            const contactName = contact?.name ?? 'emergency contact';
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
              await Sharing.shareAsync(uri, {
                mimeType: uri.toLowerCase().endsWith('.mp4') ? 'video/mp4' : 'audio/m4a',
                dialogTitle: `Share to ${contactName}`,
              });
            }
          } catch {
            // User cancelled share or share failed — modal will still show
          }
        }
        setShowActions(true);
      } else {
        Alert.alert('Recording', 'Could not save recording. Please try again.');
        navigation.goBack();
      }
    } catch {
      Alert.alert('Recording', 'Could not stop recording. Please try again.');
      navigation.goBack();
    } finally {
      stoppingRef.current = false;
      setStopping(false);
    }
  };

  const getMimeType = () => (tempUri?.toLowerCase().endsWith('.mp4') ? 'video/mp4' : 'audio/m4a');

  const handleSave = async () => {
    if (!tempUri) return;
    try {
      const destUri = await saveRecording(tempUri, savedDuration || duration, {
        extension: tempUri.toLowerCase().endsWith('.mp4') ? '.mp4' : undefined,
        scenario: scenario ?? 'other',
      });
      await addSafetyEvent({
        scenario: (scenario ?? 'other') as ScenarioType,
        timestamp: new Date().toISOString(),
        recordingUri: destUri,
        status: 'partial',
      });
      setShowActions(false);
      setTempUri(null);
      Alert.alert('Saved', 'Recording saved and added to Safety history.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', 'Could not save recording.');
    }
  };

  const handleShareToContact = async () => {
    if (!tempUri) return;
    try {
      const destUri = await saveRecording(tempUri, savedDuration || duration, {
        extension: tempUri.toLowerCase().endsWith('.mp4') ? '.mp4' : undefined,
        scenario: scenario ?? 'other',
        shareStatus: 'shared',
      });
      await addSafetyEvent({
        scenario: (scenario ?? 'other') as ScenarioType,
        timestamp: new Date().toISOString(),
        recordingUri: destUri,
        status: 'partial',
      });
      const contact = await getEmergencyContact();
      const contactName = contact?.name ?? 'emergency contact';
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(destUri, {
          mimeType: getMimeType(),
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
      const destUri = await saveRecording(tempUri, savedDuration || duration, {
        extension: tempUri.toLowerCase().endsWith('.mp4') ? '.mp4' : undefined,
        scenario: scenario ?? 'other',
        shareStatus: 'shared',
      });
      await addSafetyEvent({
        scenario: (scenario ?? 'other') as ScenarioType,
        timestamp: new Date().toISOString(),
        recordingUri: destUri,
        status: 'partial',
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(destUri, { mimeType: getMimeType() });
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

  if (isVideoMode && !showActions) {
    return (
      <View style={styles.videoContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          mode="video"
          facing={cameraFacing}
        />
        <View style={styles.modeBadge}>
          <Text style={styles.modeBadgeText}>{modeLabel}</Text>
        </View>
        {!videoRecording && (
          <TouchableOpacity
            style={[styles.flipButton, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
            onPress={() => setCameraFacing((prev) => (prev === 'back' ? 'front' : 'back'))}
          >
            <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        <View style={styles.videoOverlay}>
          <Text style={[styles.disclaimer, { color: theme.textMuted }]}>
            {RECORDING_DISCLAIMER}
          </Text>
          {!videoRecording ? (
            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: theme.primaryAccent }]}
              onPress={startVideoRecording}
            >
              <Text style={styles.startButtonText}>Start Video</Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={[styles.indicator, { backgroundColor: 'rgba(0,0,0,0.6)', borderColor: theme.border }]}>
                <View style={[styles.dot, { backgroundColor: '#E53935' }]} />
                <Text style={[styles.timer, { color: '#fff' }]}>{formatTime(duration)}</Text>
              </View>
              <TouchableOpacity
                style={[styles.stopButton, styles.stopButtonRed]}
                onPress={stopVideoRecording}
                disabled={stopping}
              >
                {stopping ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.stopButtonText, { color: '#fff' }]}>Stop</Text>
                )}
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={[styles.backButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backButtonText, { color: theme.text }]}>Go back</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={showActions} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Recording complete</Text>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.primaryAccent }]} onPress={handleSave}>
                <Text style={styles.modalButtonText}>Save (local)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButtonSecondary, { borderColor: theme.border }]} onPress={handleShareToContact}>
                <Text style={[styles.modalButtonTextAlt, { color: theme.text }]}>Share to emergency contact</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButtonSecondary, { borderColor: theme.border }]} onPress={handleShare}>
                <Text style={[styles.modalButtonTextAlt, { color: theme.text }]}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButtonSecondary, { borderColor: theme.border }]} onPress={handleDelete}>
                <Text style={[styles.modalButtonTextAlt, { color: theme.textMuted }]}>Delete recording</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.modeBadgeInline, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.modeBadgeTextInline, { color: theme.textMuted }]}>{modeLabel}</Text>
      </View>
      <Text style={[styles.disclaimer, { color: theme.textMuted }]}>
        {RECORDING_DISCLAIMER}
      </Text>

      {!isRecording && !showActions && (
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: theme.primaryAccent }]}
          onPress={startRecording}
        >
          <Text style={styles.startButtonText}>
            {modeLabel === 'Audio' ? 'Start Audio Recording' : 'Start Recording'}
          </Text>
        </TouchableOpacity>
      )}

      {isRecording && (
        <>
          <View style={[styles.indicator, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.dot, { backgroundColor: theme.primaryAccent }]} />
            <Text style={[styles.timer, { color: theme.text }]}>{formatTime(duration)}</Text>
          </View>
          <Text style={[styles.recordingHint, { color: theme.textMuted }]}>
            Recording audio… Tap Stop when finished.
          </Text>
          <TouchableOpacity
            style={[styles.stopButton, styles.stopButtonRed]}
            onPress={stopRecording}
            disabled={stopping}
          >
            {stopping ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={[styles.stopButtonText, { color: '#fff' }]}>Stop</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        style={[styles.backButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
        onPress={() => navigation.goBack()}
      >
        <Text style={[styles.backButtonText, { color: theme.text }]}>Go back</Text>
      </TouchableOpacity>

      <Modal visible={showActions} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Recording complete</Text>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.primaryAccent }]} onPress={handleSave}>
              <Text style={styles.modalButtonText}>Save (local)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButtonSecondary, { borderColor: theme.border }]} onPress={handleShareToContact}>
              <Text style={[styles.modalButtonTextAlt, { color: theme.text }]}>Share to emergency contact</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButtonSecondary, { borderColor: theme.border }]} onPress={handleShare}>
              <Text style={[styles.modalButtonTextAlt, { color: theme.text }]}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButtonSecondary, { borderColor: theme.border }]} onPress={handleDelete}>
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
  videoContainer: { flex: 1 },
  camera: { flex: 1, width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
  modeBadge: {
    position: 'absolute',
    top: 50,
    left: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modeBadgeText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modeBadgeInline: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  modeBadgeTextInline: { fontSize: 14, fontWeight: '600' },
  videoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 48,
  },
  disclaimer: { fontSize: 12, textAlign: 'center', marginBottom: 24, lineHeight: 18 },
  flipButton: {
    position: 'absolute',
    top: 50,
    right: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButton: {
    borderRadius: 18,
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
  recordingHint: { fontSize: 14, textAlign: 'center', marginBottom: 12 },
  stopButton: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  stopButtonRed: {
    backgroundColor: '#E53935',
    borderColor: '#E53935',
  },
  stopButtonText: { fontSize: 16, fontWeight: '600' },
  backButton: {
    borderWidth: 1,
    borderRadius: 18,
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
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 0,
  },
  modalButtonSecondary: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  modalButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  modalButtonTextAlt: { fontSize: 16 },
});
