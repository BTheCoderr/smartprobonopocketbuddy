import { AppState } from 'react-native';
import { useSyncExternalStore } from 'react';
import type { ScenarioType } from '../types';
import type { LiveSessionMode, LiveSessionRecord } from '../types/session';
import { getCurrentLocation, formatLocationForMaps } from '../utils/location';
import {
  openSmsKidTrackModeForPhones,
  openSmsSafetyModeForPhones,
} from '../utils/sms';
import { getAlertPhoneNumbers } from '../storage/contactStorage';
import { getRecordingEnabled, getCalmGuidanceEnabled } from '../storage/settingsStorage';
import { trackEvent, trackError } from '../lib/analytics';
import { retryAsync } from '../utils/retry';
import {
  ensureLiveSession,
  startLiveSession,
  stopLiveSession,
  subscribeLiveSession,
  startSafetySessionTracking,
  startTravelSessionTracking,
  startKidTrackSessionTracking,
  type LiveSessionRuntimeState,
  type StopOptions,
} from './liveSessionRuntime';

/** Live GPS + persistence API — use these from screens; history rows use `save*SessionEvent` in feature flows, not here. */
export {
  ensureLiveSession,
  startLiveSession,
  stopLiveSession,
  subscribeLiveSession,
  startSafetySessionTracking,
  startTravelSessionTracking,
  startKidTrackSessionTracking,
};
export type { LiveSessionRuntimeState, StopOptions };

export type SessionType = 'safety' | 'travel' | 'kid_track';

export type ArrivalCheckMinutes = 15 | 30 | 60 | null;

export type SessionStartOptions = {
  arrivalCheckMinutes?: ArrivalCheckMinutes;
  recordingEnabled?: boolean;
  calmGuidanceEnabled?: boolean;
  /** Default true. Travel Mode forces false (no SMS on start). */
  sendAlerts?: boolean;
  recordingMode?: 'audio' | 'video' | 'both' | 'auto';
  /** @deprecated use sendAlerts */
  skipAlerts?: boolean;
};

export type ActiveSession = {
  id: string;
  type: SessionType;
  startedAt: number;
  arrivalCheckMinutes: ArrivalCheckMinutes;
  recordingEnabled: boolean;
  calmGuidanceEnabled: boolean;
  recordingMode: 'audio' | 'video' | 'both' | 'auto';
  sendAlerts: boolean;
  locationLink?: string;
  isActive: boolean;
  /** Mirrors `LiveSessionRuntimeState.pointCount`. */
  routePointCount: number;
  /** `liveSessionRuntime` session id (e.g. recording metadata). */
  liveSessionId?: string;
};

export type SessionSnapshot = {
  session: ActiveSession | null;
  runtime: LiveSessionRuntimeState | null;
  arrivalDeadlineAt: number | null;
  arrivalRemainingMs: number | null;
};

export type StartSessionResult = {
  locationLink: string | undefined;
  snapshot: SessionSnapshot;
};

export type SessionSnapshotListener = (snapshot: SessionSnapshot) => void;

let currentSession: ActiveSession | null = null;
let runtimeState: LiveSessionRuntimeState | null = null;
let runtimeUnsubscribe: (() => void) | null = null;
let appStateSub: { remove?: () => void } | null = null;

const listeners = new Set<SessionSnapshotListener>();

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getArrivalDeadlineAt(session: ActiveSession | null): number | null {
  if (!session?.arrivalCheckMinutes) return null;
  return session.startedAt + session.arrivalCheckMinutes * 60 * 1000;
}

function getArrivalRemainingMs(session: ActiveSession | null): number | null {
  const deadline = getArrivalDeadlineAt(session);
  if (!deadline) return null;
  return Math.max(0, deadline - Date.now());
}

function buildSnapshot(): SessionSnapshot {
  return {
    session: currentSession,
    runtime: runtimeState,
    arrivalDeadlineAt: getArrivalDeadlineAt(currentSession),
    arrivalRemainingMs: getArrivalRemainingMs(currentSession),
  };
}

/** Single cached snapshot for `useSyncExternalStore` — must keep same reference until `notify()` updates it. */
let cachedSnapshot: SessionSnapshot = buildSnapshot();

function notify(): void {
  cachedSnapshot = buildSnapshot();
  listeners.forEach((fn) => {
    try {
      fn(cachedSnapshot);
    } catch {
      // ignore
    }
  });
}

function ensureRuntimeSubscription(): void {
  if (runtimeUnsubscribe) return;

  runtimeUnsubscribe = subscribeLiveSession((state) => {
    runtimeState = state ?? null;

    if (currentSession) {
      currentSession = {
        ...currentSession,
        routePointCount: state?.pointCount ?? currentSession.routePointCount,
        liveSessionId: state?.sessionId ?? currentSession.liveSessionId,
      };
    }

    notify();
  });
}

function cleanupRuntimeSubscriptionIfIdle(): void {
  if (currentSession) return;
  if (runtimeUnsubscribe) {
    runtimeUnsubscribe();
    runtimeUnsubscribe = null;
  }
  runtimeState = null;
}

function ensureAppStateWatcher(): void {
  if (appStateSub) return;

  appStateSub = AppState.addEventListener('change', () => {
    notify();
  });
}

function cleanupAppStateWatcherIfIdle(): void {
  if (currentSession) return;
  appStateSub?.remove?.();
  appStateSub = null;
}

function liveModeForType(type: SessionType): LiveSessionMode {
  return type;
}

export function getCurrentSession(): ActiveSession | null {
  return currentSession;
}

export function getSessionSnapshot(): SessionSnapshot {
  return cachedSnapshot;
}

const EMPTY_SERVER_SNAPSHOT: SessionSnapshot = {
  session: null,
  runtime: null,
  arrivalDeadlineAt: null,
  arrivalRemainingMs: null,
};

function getServerSnapshot(): SessionSnapshot {
  return EMPTY_SERVER_SNAPSHOT;
}

/**
 * Subscribe to session + runtime snapshot updates. Invoked immediately with the current snapshot,
 * then whenever the active session, live runtime state, or app foreground state affects arrival timing.
 */
export function subscribeSession(listener: SessionSnapshotListener): () => void {
  listeners.add(listener);
  listener(cachedSnapshot);
  return () => listeners.delete(listener);
}

/** Stable subscribe for `useSyncExternalStore` (avoids new function identity every render). */
function subscribeSessionForReact(onStoreChange: () => void): () => void {
  return subscribeSession(() => onStoreChange());
}

export function useSessionSnapshot(): SessionSnapshot {
  return useSyncExternalStore(subscribeSessionForReact, getSessionSnapshot, getServerSnapshot);
}

/**
 * Home entry: resolve location, optional SMS, `ensureLiveSession`, in-memory orchestration state.
 * Does not write history — ActiveScreen ends with `saveSafetySessionEvent` / `saveTravelSessionEvent` / `saveKidTrackSessionEvent`.
 */
export async function startSession(
  type: SessionType,
  options: SessionStartOptions = {}
): Promise<StartSessionResult> {
  if (currentSession?.isActive) {
    throw new Error(`A ${currentSession.type} session is already active.`);
  }

  trackEvent('session.start_attempt', { type });

  const startedAt = Date.now();
  const id = createId(type);

  const {
    arrivalCheckMinutes = null,
    sendAlerts = true,
    recordingMode = 'auto',
    skipAlerts,
  } = options;

  const loc = await getCurrentLocation();
  const locationLink = loc ? formatLocationForMaps(loc.latitude, loc.longitude) : undefined;

  const effectiveSendAlerts =
    skipAlerts === true ? false : sendAlerts !== false && type !== 'travel';

  currentSession = {
    id,
    type,
    startedAt,
    arrivalCheckMinutes:
      type === 'travel' || type === 'kid_track' ? arrivalCheckMinutes : null,
    recordingEnabled: options.recordingEnabled ?? (await getRecordingEnabled()),
    calmGuidanceEnabled: options.calmGuidanceEnabled ?? (await getCalmGuidanceEnabled()),
    recordingMode,
    sendAlerts: effectiveSendAlerts,
    locationLink,
    isActive: true,
    routePointCount: 0,
  };

  ensureRuntimeSubscription();
  ensureAppStateWatcher();

  try {
    const liveSessionId = await retryAsync(
      () =>
        ensureLiveSession({
          mode: liveModeForType(type),
          initialLocationLink: locationLink,
          arrivalCheckMinutes:
            type === 'travel' || type === 'kid_track' ? arrivalCheckMinutes : null,
        }),
    );

    currentSession = {
      ...currentSession,
      liveSessionId,
    };
  } catch (e) {
    trackError('session.start_failed', e, { type, id });
    currentSession = null;
    cleanupRuntimeSubscriptionIfIdle();
    cleanupAppStateWatcherIfIdle();
    notify();
    throw e;
  }

  if (locationLink && effectiveSendAlerts) {
    try {
      const phones = await getAlertPhoneNumbers();
      if (phones.length > 0) {
        if (type === 'kid_track') {
          await openSmsKidTrackModeForPhones(phones, locationLink);
        } else {
          await openSmsSafetyModeForPhones(phones, locationLink);
        }
      }
    } catch (smsErr) {
      trackError('session.sms_failed', smsErr, { type, id });
    }
  }

  trackEvent('session.start_success', { type, id, hasLocation: !!locationLink });

  notify();
  return { locationLink, snapshot: getSessionSnapshot() };
}

/** Stops live tracking via `stopLiveSession`; returns the final record for callers that persist history elsewhere. */
export async function stopSession(options?: StopOptions): Promise<LiveSessionRecord | null> {
  const stoppedType = currentSession?.type;
  const rec = await stopLiveSession(options);
  currentSession = null;
  runtimeState = null;
  cleanupRuntimeSubscriptionIfIdle();
  cleanupAppStateWatcherIfIdle();
  trackEvent('session.stop', { type: stoppedType ?? null, discard: options?.discard ?? false });
  notify();
  return rec;
}

/**
 * When Active opens without a prior Home `startSession` (e.g. recovery), align in-memory session state
 * before `start*SessionTracking` / `ensureLiveSession`.
 */
export async function ensureSessionSnapshotForActiveRoute(params: {
  sessionMode?: 'safety' | 'travel' | 'kid_track';
  locationLink?: string;
  arrivalCheckMinutes?: number | null;
}): Promise<void> {
  if (currentSession) return;
  const sessionMode = params.sessionMode ?? 'safety';
  const recordingEnabled = await getRecordingEnabled();
  const calmGuidanceEnabled = await getCalmGuidanceEnabled();
  currentSession = {
    id: createId(sessionMode),
    type: sessionMode,
    startedAt: Date.now(),
    arrivalCheckMinutes:
      sessionMode === 'travel' || sessionMode === 'kid_track'
        ? ((params.arrivalCheckMinutes as ArrivalCheckMinutes) ?? null)
        : null,
    recordingEnabled,
    calmGuidanceEnabled,
    recordingMode: 'auto',
    sendAlerts: true,
    locationLink: params.locationLink,
    isActive: true,
    routePointCount: 0,
  };
  ensureRuntimeSubscription();
  ensureAppStateWatcher();
  notify();
}

export function patchSessionSnapshot(patch: Partial<ActiveSession>): void {
  if (!currentSession) return;
  currentSession = { ...currentSession, ...patch };
  notify();
}

export async function cancelActiveSession(): Promise<LiveSessionRecord | null> {
  return stopSession({ discard: true });
}

export function isSessionActive(type?: SessionType): boolean {
  if (!currentSession?.isActive) return false;
  if (!type) return true;
  return currentSession.type === type;
}

export function getCalmPrompts(type: SessionType): string[] {
  if (type === 'travel' || type === 'kid_track') {
    return ['Hands visible', 'Speak slowly', 'Ask before reaching'];
  }

  return ['Stay aware', 'Keep distance if possible', 'Call for help if needed'];
}

export function scenarioForSessionType(type: SessionType | null | undefined): ScenarioType {
  if (type === 'travel') return 'travel';
  if (type === 'kid_track') return 'kid_track';
  return 'other';
}

export function getRecordingScenarioForCurrentSession(): ScenarioType {
  return scenarioForSessionType(currentSession?.type);
}

export async function resolveRecordingEnabled(): Promise<boolean> {
  if (currentSession?.recordingEnabled !== undefined) return currentSession.recordingEnabled;
  return getRecordingEnabled();
}
