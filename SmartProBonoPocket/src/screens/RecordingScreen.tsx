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
import { useToast } from '../components/Toast';
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
import {
  addSafetyEvent,
  saveKidTrackSessionEvent,
  saveSafetySessionEvent,
  saveTravelSessionEvent,
  type SafetyEvent,
} from '../storage/eventStorage';
import { linkRecordingToSessionEvent, waitForRecordingFinalized } from '../utils/recordingUtils';
import { getEmergencyContact } from '../storage/contactStorage';
import { getAutoShare, getPresetMode, type PresetMode } from '../storage/settingsStorage';
import { getRecordingScenarioForCurrentSession, getSessionSnapshot } from '../services/sessionService';
import { getMimeForUri, isVideoUri } from '../utils/media';
import { colors } from '../theme/colors';
import { AsyncButton } from '../components/AsyncButton';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const RECORDING_DISCLAIMER =
  'Recording laws vary by state. You are responsible for complying with local laws.';

/** Uses save*SessionEvent for Safety / Travel / Kid Track; other scenario types use addSafetyEvent. */
async function persistRecordingCompletedEvent(
  payload: Omit<SafetyEvent, 'id' | 'scenario'>,
  scenario: ScenarioType
): Promise<string> {
  if (scenario === 'travel') return saveTravelSessionEvent(payload);
  if (scenario === 'kid_track') return saveKidTrackSessionEvent(payload);
  if (scenario === 'other') return saveSafetySessionEvent(payload);
  return addSafetyEvent({ ...payload, scenario });
}

type RecordingNav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Record'>,
  NativeStackNavigationProp<RootStackParamList>
>;
type RecordingRoute = RouteProp<TabParamList, 'Record'>;
type Props = { navigation: RecordingNav; route: RecordingRoute };

export function RecordingScreen({ navigation, route }: Props) {
  const scenario = route.params?.scenario ?? getRecordingScenarioForCurrentSession();
  const toast = useToast();
  const [preset, setPreset] = useState<PresetMode>('audio');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const videoRecordPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [showActions, setShowActions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tempUri, setTempUri] = useState<string | null>(null);
  const [savedDuration, setSavedDuration] = useState(0);
  const [safeIsRecording, setSafeIsRecording] = useState(false);
  const [safeDuration, setSafeDuration] = useState(0);
  const [localDuration, setLocalDuration] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [videoRecording, setVideoRecording] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');
  const [cameraReady, setCameraReady] = useState(false);
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

  useFocusEffect(
    useCallback(() => {
      getPresetMode().then(setPreset);
      return () => setCameraReady(false); // reset when leaving so camera reinitializes on return
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
    const tick = () => {
      if (recordingStartRef.current != null) {
        setLocalDuration(Math.floor((Date.now() - recordingStartRef.current) / 1000));
      }
    };
    tick(); // immediate first tick
    const id = setInterval(tick, 250);
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
    if (!cameraReady) {
      toast.show({ type: 'info', message: 'Please wait for the camera to finish loading.' });
      return;
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
    const cam = cameraRef.current;
    if (!cam) {
      stoppingRef.current = false;
      setStopping(false);
      setVideoRecording(false);
      return;
    }
    try {
      cam.stopRecording();
    } catch (e) {
      if (__DEV__) console.warn('[Recording] stopVideoRecording error:', e);
      stoppingRef.current = false;
      setStopping(false);
      setVideoRecording(false);
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
    const rec = recorder;
    try {
      try {
        await rec.stop();
        await waitForRecordingFinalized(rec.uri ?? undefined, elapsed);
      } catch {
        // Native bridge may have disconnected
      }
      let uri: string | undefined;
      try {
        uri = rec.uri ?? undefined;
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
                mimeType: getMimeForUri(uri),
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

  const getMimeType = () => (tempUri ? getMimeForUri(tempUri) : 'audio/m4a');

  const handleSave = async () => {
    if (!tempUri) return;
    setSaving(true);
    try {
      const destUri = await saveRecording(tempUri, savedDuration || duration, {
        extension: tempUri.toLowerCase().endsWith('.mp4') ? '.mp4' : undefined,
        scenario: scenario ?? 'other',
        liveSessionId: getSessionSnapshot().session?.liveSessionId,
      });
      const eventId = await persistRecordingCompletedEvent(
        {
          timestamp: new Date().toISOString(),
          recordingUri: destUri,
          status: 'partial',
        },
        (scenario ?? 'other') as ScenarioType
      );
      await linkRecordingToSessionEvent(destUri, eventId);
      setShowActions(false);
      setTempUri(null);
      toast.show({ type: 'success', message: 'Recording saved and added to history.' });
      navigation.goBack();
    } catch (e) {
      setSaving(false);
      toast.show({ type: 'error', message: 'Could not save recording.' });
    }
  };

  const handleShareToContact = async () => {
    if (!tempUri) return;
    setSaving(true);
    try {
      const destUri = await saveRecording(tempUri, savedDuration || duration, {
        extension: tempUri.toLowerCase().endsWith('.mp4') ? '.mp4' : undefined,
        scenario: scenario ?? 'other',
        shareStatus: 'shared',
        liveSessionId: getSessionSnapshot().session?.liveSessionId,
      });
      const eventId = await persistRecordingCompletedEvent(
        {
          timestamp: new Date().toISOString(),
          recordingUri: destUri,
          status: 'partial',
        },
        (scenario ?? 'other') as ScenarioType
      );
      await linkRecordingToSessionEvent(destUri, eventId);
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
      setSaving(false);
      toast.show({ type: 'error', message: 'Could not share recording.' });
    }
  };

  const handleShare = async () => {
    if (!tempUri) return;
    setSaving(true);
    try {
      const destUri = await saveRecording(tempUri, savedDuration || duration, {
        extension: tempUri.toLowerCase().endsWith('.mp4') ? '.mp4' : undefined,
        scenario: scenario ?? 'other',
        shareStatus: 'shared',
        liveSessionId: getSessionSnapshot().session?.liveSessionId,
      });
      const eventId = await persistRecordingCompletedEvent(
        {
          timestamp: new Date().toISOString(),
          recordingUri: destUri,
          status: 'partial',
        },
        (scenario ?? 'other') as ScenarioType
      );
      await linkRecordingToSessionEvent(destUri, eventId);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(destUri, { mimeType: getMimeType() });
      }
      setShowActions(false);
      setTempUri(null);
      navigation.goBack();
    } catch (e) {
      setSaving(false);
      toast.show({ type: 'error', message: 'Could not share recording.' });
    }
  };

  const handleDelete = () => {
    setSaving(true);
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
    // Camera permission required for video - show prompt if not granted
    if (!permission) {
      return (
        <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color={theme.primaryAccent} />
          <Text style={[styles.disclaimer, { color: theme.textMuted, marginTop: 16 }]}>Loading camera…</Text>
        </View>
      );
    }
    if (!permission.granted) {
      return (
        <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', padding: 24 }]}>
          <Text style={[styles.disclaimer, { color: theme.text }]}>
            Camera access is needed to record video.
          </Text>
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: theme.primaryAccent, marginTop: 24 }]}
            onPress={requestPermission}
          >
            <Text style={styles.startButtonText}>Allow camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.backButton, { borderColor: theme.border, backgroundColor: theme.surface, marginTop: 16 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backButtonText, { color: theme.text }]}>Go back</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.videoContainer} collapsable={false}>
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            mode="video"
            facing={cameraFacing}
            onCameraReady={() => {
              // 300ms delay helps iOS: recordAsync can fail if started too soon after camera ready
              setTimeout(() => setCameraReady(true), 300);
            }}
          />
        </View>
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
        <View style={[styles.videoOverlay, { zIndex: 10 }]} pointerEvents="box-none">
          <Text style={[styles.disclaimer, { color: theme.textMuted }]}>
            {RECORDING_DISCLAIMER}
          </Text>
          {!videoRecording ? (
            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: theme.primaryAccent }]}
              onPress={startVideoRecording}
              disabled={!cameraReady}
            >
              <Text style={styles.startButtonText}>
                {cameraReady ? 'Start Video' : 'Loading camera…'}
              </Text>
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
                activeOpacity={0.9}
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
              <AsyncButton
                title="Save (local)"
                onPress={handleSave}
                disabled={saving}
                variant="primary"
                style={styles.modalButton}
                textStyle={styles.modalButtonText}
              />
              <AsyncButton
                title="Share"
                onPress={handleShare}
                disabled={saving}
                variant="secondary"
                style={styles.modalButtonSecondary}
                textStyle={styles.modalButtonTextAlt}
              />
              <AsyncButton
                title="Share to emergency contact"
                onPress={handleShareToContact}
                disabled={saving}
                variant="secondary"
                style={styles.modalButtonSecondary}
                textStyle={styles.modalButtonTextAlt}
              />
              <TouchableOpacity style={[styles.modalButtonSecondary, { borderColor: theme.border }]} onPress={handleDelete} disabled={saving}>
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
            <AsyncButton
              title="Save (local)"
              onPress={handleSave}
              disabled={saving}
              variant="primary"
              style={styles.modalButton}
              textStyle={styles.modalButtonText}
            />
            <AsyncButton
              title="Share"
              onPress={handleShare}
              disabled={saving}
              variant="secondary"
              style={styles.modalButtonSecondary}
              textStyle={styles.modalButtonTextAlt}
            />
            <AsyncButton
              title="Share to emergency contact"
              onPress={handleShareToContact}
              disabled={saving}
              variant="secondary"
              style={styles.modalButtonSecondary}
              textStyle={styles.modalButtonTextAlt}
            />
            <TouchableOpacity style={[styles.modalButtonSecondary, { borderColor: theme.border }]} onPress={handleDelete} disabled={saving}>
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
