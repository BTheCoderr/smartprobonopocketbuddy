import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useToast } from '../components/Toast';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
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
import { saveKidTrackSessionEvent, saveSafetySessionEvent, saveTravelSessionEvent } from '../storage/eventStorage';
import {
  linkRecordingToSessionEvent,
  waitForRecordingFinalized,
  waitForVideoRecordingFinalized,
} from '../utils/recordingUtils';
import { getAutoShare } from '../storage/settingsStorage';
import { getEmergencyContact } from '../storage/contactStorage';
import {
  ensureSessionSnapshotForActiveRoute,
  getCurrentSession,
  patchSessionSnapshot,
  resolveRecordingEnabled,
  startKidTrackSessionTracking,
  startSafetySessionTracking,
  startTravelSessionTracking,
  stopSession,
  subscribeLiveSession,
  useSessionSnapshot,
  type LiveSessionRuntimeState,
} from '../services/sessionService';
import type { RoutePoint } from '../types/session';
import { trackError } from '../lib/analytics';
import { colors } from '../theme/colors';
import { AsyncButton } from '../components/AsyncButton';

const CHECKLIST = [
  'Hands visible',
  'Speak slowly',
  'Ask before reaching',
  'Only answer what\'s asked',
];

const DEESCALATION_SCRIPT =
  'Officer, I want to cooperate. My license and registration are [location]. May I reach for them?';

const TRAVEL_CHECKLIST = [
  'Share your route with someone you trust',
  'Take breaks if you need them',
  'Stay aware of your surroundings',
  'Check in when you arrive safely',
];

const TRAVEL_SCRIPT =
  'I\'m on my way and sharing my route. I\'ll check in when I arrive.';

const CAMERA_PREVIEW_HEIGHT = Math.min(280, Dimensions.get('window').height * 0.32);

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

function TravelActiveSession({ navigation, route }: Props) {
  const { locationLink, arrivalCheckMinutes } = route.params ?? {};
  const toast = useToast();
  const sessionSnap = useSessionSnapshot();
  const calmGuidanceEnabled = sessionSnap.session?.calmGuidanceEnabled ?? true;
  const lastLiveSessionIdRef = useRef<string | undefined>(undefined);
  const cameraRef = useRef<CameraView>(null);
  const videoRecordPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [travelRecordingEnabled, setTravelRecordingEnabled] = useState(true);
  const [videoRecording, setVideoRecording] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');
  const [recordingFailed, setRecordingFailed] = useState(false);
  const stoppingRef = useRef(false);
  const [stopping, setStopping] = useState(false);
  const videoStartedRef = useRef(false);
  const [ending, setEnding] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tempUri, setTempUri] = useState<string | null>(null);
  const [savedDuration, setSavedDuration] = useState(0);
  const [localDuration, setLocalDuration] = useState(0);
  const [liveSession, setLiveSession] = useState<LiveSessionRuntimeState | null>(null);
  const sessionRouteRef = useRef<RoutePoint[] | undefined>(undefined);
  const sessionEndedRef = useRef(false);
  const sessionStartRef = useRef(
    sessionSnap.session?.startedAt ?? getCurrentSession()?.startedAt ?? Date.now()
  );
  const sessionTimerStoppedRef = useRef(false);
  const [sessionElapsedSec, setSessionElapsedSec] = useState(0);
  const recordingStartRef = useRef<number | null>(null);
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  const recordingActive = videoRecording;
  const elapsedSec = Math.max(sessionElapsedSec, localDuration);

  useEffect(() => {
    const s = sessionSnap.session ?? getCurrentSession();
    if (s?.startedAt) sessionStartRef.current = s.startedAt;
  }, [sessionSnap.session?.startedAt, sessionSnap.session?.id]);

  useEffect(() => {
    const tick = () => {
      if (sessionTimerStoppedRef.current) return;
      setSessionElapsedSec(Math.floor((Date.now() - sessionStartRef.current) / 1000));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!recordingActive) return;
    const tick = () => {
      if (recordingStartRef.current != null) {
        setLocalDuration(Math.floor((Date.now() - recordingStartRef.current) / 1000));
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [recordingActive]);

  useEffect(() => {
    if (!arrivalCheckMinutes) return;
    const startedAt = sessionSnap.session?.startedAt ?? getCurrentSession()?.startedAt;
    if (!startedAt) return;
    const deadlineMs = startedAt + arrivalCheckMinutes * 60 * 1000;
    const delayMs = Math.max(0, deadlineMs - Date.now());
    const id = setTimeout(() => {
      Alert.alert('Travel check-in', 'Arrival check: are you okay?');
    }, delayMs);
    return () => clearTimeout(id);
  }, [arrivalCheckMinutes, sessionSnap.session?.startedAt, sessionSnap.session?.id]);

  const startTravelVideo = useCallback(async () => {
    if (!travelRecordingEnabled || videoStartedRef.current || !cameraRef.current || !cameraReady) return;
    videoStartedRef.current = true;
    try {
      recordingStartRef.current = Date.now();
      setLocalDuration(0);
      setVideoRecording(true);
      const p = cameraRef.current.recordAsync();
      videoRecordPromiseRef.current = p;
      setRecordingFailed(false);
    } catch {
      videoStartedRef.current = false;
      setRecordingFailed(true);
      setVideoRecording(false);
    }
  }, [cameraReady, travelRecordingEnabled]);

  useEffect(() => {
    let cancelled = false;
    void resolveRecordingEnabled().then((enabled) => {
      if (!cancelled) setTravelRecordingEnabled(enabled);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionSnap.session?.recordingEnabled]);

  useEffect(() => {
    let cancelled = false;
    const ensureCamera = async () => {
      if (!travelRecordingEnabled) return;
      if (!permission) return;
      if (!permission.granted) {
        const r = await requestPermission();
        if (!r.granted) {
          if (!cancelled) setRecordingFailed(true);
          return;
        }
      }
    };
    void ensureCamera();
    return () => {
      cancelled = true;
    };
  }, [permission, requestPermission, travelRecordingEnabled]);

  useEffect(() => {
    if (!travelRecordingEnabled || !cameraReady || videoStartedRef.current) return;
    const t = setTimeout(() => {
      void startTravelVideo();
    }, 400);
    return () => clearTimeout(t);
  }, [cameraReady, startTravelVideo, travelRecordingEnabled]);

  useEffect(() => {
    let mounted = true;
    let unsub: (() => void) | undefined;
    void (async () => {
      await ensureSessionSnapshotForActiveRoute({
        sessionMode: 'travel',
        locationLink,
        arrivalCheckMinutes,
      });
      if (!mounted) return;
      const id = await startTravelSessionTracking(locationLink, arrivalCheckMinutes ?? null);
      patchSessionSnapshot({ liveSessionId: id });
      unsub = subscribeLiveSession((s) => {
        if (mounted) setLiveSession(s);
      });
    })();
    return () => {
      mounted = false;
      unsub?.();
      if (!sessionEndedRef.current) {
        sessionEndedRef.current = true;
        void stopSession({ discard: true });
      }
    };
  }, [locationLink, arrivalCheckMinutes]);

  const closeModalAndGoBack = () => {
    setShowShareModal(false);
    setTempUri(null);
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  const handleEnd = async () => {
    if (stoppingRef.current) return;
    setEnding(true);
    sessionEndedRef.current = true;
    sessionTimerStoppedRef.current = true;
    const sessionSecs = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    setSessionElapsedSec(sessionSecs);
    recordingStartRef.current = null;
    const endedLive = await stopSession();
    lastLiveSessionIdRef.current = endedLive?.id;
    sessionRouteRef.current =
      endedLive?.route && endedLive.route.length > 0 ? endedLive.route : undefined;

    try {
      if (videoRecording && cameraRef.current) {
        stoppingRef.current = true;
        setStopping(true);
        try {
          cameraRef.current.stopRecording();
        } catch {
          // ignore
        }
      }

      let uri: string | undefined;
      if (videoRecordPromiseRef.current) {
        try {
          const result = await videoRecordPromiseRef.current;
          uri = result?.uri;
        } catch {
          uri = undefined;
        }
      }
      videoRecordPromiseRef.current = null;
      setVideoRecording(false);

      const duration = Math.max(sessionSecs, localDuration, 1);
      setSavedDuration(duration);

      if (uri) {
        await waitForVideoRecordingFinalized(uri, duration);
        setTempUri(uri);
        const autoShare = await getAutoShare();
        if (autoShare) {
          const contact = await getEmergencyContact();
          const contactName = contact?.name ?? 'emergency contact';
          try {
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
              await Sharing.shareAsync(uri, {
                mimeType: 'video/mp4',
                dialogTitle: `Share to ${contactName}`,
              });
            }
          } catch {
            // User cancelled or share failed
          }
        }
      } else {
        await saveTravelSessionEvent({
          timestamp: new Date().toISOString(),
          locationLink,
          status: locationLink ? 'completed' : 'partial',
          ...(sessionRouteRef.current ? { route: sessionRouteRef.current } : {}),
        });
        setEnding(false);
        stoppingRef.current = false;
        setStopping(false);
        closeModalAndGoBack();
        return;
      }

      setEnding(false);
      stoppingRef.current = false;
      setStopping(false);
      setShowShareModal(true);
    } catch (e) {
      trackError('travel.end_failed', e);
      setEnding(false);
      stoppingRef.current = false;
      setStopping(false);
      Alert.alert(
        'Could not finish',
        'Something went wrong ending the session. Your recording may not have been saved.',
        [{ text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Main' }] }) }]
      );
    }
  };

  const handleSave = async () => {
    if (!tempUri) return;
    setSaving(true);
    try {
      const destUri = await saveRecording(tempUri, savedDuration, {
        scenario: 'travel',
        locationLink,
        shareStatus: 'saved',
        extension: '.mp4',
        liveSessionId: lastLiveSessionIdRef.current,
      });
      const eventId = await saveTravelSessionEvent({
        timestamp: new Date().toISOString(),
        locationLink,
        recordingUri: destUri,
        status: locationLink ? 'completed' : 'partial',
        ...(sessionRouteRef.current ? { route: sessionRouteRef.current } : {}),
      });
      await linkRecordingToSessionEvent(destUri, eventId);
      setShowShareModal(false);
      setTempUri(null);
      toast.show({ type: 'success', message: 'Recording saved locally on your device.' });
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch {
      setSaving(false);
      toast.show({ type: 'error', message: 'Could not save recording.' });
    }
  };

  const handleShareToContact = async () => {
    if (!tempUri) return;
    setSaving(true);
    try {
      const contact = await getEmergencyContact();
      const contactName = contact?.name ?? 'emergency contact';
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(tempUri, {
          mimeType: 'video/mp4',
          dialogTitle: `Share to ${contactName}`,
        });
      }
      const destUri = await saveRecording(tempUri, savedDuration, {
        scenario: 'travel',
        locationLink,
        shareStatus: 'shared',
        extension: '.mp4',
        liveSessionId: lastLiveSessionIdRef.current,
      });
      const eventId = await saveTravelSessionEvent({
        timestamp: new Date().toISOString(),
        locationLink,
        recordingUri: destUri,
        status: locationLink ? 'completed' : 'partial',
        ...(sessionRouteRef.current ? { route: sessionRouteRef.current } : {}),
      });
      await linkRecordingToSessionEvent(destUri, eventId);
      closeModalAndGoBack();
    } catch {
      setSaving(false);
      toast.show({ type: 'error', message: 'Could not share recording.' });
    }
  };

  const handleShare = async () => {
    if (!tempUri) return;
    setSaving(true);
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(tempUri, { mimeType: 'video/mp4' });
      }
      const destUri = await saveRecording(tempUri, savedDuration, {
        scenario: 'travel',
        locationLink,
        shareStatus: 'shared',
        extension: '.mp4',
        liveSessionId: lastLiveSessionIdRef.current,
      });
      const eventId = await saveTravelSessionEvent({
        timestamp: new Date().toISOString(),
        locationLink,
        recordingUri: destUri,
        status: locationLink ? 'completed' : 'partial',
        ...(sessionRouteRef.current ? { route: sessionRouteRef.current } : {}),
      });
      await linkRecordingToSessionEvent(destUri, eventId);
      closeModalAndGoBack();
    } catch {
      setSaving(false);
      toast.show({ type: 'error', message: 'Could not share recording.' });
    }
  };

  const handleDelete = () => {
    setSaving(true);
    void saveTravelSessionEvent({
      timestamp: new Date().toISOString(),
      locationLink,
      status: locationLink ? 'completed' : 'partial',
      ...(sessionRouteRef.current ? { route: sessionRouteRef.current } : {}),
    });
    closeModalAndGoBack();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const arrivalTotalSec = arrivalCheckMinutes ? arrivalCheckMinutes * 60 : 0;
  const arrivalRemainingSec = Math.max(0, arrivalTotalSec - sessionElapsedSec);

  if (travelRecordingEnabled) {
    if (!permission) {
      return (
        <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color={theme.primaryAccent} />
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center' }]}>
          <Text style={[styles.recordingHint, { color: theme.text }]}>Camera access is needed for Travel Mode video.</Text>
          <TouchableOpacity
            style={[styles.endButton, { backgroundColor: theme.primaryAccent, marginTop: 20 }]}
            onPress={() => requestPermission()}
          >
            <Text style={styles.endButtonText}>Allow camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, { borderColor: theme.border, marginTop: 16 }]}
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Main' }] })}
          >
            <Text style={[styles.modalButtonTextAlt, { color: theme.text }]}>Go back</Text>
          </TouchableOpacity>
        </View>
      );
    }
  }

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
        {recordingActive && (
          <View style={[styles.recDot, { backgroundColor: theme.recordingDot }]} />
        )}
        <Text style={[styles.timer, { color: theme.text }]}>{formatTime(elapsedSec)}</Text>
      </View>

      <View style={[styles.cameraWrap, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        {travelRecordingEnabled ? (
          <>
            <CameraView
              ref={cameraRef}
              style={styles.cameraPreview}
              mode="video"
              facing={cameraFacing}
              onCameraReady={() => {
                setTimeout(() => setCameraReady(true), 300);
              }}
            />
            {!videoRecording && (
              <TouchableOpacity
                style={[styles.flipCam, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
                onPress={() => setCameraFacing((f) => (f === 'back' ? 'front' : 'back'))}
              >
                <Ionicons name="camera-reverse-outline" size={22} color="#fff" />
              </TouchableOpacity>
            )}
          </>
        ) : null}
      </View>

      {travelRecordingEnabled && recordingActive && (
        <Text style={[styles.recordingHint, { color: theme.textMuted }]}>
          Recording video… Tap End Travel Mode when you&apos;re done.
        </Text>
      )}
      {travelRecordingEnabled && recordingFailed && (
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.surface, borderColor: theme.primaryAccent }]}
          onPress={() => {
            videoStartedRef.current = false;
            setRecordingFailed(false);
            void startTravelVideo();
          }}
        >
          <Text style={[styles.retryText, { color: theme.primaryAccent }]}>
            Recording didn&apos;t start — tap to try again
          </Text>
        </TouchableOpacity>
      )}

      {liveSession && (
        <Text style={[styles.liveHint, { color: theme.textMuted }]} numberOfLines={2}>
          Live tracking · {liveSession.pointCount} point{liveSession.pointCount === 1 ? '' : 's'}
          {liveSession.lastPoint
            ? ` · ${liveSession.lastPoint.lat.toFixed(4)}, ${liveSession.lastPoint.lng.toFixed(4)}`
            : ''}
        </Text>
      )}

      {arrivalCheckMinutes ? (
        <Text style={[styles.liveHint, { color: theme.textMuted }]} numberOfLines={1}>
          Arrival check in {formatTime(arrivalRemainingSec)}
        </Text>
      ) : null}

      {calmGuidanceEnabled ? (
        <View style={styles.checklistContainer}>
          <Text style={[styles.checklistTitle, { color: theme.textMuted }]}>Stay calm</Text>
          {TRAVEL_CHECKLIST.map((item, i) => (
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
            <Text style={[styles.scriptText, { color: theme.text }]}>{TRAVEL_SCRIPT}</Text>
          </View>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.endButton, { backgroundColor: theme.primaryAccent }]}
        onPress={handleEnd}
        disabled={ending || stopping}
        accessibilityRole="button"
        accessibilityLabel="End Travel Mode"
      >
        {ending || stopping ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.endButtonText}>End Travel Mode</Text>
        )}
      </TouchableOpacity>

      <Modal visible={showShareModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Recording complete</Text>
            {tempUri ? (
              <>
                <AsyncButton
                  title="Save (local)"
                  onPress={handleSave}
                  disabled={saving}
                  variant="primary"
                  style={[styles.modalButton, { backgroundColor: theme.primary }]}
                  textStyle={styles.modalButtonText}
                />
                <AsyncButton
                  title="Share"
                  onPress={handleShare}
                  disabled={saving}
                  variant="secondary"
                  style={styles.modalButton}
                  textStyle={styles.modalButtonTextAlt}
                />
                <AsyncButton
                  title="Share to emergency contact"
                  onPress={handleShareToContact}
                  disabled={saving}
                  variant="secondary"
                  style={styles.modalButton}
                  textStyle={styles.modalButtonTextAlt}
                />
                <TouchableOpacity
                  style={[styles.modalButton, { borderColor: theme.border }]}
                  onPress={handleDelete}
                  disabled={saving}
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

function SafetyActiveSession({ navigation, route }: Props) {
  const { locationLink, sessionMode, arrivalCheckMinutes } = route.params ?? {};
  const isKidTrack = sessionMode === 'kid_track';
  const toast = useToast();
  const sessionSnap = useSessionSnapshot();
  const calmGuidanceEnabled = sessionSnap.session?.calmGuidanceEnabled ?? true;
  const lastLiveSessionIdRef = useRef<string | undefined>(undefined);
  const saveSession = isKidTrack ? saveKidTrackSessionEvent : saveSafetySessionEvent;
  const recScenario = isKidTrack ? 'kid_track' : 'other';
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [recordingEnabled, setRecordingEnabled] = useState(true);
  const [autoStarted, setAutoStarted] = useState(false);
  const [recordingFailed, setRecordingFailed] = useState(false);
  const [ending, setEnding] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tempUri, setTempUri] = useState<string | null>(null);
  const [savedDuration, setSavedDuration] = useState(0);
  const [safeIsRecording, setSafeIsRecording] = useState(false);
  const [safeDuration, setSafeDuration] = useState(0);
  const [localDuration, setLocalDuration] = useState(0);
  const [liveSession, setLiveSession] = useState<LiveSessionRuntimeState | null>(null);
  /** GPS route for this Active visit; set when End Safety Mode stops live tracking (used by save/share/delete). */
  const sessionRouteRef = useRef<RoutePoint[] | undefined>(undefined);
  const sessionEndedRef = useRef(false);
  const sessionStartRef = useRef(
    sessionSnap.session?.startedAt ?? getCurrentSession()?.startedAt ?? Date.now()
  );
  const sessionTimerStoppedRef = useRef(false);
  const [sessionElapsedSec, setSessionElapsedSec] = useState(0);
  const recordingStartRef = useRef<number | null>(null);
  const recorderRef = useRef(recorder);
  const recorderStateRef = useRef(recorderState);
  recorderRef.current = recorder;
  recorderStateRef.current = recorderState;
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  const recordingActive = safeIsRecording || (autoStarted && !showShareModal);
  /** Wall-clock session length (Safety Mode); recording may start slightly later. */
  const elapsedSec = Math.max(sessionElapsedSec, safeDuration, localDuration);

  useEffect(() => {
    const s = sessionSnap.session ?? getCurrentSession();
    if (s?.startedAt) sessionStartRef.current = s.startedAt;
  }, [sessionSnap.session?.startedAt, sessionSnap.session?.id]);

  // Session timer: runs for whole Active visit (independent of recording on/off).
  useEffect(() => {
    const tick = () => {
      if (sessionTimerStoppedRef.current) return;
      setSessionElapsedSec(Math.floor((Date.now() - sessionStartRef.current) / 1000));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, []);

  // When recording is active, localDuration tracks mic timeline if native duration lags.
  useEffect(() => {
    if (!recordingActive) return;
    const tick = () => {
      if (recordingStartRef.current != null) {
        setLocalDuration(Math.floor((Date.now() - recordingStartRef.current) / 1000));
      }
    };
    tick();
    const id = setInterval(tick, 250);
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
      const enabled = await resolveRecordingEnabled();
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

  useEffect(() => {
    let mounted = true;
    let unsub: (() => void) | undefined;
    void (async () => {
      await ensureSessionSnapshotForActiveRoute({
        sessionMode: isKidTrack ? 'kid_track' : 'safety',
        locationLink,
        arrivalCheckMinutes: isKidTrack ? arrivalCheckMinutes ?? null : undefined,
      });
      if (!mounted) return;
      const start = isKidTrack
        ? startKidTrackSessionTracking(locationLink, arrivalCheckMinutes ?? null)
        : startSafetySessionTracking(locationLink);
      const id = await start;
      patchSessionSnapshot({ liveSessionId: id });
      unsub = subscribeLiveSession((s) => {
        if (mounted) setLiveSession(s);
      });
    })();
    return () => {
      mounted = false;
      unsub?.();
      if (!sessionEndedRef.current) {
        sessionEndedRef.current = true;
        void stopSession({ discard: true });
      }
    };
  }, [locationLink, isKidTrack, arrivalCheckMinutes]);

  const closeModalAndGoBack = () => {
    setShowShareModal(false);
    setTempUri(null);
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  const handleEnd = async () => {
    setEnding(true);
    sessionEndedRef.current = true;
    sessionTimerStoppedRef.current = true;
    const sessionSecs = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    setSessionElapsedSec(sessionSecs);
    recordingStartRef.current = null;
    const endedLive = await stopSession();
    lastLiveSessionIdRef.current = endedLive?.id;
    sessionRouteRef.current =
      endedLive?.route && endedLive.route.length > 0 ? endedLive.route : undefined;
    try {
      const { isRecording: recOn } = safeGetRecordingState(recorder);
      if (recOn) {
        try {
          await recorder.stop();
          await waitForRecordingFinalized(
            recorder.uri ?? undefined,
            Math.max(sessionSecs, safeDuration, localDuration, 1)
          );
        } catch {
          // Native bridge may be gone
        }
      }
      let uri: string | undefined;
      try {
        uri = recorder.uri ?? undefined;
      } catch {
        uri = undefined;
      }
      const duration = Math.max(sessionSecs, safeDuration, localDuration, 1);
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
        await saveSession({
          timestamp: new Date().toISOString(),
          locationLink,
          status: locationLink ? 'completed' : 'partial',
          ...(sessionRouteRef.current ? { route: sessionRouteRef.current } : {}),
        });
        setEnding(false);
        closeModalAndGoBack();
        return;
      }

      setEnding(false);
      setShowShareModal(true);
    } catch (e) {
      trackError('safety.end_failed', e, { isKidTrack });
      setEnding(false);
      Alert.alert(
        'Could not finish',
        'Something went wrong ending the session. Your recording may not have been saved.',
        [{ text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Main' }] }) }]
      );
    }
  };

  const handleSave = async () => {
    if (!tempUri) return;
    setSaving(true);
    try {
      const destUri = await saveRecording(tempUri, savedDuration, {
        scenario: recScenario,
        locationLink,
        shareStatus: 'saved',
        liveSessionId: lastLiveSessionIdRef.current,
      });
      const eventId = await saveSession({
        timestamp: new Date().toISOString(),
        locationLink,
        recordingUri: destUri,
        status: locationLink ? 'completed' : 'partial',
        ...(sessionRouteRef.current ? { route: sessionRouteRef.current } : {}),
      });
      await linkRecordingToSessionEvent(destUri, eventId);
      setShowShareModal(false);
      setTempUri(null);
      toast.show({ type: 'success', message: 'Recording saved locally on your device.' });
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e) {
      setSaving(false);
      toast.show({ type: 'error', message: 'Could not save recording.' });
    }
  };

  const handleShareToContact = async () => {
    if (!tempUri) return;
    setSaving(true);
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
        scenario: recScenario,
        locationLink,
        shareStatus: 'shared',
        liveSessionId: lastLiveSessionIdRef.current,
      });
      const eventId = await saveSession({
        timestamp: new Date().toISOString(),
        locationLink,
        recordingUri: destUri,
        status: locationLink ? 'completed' : 'partial',
        ...(sessionRouteRef.current ? { route: sessionRouteRef.current } : {}),
      });
      await linkRecordingToSessionEvent(destUri, eventId);
      closeModalAndGoBack();
    } catch (e) {
      setSaving(false);
      toast.show({ type: 'error', message: 'Could not share recording.' });
    }
  };

  const handleShare = async () => {
    if (!tempUri) return;
    setSaving(true);
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(tempUri, { mimeType: 'audio/m4a' });
      }
      const destUri = await saveRecording(tempUri, savedDuration, {
        scenario: recScenario,
        locationLink,
        shareStatus: 'shared',
        liveSessionId: lastLiveSessionIdRef.current,
      });
      const eventId = await saveSession({
        timestamp: new Date().toISOString(),
        locationLink,
        recordingUri: destUri,
        status: locationLink ? 'completed' : 'partial',
        ...(sessionRouteRef.current ? { route: sessionRouteRef.current } : {}),
      });
      await linkRecordingToSessionEvent(destUri, eventId);
      closeModalAndGoBack();
    } catch (e) {
      setSaving(false);
      toast.show({ type: 'error', message: 'Could not share recording.' });
    }
  };

  const handleDelete = () => {
    setSaving(true);
    void saveSession({
      timestamp: new Date().toISOString(),
      locationLink,
      status: locationLink ? 'completed' : 'partial',
      ...(sessionRouteRef.current ? { route: sessionRouteRef.current } : {}),
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
          {isKidTrack
            ? 'Recording… Tap End Kid Track when you&apos;re done.'
            : 'Recording… Tap End Safety Mode when you&apos;re done.'}
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

      {liveSession && (
        <Text style={[styles.liveHint, { color: theme.textMuted }]} numberOfLines={2}>
          Live tracking · {liveSession.pointCount} point{liveSession.pointCount === 1 ? '' : 's'}
          {liveSession.lastPoint
            ? ` · ${liveSession.lastPoint.lat.toFixed(4)}, ${liveSession.lastPoint.lng.toFixed(4)}`
            : ''}
        </Text>
      )}

      {calmGuidanceEnabled ? (
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
      ) : null}

      <TouchableOpacity
        style={[styles.endButton, { backgroundColor: theme.primaryAccent }]}
        onPress={handleEnd}
        disabled={ending}
        accessibilityRole="button"
        accessibilityLabel={isKidTrack ? 'End Kid Track' : 'End Safety Mode'}
      >
        {ending ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.endButtonText}>
            {isKidTrack ? 'End Kid Track' : 'End Safety Mode'}
          </Text>
        )}
      </TouchableOpacity>

      <Modal visible={showShareModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Recording complete</Text>
            {tempUri ? (
              <>
                <AsyncButton
                  title="Save (local)"
                  onPress={handleSave}
                  disabled={saving}
                  variant="primary"
                  style={[styles.modalButton, { backgroundColor: theme.primary }]}
                  textStyle={styles.modalButtonText}
                />
                <AsyncButton
                  title="Share"
                  onPress={handleShare}
                  disabled={saving}
                  variant="secondary"
                  style={styles.modalButton}
                  textStyle={styles.modalButtonTextAlt}
                />
                <AsyncButton
                  title="Share to emergency contact"
                  onPress={handleShareToContact}
                  disabled={saving}
                  variant="secondary"
                  style={styles.modalButton}
                  textStyle={styles.modalButtonTextAlt}
                />
                <TouchableOpacity
                  style={[styles.modalButton, { borderColor: theme.border }]}
                  onPress={handleDelete}
                  disabled={saving}
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

export function ActiveScreen(props: Props) {
  const mode = props.route.params?.sessionMode ?? 'safety';
  if (mode === 'travel') {
    return <TravelActiveSession {...props} />;
  }
  return <SafetyActiveSession {...props} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'space-between', paddingBottom: 48 },
  cameraWrap: {
    height: CAMERA_PREVIEW_HEIGHT,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 8,
  },
  cameraPreview: { flex: 1, width: '100%' },
  flipCam: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 8,
    borderRadius: 20,
  },
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
  liveHint: { fontSize: 13, textAlign: 'center', marginTop: 10, paddingHorizontal: 8 },
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
